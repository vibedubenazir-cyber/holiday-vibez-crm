import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Holiday Vibez CRM',
  description: 'Holiday Vibez travel CRM',
  manifest: '/manifest.json',
  icons: { icon: '/logo.png', apple: '/logo.png' },
};

export const viewport: Viewport = {
  themeColor: '#005aaa',
};

// Single fixed light theme (blue/white/black) — no dark mode toggle, no
// next-themes. The dark: Tailwind variants left in existing class strings
// are inert now (no "dark" class is ever added to <html>), harmless dead
// weight rather than something worth stripping line-by-line everywhere.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
