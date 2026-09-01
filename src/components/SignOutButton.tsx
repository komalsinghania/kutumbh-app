'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { track } from '@/lib/analytics';
import toast from 'react-hot-toast';

/**
 * Signs the user out and sends them back to the landing page.
 *
 * PostHog is reset by AnalyticsProvider as soon as `user` clears, so there's
 * nothing to tear down here beyond the Firebase session itself.
 */
export function useSignOut() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const runSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      track('signed_out');
      await signOut(auth);
      router.replace('/');
      toast.success('Signed out');
    } catch {
      toast.error('Could not sign out. Please try again.');
      setSigningOut(false);
    }
  };

  return { runSignOut, signingOut };
}

/* Exit-door glyph, shared by every variant that shows an icon. */
const EXIT_PATH = 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z';

/**
 * Variants match the surfaces the button sits on:
 *  - `sidebar`  dashboard desktop sidebar footer (dark)
 *  - `menu`     dashboard mobile hamburger panel (dark)
 *  - `card`     light cream page card, e.g. the Profile tab (light)
 *  - `nav`      marketing header, inline with the other nav buttons
 *  - `nav-mobile` marketing header's full-screen mobile menu
 */
type Variant = 'sidebar' | 'menu' | 'card' | 'nav' | 'nav-mobile';

export default function SignOutButton({ variant = 'card' }: { variant?: Variant }) {
  const { runSignOut, signingOut } = useSignOut();
  const label = signingOut ? 'Signing out…' : 'Sign Out';

  if (variant === 'nav' || variant === 'nav-mobile') {
    return (
      <button
        type="button"
        onClick={runSignOut}
        disabled={signingOut}
        className={variant === 'nav' ? 'lp-btn-signin' : 'lp-btn-signin lp-nav-mobile-signin'}
      >
        {label}
      </button>
    );
  }

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={runSignOut}
        disabled={signingOut}
        className="w-full"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'white', borderRadius: 14, padding: '16px 20px',
          border: '1px solid #ede4d4', cursor: signingOut ? 'wait' : 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)', opacity: signingOut ? 0.6 : 1,
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: 'rgba(139,42,42,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#8B2A2A"><path d={EXIT_PATH} /></svg>
          </div>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#8B2A2A' }}>{label}</span>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#8B2A2A"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" /></svg>
      </button>
    );
  }

  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={runSignOut}
        disabled={signingOut}
        className="w-full"
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 12px', borderRadius: 9,
          color: '#e8a898', fontSize: '0.9rem', fontWeight: 600,
          cursor: signingOut ? 'wait' : 'pointer', textAlign: 'left',
          opacity: signingOut ? 0.6 : 1,
        }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={EXIT_PATH} /></svg>
        <span>{label}</span>
      </button>
    );
  }

  // sidebar
  return (
    <button
      type="button"
      onClick={runSignOut}
      disabled={signingOut}
      className="w-full"
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '9px 14px', borderRadius: 10,
        cursor: signingOut ? 'wait' : 'pointer',
        color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem',
        transition: 'color 0.15s ease',
      }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d={EXIT_PATH} /></svg>
      <span>{label}</span>
    </button>
  );
}
