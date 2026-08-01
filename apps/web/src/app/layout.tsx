import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'Holiday Vibez CRM',
  description: 'Holiday Vibez travel CRM',
  manifest: '/manifest.json',
  icons: { icon: '/logo.png', apple: '/logo.png' },
};

export const viewport: Viewport = {
  themeColor: '#005aaa',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
