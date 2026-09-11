import type { Metadata, Viewport } from 'next';
import { Exo, Roboto_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { BottomNav } from '@/components/layout/BottomNav';

const exo = Exo({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-exo',
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-roboto-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Telemetría Velero | Monitor de Cabina y Guardián de Sentina',
  description: 'Monitor náutico remoto de temperatura, humedad, sentina y batería del velero',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Telemetría Velero',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0B10',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${exo.variable} ${robotoMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground font-mono flex flex-col antialiased selection:bg-accent selection:text-black">
        <AuthProvider>
          <ThemeProvider>
            <div className="flex-1 pb-20 md:pb-0">{children}</div>
            <BottomNav />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

