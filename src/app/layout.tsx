import type { Metadata } from 'next';
import { Playfair_Display, Cormorant_Garamond, Nunito_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from 'react-hot-toast';

const playfair = Playfair_Display({
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
});

const nunito = Nunito_Sans({
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kutumbh — कुटुम्भ',
  description: 'Your Indian arranged marriage prospect tracker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${cormorant.variable} ${nunito.variable}`}>
      <body className="min-h-screen">
        <AuthProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#241C14',
                color: '#F9F6F0',
                borderRadius: '10px',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                borderLeft: '3px solid #C4A265',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
