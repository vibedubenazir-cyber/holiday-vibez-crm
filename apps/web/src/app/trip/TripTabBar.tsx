'use client';

/**
 * Bottom tab bar, the way a native app does it.
 *
 * A traveller uses this one-handed, often while carrying a bag — so the
 * controls belong in the thumb arc at the bottom of the screen, not at the top
 * where reaching them means shifting grip on the phone. Icons carry the
 * recognition, labels remove the guesswork, and each target is a full 56px
 * tall so it's hittable without looking.
 */

export type TabId = 'itinerary' | 'alerts' | 'hotels' | 'transfers' | 'essentials';

function Icon({ path, active }: { path: string; active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const TABS: { id: TabId; label: string; path: string }[] = [
  {
    id: 'itinerary',
    label: 'Itinerary',
    path: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  },
  {
    id: 'alerts',
    label: 'Alerts',
    path: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  },
  {
    id: 'hotels',
    label: 'Hotels',
    path: 'M2 17h20M3 17v3M21 17v3M4 17v-5a2 2 0 012-2h12a2 2 0 012 2v5M7 10V8a2 2 0 012-2h2a2 2 0 012 2v2',
  },
  {
    id: 'transfers',
    label: 'Transfers',
    path: 'M3 12l1.5-4.5A2 2 0 016.4 6h11.2a2 2 0 011.9 1.4L21 12M3 12h18M4 12v5h3m10 0h3v-5M7.5 15h.01M16.5 15h.01',
  },
  {
    id: 'essentials',
    label: 'Essentials',
    path: 'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.5-1.2a2 2 0 012.1-.4c.8.3 1.7.5 2.6.6a2 2 0 011.7 2z',
  },
];

export function TripTabBar({ tab, onChange }: { tab: TabId; onChange: (id: TabId) => void }) {
  return (
    <nav
      // The padding rides on env(safe-area-inset-bottom) so the labels clear
      // the iPhone home indicator instead of sitting under it.
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-lg border-t border-slate-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Trip sections"
    >
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 transition ${
              active ? 'text-brand-700' : 'text-slate-400'
            }`}
          >
            <Icon path={t.path} active={active} />
            <span className={`text-[10px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
