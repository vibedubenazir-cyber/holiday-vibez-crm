'use client';

import { ChangeEvent, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ApiError, getAccessToken } from '@/lib/api';
import type { UploadResponseDTO } from '@holiday-vibez/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export default function StoragePage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadResponseDTO | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploaded(null);
    setCopied(false);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/storage/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        throw new ApiError(res.status, typeof body.message === 'string' ? body.message : JSON.stringify(body.message));
      }
      setUploaded(await res.json());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function absoluteUrl(url: string) {
    return `${API_BASE.replace(/\/api$/, '')}${url}`;
  }

  async function handleCopy() {
    if (!uploaded) return;
    await navigator.clipboard.writeText(absoluteUrl(uploaded.url));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AppShell>
      <h1 className="inline-block rounded-lg bg-white px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">File Storage</h1>
      <p className="mt-1 text-sm text-blue-100">
        Upload an image or PDF to get back a URL you can paste into CMS content, package cover images, and other fields
        that accept a URL. Max 5MB.
      </p>

      <div className="mt-4 max-w-xl rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-5">
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.gif,.webp,.pdf"
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-dark"
        />
        {uploading && <p className="mt-3 text-sm text-slate-500">Uploading...</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {uploaded && (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            {/^\.(png|jpg|jpeg|gif|webp)$/i.test(uploaded.url.slice(uploaded.url.lastIndexOf('.'))) && (
              <img src={absoluteUrl(uploaded.url)} alt={uploaded.originalName} className="max-h-48 rounded-lg border border-slate-200" />
            )}
            <p className="text-sm text-slate-600">{uploaded.originalName} ({Math.ceil(uploaded.sizeBytes / 1024)} KB)</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={absoluteUrl(uploaded.url)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600"
              />
              <button
                onClick={handleCopy}
                className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand"
              >
                {copied ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
