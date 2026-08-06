'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { NotificationChannel, type ConversationDTO, type LeadSummaryDTO, type MessageDTO, type TemplateDTO } from '@holiday-vibez/shared';

export default function InboxPage() {
  const [channel, setChannel] = useState<string>(NotificationChannel.WHATSAPP);
  const [leads, setLeads] = useState<LeadSummaryDTO[]>([]);
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [templates, setTemplates] = useState<TemplateDTO[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationDTO | null>(null);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [composeBody, setComposeBody] = useState('');
  const [simulateBody, setSimulateBody] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadList() {
    try {
      const [l, c, t] = await Promise.all([
        api.get<LeadSummaryDTO[]>('/leads'),
        api.get<ConversationDTO[]>(`/conversations?channel=${channel}`),
        api.get<TemplateDTO[]>('/templates'),
      ]);
      setLeads(l);
      setConversations(c);
      setTemplates(t.filter((tpl) => tpl.channel === channel));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load inbox');
    }
  }

  useEffect(() => {
    loadList();
    setSelectedLeadId(null);
    setActiveConversation(null);
    setMessages([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  function conversationForLead(leadId: string) {
    return conversations.find((c) => c.leadId === leadId);
  }

  async function openLead(leadId: string) {
    setSelectedLeadId(leadId);
    setError(null);
    try {
      const conversation = await api.post<ConversationDTO>(`/conversations/lead/${leadId}/ensure`, { channel });
      setActiveConversation(conversation);
      const msgs = await api.get<MessageDTO[]>(`/conversations/${conversation.id}/messages`);
      setMessages(msgs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to open conversation');
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!activeConversation || !composeBody.trim()) return;
    setError(null);
    try {
      await api.post(`/conversations/${activeConversation.id}/messages`, { body: composeBody });
      setComposeBody('');
      setTemplateId('');
      const msgs = await api.get<MessageDTO[]>(`/conversations/${activeConversation.id}/messages`);
      setMessages(msgs);
      await loadList();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send message');
    }
  }

  async function handleSimulateInbound(e: FormEvent) {
    e.preventDefault();
    if (!activeConversation || !simulateBody.trim()) return;
    setError(null);
    try {
      await api.post(`/conversations/${activeConversation.id}/simulate-inbound`, { body: simulateBody });
      setSimulateBody('');
      const msgs = await api.get<MessageDTO[]>(`/conversations/${activeConversation.id}/messages`);
      setMessages(msgs);
      await loadList();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to simulate inbound message');
    }
  }

  async function handleToggleBot() {
    if (!activeConversation) return;
    try {
      const updated = await api.patch<ConversationDTO>(`/conversations/${activeConversation.id}`, {
        botEnabled: !activeConversation.botEnabled,
      });
      setActiveConversation(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update bot setting');
    }
  }

  function applyTemplate(id: string) {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) setComposeBody(tpl.body);
  }

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="inline-block rounded-lg bg-brand px-4 py-2 text-xl font-bold tracking-tight text-white shadow-card">Inbox</h1>
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
          {[NotificationChannel.WHATSAPP, NotificationChannel.EMAIL].map((c) => (
            <button
              key={c}
              onClick={() => setChannel(c)}
              className={`rounded px-3 py-1 font-medium ${channel === c ? 'bg-brand text-white' : 'text-slate-600'}`}
            >
              {c === NotificationChannel.WHATSAPP ? 'WhatsApp' : 'Email'}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover lg:col-span-1">
          <div className="border-b border-slate-100 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">Conversations</div>
          <ul className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
            {leads.map((l) => {
              const conv = conversationForLead(l.id);
              const lastMsg = conv?.messages?.[0];
              return (
                <li key={l.id}>
                  <button
                    onClick={() => openLead(l.id)}
                    className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${selectedLeadId === l.id ? 'bg-brand-light' : ''}`}
                  >
                    <p className="text-sm font-medium text-slate-800">{l.clientName}</p>
                    <p className="truncate text-xs text-slate-500">{lastMsg?.body ?? 'No messages yet'}</p>
                  </button>
                </li>
              );
            })}
            {leads.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-400">No leads yet.</li>}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover lg:col-span-2">
          {!activeConversation ? (
            <div className="flex h-full items-center justify-center p-10 text-sm text-slate-400">
              Select a conversation to view messages.
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-medium text-slate-800">{selectedLead?.clientName}</p>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <input type="checkbox" checked={activeConversation.botEnabled} onChange={handleToggleBot} />
                  AI bot auto-reply
                </label>
              </div>

              <div className="max-h-96 flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        m.direction === 'OUTBOUND' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${m.direction === 'OUTBOUND' ? 'text-blue-100' : 'text-slate-400'}`}>
                        {m.sentBy === null && m.direction === 'OUTBOUND' ? 'Bot · ' : ''}
                        {new Date(m.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && <p className="text-center text-sm text-slate-400">No messages yet.</p>}
              </div>

              <form onSubmit={handleSend} className="border-t border-slate-100 p-3">
                {templates.length > 0 && (
                  <select
                    value={templateId}
                    onChange={(e) => applyTemplate(e.target.value)}
                    className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                  >
                    <option value="">Use a template...</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
                <div className="flex gap-2">
                  <textarea
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Type a message..."
                    rows={2}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                  />
                  <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                    Send
                  </button>
                </div>
              </form>

              <form onSubmit={handleSimulateInbound} className="border-t border-slate-100 bg-slate-50 p-3">
                <p className="mb-1 text-xs font-medium text-slate-500">
                  Simulate customer reply (dev tool — stands in for a real WhatsApp/email webhook)
                </p>
                <div className="flex gap-2">
                  <input
                    value={simulateBody}
                    onChange={(e) => setSimulateBody(e.target.value)}
                    placeholder="e.g. What's the price for Bali?"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                  />
                  <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand">
                    Simulate
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
