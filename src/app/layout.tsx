import type { Metadata } from 'next';
import { Fraunces, Instrument_Serif, DM_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from 'react-hot-toast';

const fraunces = Fraunces({
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
});

const dmSans = DM_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RokaMaybe — Your Arranged Marriage Companion',
  description: 'Track prospects, match kundli, log conversations, compare candidates.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${instrumentSerif.variable} ${dmSans.variable}`}>
      <body className="min-h-screen">
        <AuthProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1a1410',
                color: '#f5ede0',
                borderRadius: '10px',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                borderLeft: '3px solid #c13e2a',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
