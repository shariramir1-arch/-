import type { Metadata } from 'next';
import './globals.css';
import { ClientProviders } from '@/components/client-providers';

export const metadata: Metadata = {
  title: 'PainCam AI',
  description: 'Pain & Mobility Assessment Tool',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="antialiased min-h-screen">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
