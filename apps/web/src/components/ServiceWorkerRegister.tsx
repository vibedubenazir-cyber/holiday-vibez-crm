'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Installability is a nice-to-have in dev; don't surface registration failures to the user.
      });
    }
  }, []);
  return null;
}
