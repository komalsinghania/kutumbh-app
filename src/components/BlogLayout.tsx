import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

/**
 * Shared chrome for the blog index and individual posts. Uses the site-wide
 * SiteHeader so the blog shares one navbar with the rest of the marketing site.
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
      <SiteHeader />
      <main style={{ maxWidth, margin: '0 auto', padding: '28px 16px 64px' }}>{children}</main>
      <SiteFooter />
    </div>
  );
}
