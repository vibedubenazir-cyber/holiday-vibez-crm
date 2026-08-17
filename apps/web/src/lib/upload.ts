import { ApiError, getAccessToken } from './api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

// Local-disk storage fallback returns a relative "/uploads/..." path (see
// storage.controller.ts) that only resolves against the API origin — resolve
// it to an absolute URL up front so it also works when rendered on the
// unauthenticated public itinerary report page and inside PDF generation,
// neither of which have API_BASE in scope.
export function absoluteUploadUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE.replace(/\/api$/, '')}${url}`;
}

export async function uploadFile(file: File): Promise<string> {
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
  const data = await res.json();
  return absoluteUploadUrl(data.url);
}
