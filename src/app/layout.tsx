// ─────────────────────────────────────────────────────────────────────────────
// Root layout — wraps every page in the app.
//
// Responsibilities:
//   • Load all three brand typefaces via next/font (zero layout shift).
//   • Expose CSS custom properties for the fonts (--font-fraunces, etc.).
//   • Wrap the tree with AuthProvider so any component can call useAuth().
//   • Mount global singletons: toast, cookie-consent banner, analytics, and
//     Vercel Analytics / Speed Insights (edge-friendly, no cookies).
//   • Set the default site-wide <title> and Open Graph metadata.
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import { Fraunces, Instrument_Serif, DM_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from 'react-hot-toast';
import CookieConsent from '@/components/CookieConsent';
import AnalyticsProvider from '@/components/AnalyticsProvider';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

// ── Brand typefaces ───────────────────────────────────────────────────────────
// Fraunces: display serif used for headings and the logotype.
const fraunces = Fraunces({
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

// Instrument Serif: editorial italic for pull-quotes and decorative body text.
const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
});

// DM Sans: clean geometric sans for UI labels, body copy, and form text.
const dmSans = DM_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://rokamaybe.com'),
  // Default title — individual pages override this via their own `export const metadata`.
  title: 'RokaMaybe — Your Arranged Marriage Tracker',
  description: 'The calm, private dashboard for your rishta search. Track every prospect, kundli, and conversation in one place.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'RokaMaybe — Your Arranged Marriage Tracker',
    description: 'The calm, private dashboard for your rishta search. Track every prospect, kundli, and conversation in one place.',
    url: 'https://rokamaybe.com',
    siteName: 'RokaMaybe',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    // Text falls back to og:title / og:description, so each page stays specific.
    card: 'summary_large_image',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Font CSS variables are applied at the <html> level so every child can
    // reference them via var(--font-fraunces) etc. without extra providers.
    <html lang="en" className={`${fraunces.variable} ${instrumentSerif.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>
        {/* AuthProvider supplies useAuth() context to every client component. */}
        <AuthProvider>
          {children}
          {/* Boots PostHog analytics after cookie consent. Renders nothing. */}
          <AnalyticsProvider />
          {/* GDPR/DPDP-compliant cookie consent banner — shown once per browser. */}
          <CookieConsent />
          {/* Global toast notifications — success uses green, errors use sindoor red. */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fffdf8',
                color: '#1a1410',
                borderRadius: '12px',
                border: '1px solid #e8dece',
                borderLeft: '3px solid #c13e2a',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                fontWeight: 500,
                padding: '10px 14px',
                boxShadow: '0 8px 28px rgba(26,20,16,0.12)',
              },
              success: {
                iconTheme: { primary: '#2D6B4F', secondary: '#fffdf8' },
                style: { borderLeft: '3px solid #2D6B4F' },
              },
              error: {
                iconTheme: { primary: '#c13e2a', secondary: '#fffdf8' },
                style: { borderLeft: '3px solid #c13e2a' },
              },
            }}
          />
          {/* Vercel edge analytics — cookieless, no GDPR impact. */}
          <Analytics />
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}
