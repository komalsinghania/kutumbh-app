import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { LEGAL } from '@/lib/legal';

export default function LegalLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5ede0' }}>
      {/* Top bar */}
      <header style={{
        height: 60, background: 'white', borderBottom: '1px solid #ede4d4',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', position: 'sticky', top: 0, zIndex: 20,
      }}>
        <Logo className="text-lg" />
        <Link href="/" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#c13e2a', textDecoration: 'none' }}>
          ← Back to home
        </Link>
      </header>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '28px 16px 64px' }}>
        <div style={{
          background: 'white', borderRadius: 18, border: '1px solid #ede4d4',
          boxShadow: '0 4px 24px rgba(0,0,0,0.05)', padding: 'clamp(22px, 4vw, 44px)',
        }}>
          <h1 style={{
            fontFamily: 'var(--font-fraunces, Fraunces, serif)',
            fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 600, color: '#1a1410', lineHeight: 1.1,
          }}>
            {title}
          </h1>
          <p style={{ fontSize: '0.78rem', color: '#9b8e7e', marginTop: 8 }}>
            Last updated: {LEGAL.lastUpdated}
          </p>

          {intro && (
            <p style={{ fontSize: '0.95rem', color: '#4a4038', lineHeight: 1.7, marginTop: 16 }}>
              {intro}
            </p>
          )}

          <div className="legal-content" style={{ marginTop: 8 }}>
            {children}
          </div>

          {/* Cross-links */}
          <div style={{
            marginTop: 36, paddingTop: 20, borderTop: '1px solid #ede4d4',
            display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: '0.82rem',
          }}>
            <Link href="/privacy" style={{ color: '#c13e2a', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link>
            <Link href="/terms" style={{ color: '#c13e2a', textDecoration: 'none', fontWeight: 600 }}>Terms &amp; Conditions</Link>
            <Link href="/" style={{ color: '#6b5e4d', textDecoration: 'none', fontWeight: 600 }}>Home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
