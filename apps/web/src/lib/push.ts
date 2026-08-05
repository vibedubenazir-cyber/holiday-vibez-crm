import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { api } from './api';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function isPushConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId && vapidKey,
  );
}

export type PushPermissionResult = 'not-configured' | 'unsupported' | 'denied' | 'enabled' | 'error';

// Requests browser push permission and registers the resulting FCM token with
// the backend. Reuses the existing service worker registration from
// ServiceWorkerRegister.tsx (/sw.js) rather than registering a second,
// competing one — sw.js itself carries the Firebase Messaging background
// handler (see apps/web/public/sw.js).
export async function requestPushPermission(): Promise<PushPermissionResult> {
  if (!isPushConfigured()) return 'not-configured';
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';

  try {
    if (!(await isSupported())) return 'unsupported';

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return 'error';

    await api.post('/notifications/push-token', { token });
    return 'enabled';
  } catch {
    return 'error';
  }
}
