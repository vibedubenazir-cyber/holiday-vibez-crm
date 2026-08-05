import * as crypto from 'crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

// Signs a Google service-account JWT (RS256) and exchanges it for a short-lived
// OAuth2 access token — FCM's HTTP v1 API has no simpler "just a key" auth mode
// (the Legacy HTTP API that did was shut down by Google in mid-2024). Cached in
// memory until near-expiry so a burst of pushes doesn't re-authenticate each time.
export async function getFcmAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const clientEmail = process.env.FCM_CLIENT_EMAIL!;
  const privateKey = process.env.FCM_PRIVATE_KEY!.replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(privateKey);
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`FCM token exchange failed (${res.status}): ${text}`);
  }

  const body = await res.json();
  cachedToken = { accessToken: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return cachedToken.accessToken;
}
