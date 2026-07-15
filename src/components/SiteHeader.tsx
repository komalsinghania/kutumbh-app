'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Logo } from '@/components/Logo';
import AuthModal from '@/components/AuthModal';
import { track } from '@/lib/analytics';
import { PAYMENTS_ENABLED } from '@/lib/config';
import '@/app/landing.css';

// Pricing is hidden from the nav while payments are disabled (early access) —
// it reappears automatically when PAYMENTS_ENABLED is flipped back on.
const LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How it works' },
  ...(PAYMENTS_ENABLED ? [{ href: '/pricing', label: 'Pricing' }] : []),
  { href: '/mummy-mode', label: 'Mummy Mode' },
  { href: '/blog', label: 'Blog' },
];

/**
 * The single site-wide marketing header. Rendered identically on the landing
 * page and every marketing/blog page so the whole site shares one navbar.
 *
 * - `overHero`: landing-page mode — transparent over the dark hero, turning
 *   solid on scroll. Omit it on inner pages, which render a solid, sticky bar.
 */
export default function SiteHeader({ overHero = false }: { overHero?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => onAuthStateChanged(auth, user => setLoggedIn(!!user)), []);

  useEffect(() => {
    if (!overHero) return;
    const handler = () => setScrolled(window.scrollY > 30);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [overHero]);

  // Every menu link / button already closes the menu on click, so navigation
  // never leaves it open. (Avoid a pathname effect here — calling setState
  // synchronously in an effect triggers cascading renders.)

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  const openAuth = (placement: string) => {
    track('cta_clicked', { placement });
    setMenuOpen(false);
    if (loggedIn) router.push('/dashboard');
    else setShowModal(true);
  };

  // Inner pages are always solid + sticky; the landing bar tracks scroll.
  // Also go solid while the mobile menu is open so the bar (logo + close
  // button) reads as dark-on-cream, matching the full-screen menu behind it.
  const solid = !overHero || scrolled || menuOpen;
  const navClass = [
    'lp-nav',
    solid ? 'lp-nav-scrolled' : '',
    overHero ? '' : 'lp-nav-doc',
  ].filter(Boolean).join(' ');

  return (
    <>
      {showModal && (
        <AuthModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); router.push('/dashboard'); }}
        />
      )}

      <nav className={navClass} aria-label="Main navigation">
        {/* Logo is itself a link to "/" — no wrapping anchor (would nest <a> in <a>). */}
        <Logo dark={!solid} style={{ fontSize: '1.4rem' }} />

        {/* Desktop links + auth */}
        <div className="lp-nav-links">
          {LINKS.map(l => (
            <Link
              key={l.href}
              className={`lp-nav-link ${pathname === l.href ? 'lp-nav-link-active' : ''}`}
              href={l.href}
            >
              {l.label}
            </Link>
          ))}
          {loggedIn ? (
            <button className="lp-btn-nav" onClick={() => router.push('/dashboard')}>Go to Dashboard</button>
          ) : (
            <>
              <button className="lp-btn-signin" onClick={() => openAuth('nav_signin')}>Sign In</button>
              <button className="lp-btn-nav" onClick={() => openAuth('nav')}>Start Free</button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className={`lp-nav-burger ${menuOpen ? 'lp-nav-burger-open' : ''}`}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* Mobile full-screen menu */}
      {menuOpen && (
        <div className="lp-nav-mobile" role="menu" aria-label="Mobile navigation">
            {LINKS.map(l => (
              <Link
                key={l.href}
                role="menuitem"
                className={`lp-nav-mobile-link ${pathname === l.href ? 'lp-nav-mobile-link-active' : ''}`}
                href={l.href}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="lp-nav-mobile-actions">
              {loggedIn ? (
                <button className="lp-btn-nav" onClick={() => { setMenuOpen(false); router.push('/dashboard'); }}>Go to Dashboard</button>
              ) : (
                <>
                  <button className="lp-btn-signin lp-nav-mobile-signin" onClick={() => openAuth('nav_signin')}>Sign In</button>
                  <button className="lp-btn-nav" onClick={() => openAuth('nav')}>Start Free</button>
                </>
              )}
            </div>
        </div>
      )}
    </>
  );
}
