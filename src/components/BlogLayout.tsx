import Link from 'next/link';
import { Logo } from '@/components/Logo';

/**
 * Shared chrome for the blog index and individual posts — same top bar and
 * paper background as LegalLayout, so the two feel like one site. Pages supply
 * their own content (a card list on the index, an article card on a post).
 */
export default function BlogLayout({
  children,
  maxWidth = 820,
}: {
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5ede0' }}>
      {/* Top bar */}
      <header
        style={{
          height: 60,
          background: 'white',
          borderBottom: '1px solid #ede4d4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <Logo className="text-lg" />
        <Link
          href="/"
          style={{ fontSize: '0.82rem', fontWeight: 600, color: '#c13e2a', textDecoration: 'none' }}
        >
          ← Back to home
        </Link>
      </header>

      <main style={{ maxWidth, margin: '0 auto', padding: '28px 16px 64px' }}>{children}</main>
    </div>
  );
}
