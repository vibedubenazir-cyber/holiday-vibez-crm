'use client';

import { useEffect, useState } from 'react';

/**
 * Prompts the traveller to install /trip to their home screen.
 *
 * This is the step that makes everything else work: an installed app keeps its
 * cached trip, its saved sign-in and its icon, so it opens with no signal at
 * an airport. A browser tab the traveller closes before flying takes all of
 * that with it. So the prompt leads the screen rather than sitting at the
 * bottom, and it survives until they either install or dismiss it.
 */

const DISMISSED_KEY = 'hv_trip_install_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari predates the display-mode media query for this and reports it
    // on navigator instead.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed — nothing to ask for
    if (window.localStorage.getItem(DISMISSED_KEY)) return;

    // iOS Safari never fires beforeinstallprompt and has no programmatic
    // install, so it gets the manual Share-sheet instructions instead of a
    // button that could not work.
    if (isIos()) {
      setIos(true);
      setVisible(true);
      return;
    }

    function onBeforeInstall(event: Event) {
      event.preventDefault(); // stop Chrome's own mini-infobar; we show our own
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function onInstalled() {
      setVisible(false);
      window.localStorage.setItem(DISMISSED_KEY, '1');
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!visible) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') window.localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  return (
    <div className="border-b border-brand-200 bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-3 text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">Save this trip to your phone</p>
          <p className="mt-0.5 text-xs text-blue-100">
            Opens instantly with no internet — your hotels, drivers and emergency numbers work
            anywhere.
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mt-1 shrink-0 px-1 text-lg leading-none text-blue-200"
        >
          ×
        </button>
      </div>

      {ios ? (
        <p className="mt-2 rounded-lg bg-white/15 px-3 py-2 text-xs">
          Tap <span className="font-semibold">Share</span> at the bottom of Safari, then{' '}
          <span className="font-semibold">Add to Home Screen</span>.
        </p>
      ) : (
        <button
          onClick={() => void install()}
          className="mt-2 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700"
        >
          Add to home screen
        </button>
      )}
    </div>
  );
}
