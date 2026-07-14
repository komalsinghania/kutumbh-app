'use client';
// ─────────────────────────────────────────────────────────────────────────────
// SiteHeader — the single shared marketing navigation bar.
//
// Used on the landing page (overHero mode) and on every static marketing page
// (/features, /how-it-works, /pricing, /blog, etc.).
//
// Behaviour:
//   • overHero=true  (landing page): starts transparent over the dark hero and
//     transitions to a solid, blurred bar once the user scrolls past 30 px.
//   • overHero=false (inner pages):  always renders as a solid, sticky bar.
//
// Auth-awareness:
//   Watches Firebase auth state and swaps the CTA button between "Sign In /
//   Start Free" (signed-out) and "Go to Dashboard" (signed-in). Uses
//   onAuthStateChanged directly (rather than useAuth) so the header stays
//   lightweight — it only needs the boolean, not the full profile.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Logo } from '@/components/Logo';
import AuthModal from '@/components/AuthModal';
import { track } from '@/lib/analytics';
import '@/app/landing.css';

const LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
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

  useEffect(() => onAuthStateChanged(auth, user => setLoggedIn(!!user)), []);

  useEffect(() => {
    if (!overHero) return;
    const handler = () => setScrolled(window.scrollY > 30);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [overHero]);

  const openAuth = (placement: string) => {
    track('cta_clicked', { placement });
    if (loggedIn) router.push('/dashboard');
    else setShowModal(true);
  };

  // Inner pages are always solid + sticky; the landing bar tracks scroll.
  const solid = !overHero || scrolled;
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
        <Link href="/" aria-label="RokaMaybe home" style={{ display: 'inline-flex' }}>
          <Logo dark={!solid} style={{ fontSize: '1.4rem' }} />
        </Link>
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
      </nav>
    </>
  );
}
