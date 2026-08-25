'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError, getAccessToken } from '@/lib/api';
import { PresenceDot } from './PresenceDot';
import type { TeamChannelDTO, TeamMessageDTO, UserDTO, PresenceDTO } from '@holiday-vibez/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const TYPE_LABELS: Record<string, string> = {
  ORG_WIDE: 'Company-wide',
  BRANCH: 'Branch',
  GROUP: 'Group',
  DIRECT: 'Direct message',
};

function channelDisplayName(channel: TeamChannelDTO, meId?: string) {
  if (channel.type === 'DIRECT' && channel.members) {
    const other = channel.members.find((m) => m.userId !== meId);
    if (other?.user) return other.user.name;
  }
  return channel.name;
}

function absoluteUrl(url: string) {
  return url.startsWith('http') ? url : `${API_BASE.replace(/\/api$/, '')}${url}`;
}

export function TeamChatPanel({ compact = false }: { compact?: boolean }) {
  const { user: me } = useAuth();

  const [tab, setTab] = useState<'channels' | 'people'>('channels');
  const [channels, setChannels] = useState<TeamChannelDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamMessageDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const [presence, setPresence] = useState<PresenceDTO[]>([]);
  const [myStatus, setMyStatus] = useState<'AVAILABLE' | 'BUSY'>('AVAILABLE');

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [groupName, setGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadChannels() {
    try {
      const list = await api.get<TeamChannelDTO[]>('/team-chat/channels');
      setChannels(list);
      setSelectedId((prev) => prev ?? (list.length > 0 ? list[0].id : null));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load channels');
    }
  }

  async function loadMessages(channelId: string) {
    try {
      setMessages(await api.get<TeamMessageDTO[]>(`/team-chat/channels/${channelId}/messages`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load messages');
    }
  }

  async function loadPresence() {
    try {
      const list = await api.get<PresenceDTO[]>('/team-chat/presence');
      setPresence(list);
      const mine = list.find((p) => p.userId === me?.id);
      if (mine) setMyStatus(mine.status === 'BUSY' ? 'BUSY' : 'AVAILABLE');
    } catch {
      // non-fatal — presence is a nice-to-have, chat still works without it
    }
  }

  useEffect(() => {
    loadChannels();
    loadPresence();
    const presenceInterval = setInterval(loadPresence, 15000);
    return () => clearInterval(presenceInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role]);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);
    const interval = setInterval(() => loadMessages(selectedId), 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!selectedId || !text.trim()) return;
    setSending(true);
    try {
      await api.post(`/team-chat/channels/${selectedId}/messages`, { body: text.trim() });
      setText('');
      await loadMessages(selectedId);
      await loadChannels();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/team-chat/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        throw new ApiError(res.status, typeof body.message === 'string' ? body.message : JSON.stringify(body.message));
      }
      const uploaded = await res.json();
      await api.post(`/team-chat/channels/${selectedId}/messages`, {
        fileUrl: uploaded.url,
        fileName: uploaded.originalName,
        fileSize: uploaded.sizeBytes,
      });
      await loadMessages(selectedId);
      await loadChannels();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'File upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function openNewGroup() {
    setShowNewGroup(true);
    setGroupName('');
    setSelectedMemberIds([]);
    if (users.length === 0) {
      try {
        setUsers(await api.get<UserDTO[]>('/users'));
      } catch {
        // non-fatal — member list just won't populate
      }
    }
  }

  async function handleCreateGroup() {
    if (!groupName.trim() || selectedMemberIds.length === 0) return;
    try {
      const channel = await api.post<TeamChannelDTO>('/team-chat/channels/group', {
        name: groupName.trim(),
        memberIds: selectedMemberIds,
      });
      setShowNewGroup(false);
      await loadChannels();
      setSelectedId(channel.id);
      setTab('channels');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create group');
    }
  }

  async function handleOpenDirect(userId: string) {
    try {
      const channel = await api.post<TeamChannelDTO>('/team-chat/channels/direct', { userId });
      await loadChannels();
      setSelectedId(channel.id);
      setTab('channels');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to open direct message');
    }
  }

  async function handleToggleMyStatus() {
    const next = myStatus === 'AVAILABLE' ? 'BUSY' : 'AVAILABLE';
    setMyStatus(next);
    try {
      await api.post('/team-chat/presence/status', { status: next });
      await loadPresence();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status');
    }
  }

  function toggleMember(id: string) {
    setSelectedMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  const selectedChannel = channels.find((c) => c.id === selectedId);
  const isImage = (name: string) => /\.(png|jpe?g|gif|webp)$/i.test(name);
  const presenceByUserId = new Map(presence.map((p) => [p.userId, p.status]));
  const sidebarWidth = compact ? 'w-32' : 'w-full sm:w-64';

  return (
    <div className={`flex ${compact ? 'h-full' : 'flex-col sm:flex-row'} gap-2`} style={compact ? undefined : { height: '65vh' }}>
      <div className={`${sidebarWidth} shrink-0 ${compact ? '' : 'max-h-48 sm:max-h-none'} overflow-y-auto rounded-xl bg-white shadow-card dark:bg-slate-800`}>
        <div className="flex border-b border-slate-100 dark:border-slate-700">
          <button
            onClick={() => setTab('channels')}
            className={`flex-1 px-1 py-2 text-[10px] font-semibold uppercase tracking-tight ${tab === 'channels' ? 'text-brand' : 'text-slate-400'}`}
          >
            Chats
          </button>
          <button
            onClick={() => setTab('people')}
            className={`flex-1 px-2 py-2 text-xs font-semibold uppercase tracking-wide ${tab === 'people' ? 'text-brand' : 'text-slate-400'}`}
          >
            People
          </button>
        </div>

        {tab === 'channels' ? (
          <>
            {!compact && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-slate-400">Channels</span>
                <button onClick={openNewGroup} className="text-xs font-medium text-brand hover:underline">+ New group</button>
              </div>
            )}
            {compact && (
              <button onClick={openNewGroup} className="w-full px-2 py-1.5 text-center text-xs font-medium text-brand hover:underline">+ New</button>
            )}
            <ul>
              {channels.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedId(c.id)}
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-white dark:hover:bg-slate-700 ${
                      selectedId === c.id ? 'bg-white dark:bg-slate-700' : ''
                    }`}
                  >
                    <span className="truncate font-medium text-slate-800 dark:text-slate-100">{channelDisplayName(c, me?.id)}</span>
                    {!compact && <span className="text-xs text-slate-400">{TYPE_LABELS[c.type] ?? c.type}</span>}
                  </button>
                </li>
              ))}
              {channels.length === 0 && <li className="px-3 py-4 text-xs text-slate-400">No channels yet.</li>}
            </ul>
          </>
        ) : (
          <ul>
            {presence.map((p) => {
              const isMe = p.userId === me?.id;
              return (
                <li key={p.userId}>
                  <button
                    onClick={() => !isMe && handleOpenDirect(p.userId)}
                    disabled={isMe}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${isMe ? '' : 'hover:bg-white dark:hover:bg-slate-700'}`}
                    title={isMe ? undefined : `Message ${p.name}`}
                  >
                    <PresenceDot status={p.status} />
                    <span className="truncate text-slate-700 dark:text-slate-200">{p.name}{isMe ? ' (you)' : ''}</span>
                  </button>
                </li>
              );
            })}
            {presence.length === 0 && <li className="px-3 py-4 text-xs text-slate-400">Loading…</li>}
            {me && (
              <li className="border-t border-slate-100 px-3 py-2 dark:border-slate-700">
                <button onClick={handleToggleMyStatus} className="text-xs font-medium text-brand hover:underline">
                  {myStatus === 'AVAILABLE' ? 'Set myself as Busy' : 'Set myself as Available'}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-card dark:bg-slate-800">
        {error && <p className="px-3 pt-2 text-xs text-red-600">{error}</p>}
        {selectedChannel ? (
          <>
            <div className="border-b border-slate-100 p-2.5 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{channelDisplayName(selectedChannel, me?.id)}</p>
              {!compact && <p className="text-xs text-slate-400">{TYPE_LABELS[selectedChannel.type] ?? selectedChannel.type}</p>}
            </div>
            <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
              {messages.map((m) => {
                const mine = m.senderId === me?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm ${mine ? 'bg-brand text-white' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100'}`}>
                      {!mine && <p className="text-xs font-semibold opacity-70">{m.sender?.name}</p>}
                      {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                      {m.fileUrl && (
                        <div className="mt-1">
                          {isImage(m.fileName ?? '') ? (
                            <a href={absoluteUrl(m.fileUrl)} target="_blank" rel="noreferrer">
                              <img src={absoluteUrl(m.fileUrl)} alt={m.fileName ?? 'attachment'} className="max-h-32 rounded-lg" />
                            </a>
                          ) : (
                            <a href={absoluteUrl(m.fileUrl)} target="_blank" rel="noreferrer" className={`underline ${mine ? 'text-white' : 'text-brand'}`}>
                              📎 {m.fileName ?? 'Attachment'}
                            </a>
                          )}
                        </div>
                      )}
                      <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && <p className="text-sm text-slate-400">No messages yet — say hello.</p>}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex items-center gap-1.5 border-t border-slate-100 p-2 dark:border-slate-700">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-600 hover:border-brand-200 hover:bg-white dark:hover:bg-slate-800 hover:text-brand disabled:opacity-60 dark:border-slate-600 dark:text-slate-300"
                title="Attach a file"
              >
                {uploading ? '…' : '📎'}
              </button>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                placeholder="Message…"
                className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              <button
                onClick={handleSend}
                disabled={sending || !text.trim()}
                className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Select a channel to start chatting.</div>
        )}
      </div>

      {showNewGroup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-card dark:bg-slate-800">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">New group channel</h2>
            <input
              type="text"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Members</p>
            <div className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
              {users.filter((u) => u.id !== me?.id).map((u) => (
                <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                  <input type="checkbox" checked={selectedMemberIds.includes(u.id)} onChange={() => toggleMember(u.id)} />
                  <PresenceDot status={presenceByUserId.get(u.id) ?? 'OFFLINE'} />
                  <span className="text-slate-700 dark:text-slate-200">{u.name}</span>
                  <span className="text-xs text-slate-400">{u.role}</span>
                </label>
              ))}
              {users.length === 0 && <p className="px-3 py-4 text-sm text-slate-400">Loading users…</p>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowNewGroup(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">Cancel</button>
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedMemberIds.length === 0}
                className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
