'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import '@/app/landing.css';

/**
 * The single site-wide marketing footer. Rendered identically on the landing
 * page and every marketing/blog page so the whole site shares one footer.
 *
 * Previously the landing page carried this rich footer inline while the other
 * marketing pages (features / how-it-works / pricing / mummy-mode / about)
 * shipped a stripped-down "the app for the maybe years" footer. This component
 * unifies them.
 */
export default function SiteFooter() {
  return (
    <footer className="lp-footer">
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 40, marginBottom: 44,
        }}>
          <div>
            <Logo dark style={{ fontSize: '1.5rem', display: 'block', marginBottom: 10 }} />
            <p style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: 14, color: 'rgba(245,237,224,0.6)', lineHeight: 1.6, marginBottom: 14,
            }}>
              Your rishta search, organized.
            </p>
            <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 13, color: '#f5ede0', fontWeight: 600, marginBottom: 4 }}>
              Built by Komal Singhania
            </p>
            <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 12, color: 'rgba(245,237,224,0.45)' }}>
              Founder
            </p>
          </div>

          {[
            { title: 'Product', links: [
              { label: 'Features', href: '/features' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'How it works', href: '/how-it-works' },
              { label: 'Blog', href: '/blog' },
              { label: 'About', href: '/about' },
              { label: 'Mummy Mode', href: '/mummy-mode' },
            ] },
            { title: 'Legal', links: [
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms', href: '/terms' },
              { label: 'Data policy', href: '/privacy#data' },
            ] },
          ].map((group) => (
            <div key={group.title}>
              <div style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
                color: '#e8c870', marginBottom: 14, textTransform: 'uppercase',
              }}>
                {group.title}
              </div>
              {group.links.map(link => (
                <div key={link.label} style={{ marginBottom: 10 }}>
                  <Link
                    href={link.href}
                    style={{
                      fontFamily: 'var(--font-dm-sans, sans-serif)',
                      fontSize: 14, color: 'rgba(245,237,224,0.75)', textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(245,237,224,0.75)'; }}
                  >
                    {link.label}
                  </Link>
                </div>
              ))}
            </div>
          ))}

          <div>
            <div style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
              color: '#e8c870', marginBottom: 14, textTransform: 'uppercase',
            }}>
              Connect
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'Instagram', href: 'https://instagram.com/rokamaybe', svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg> },
                { label: 'LinkedIn', href: 'https://www.linkedin.com/company/rokamaybe/', svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7"/><circle cx="8" cy="7" r="1" fill="currentColor"/><path d="M12 17v-4a2.5 2.5 0 0 1 5 0v4"/><path d="M12 10v7"/></svg> },
              ].map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    border: '1px solid rgba(245,237,224,0.25)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(245,237,224,0.8)', transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#e8c870'; e.currentTarget.style.color = '#1a1410'; e.currentTarget.style.borderColor = '#e8c870'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(245,237,224,0.8)'; e.currentTarget.style.borderColor = 'rgba(245,237,224,0.25)'; }}
                >
                  {s.svg}
                </a>
              ))}
            </div>
            <a
              href="mailto:namaste@rokamaybe.com"
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: 13, color: 'rgba(245,237,224,0.75)', textDecoration: 'none', wordBreak: 'break-all',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(245,237,224,0.75)'; }}
            >
              namaste@rokamaybe.com
            </a>
          </div>
        </div>
        <div style={{
          borderTop: '1px solid rgba(245,237,224,0.12)',
          paddingTop: 22,
          display: 'flex', flexWrap: 'wrap',
          justifyContent: 'space-between', gap: 8,
        }}>
          <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 13, color: 'rgba(245,237,224,0.4)' }}>
            Made with ❤️ in India · Built by Komal Singhania
          </p>
          <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 13, color: 'rgba(245,237,224,0.4)' }}>
            © 2026 RokaMaybe. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
