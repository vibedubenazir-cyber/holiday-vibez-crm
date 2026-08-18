import type { Metadata } from 'next';

// The traveller app installs as its own home-screen app, separate from the
// staff CRM: different name, different icon target, and a start_url/scope of
// /trip so launching it goes straight to the trip rather than the CRM login.
export const metadata: Metadata = {
  title: 'My Trip — Holiday Vibez',
  description: 'Your itinerary, hotels, drivers and emergency contacts',
  manifest: '/trip-manifest.json',
};

export default function TripLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
