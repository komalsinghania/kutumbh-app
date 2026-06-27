'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'rm_cookie_consent'; // 'all' | 'necessary'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      /* localStorage unavailable (private mode) — show banner anyway */
      setVisible(true);
    }
  }, []);

  const choose = (value: 'all' | 'necessary') => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
      localStorage.setItem(`${STORAGE_KEY}_at`, new Date().toISOString());
    } catch { /* ignore */ }
    // Let the analytics provider react immediately (esp. on "Accept all").
    try { window.dispatchEvent(new Event('rm-consent-changed')); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      style={{
        position: 'fixed', zIndex: 1000, left: 16, right: 16,
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        maxWidth: 520, margin: '0 auto',
        background: '#fffdf8', border: '1px solid #e8dece',
        borderRadius: 16, boxShadow: '0 12px 40px rgba(26,20,16,0.22)',
        padding: '16px 18px',
      }}
    >
      <div style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1rem', fontWeight: 600, color: '#1a1410', marginBottom: 4 }}>
        We value your privacy
      </div>
      <p style={{ fontSize: '0.82rem', color: '#6b5e4d', lineHeight: 1.55 }}>
        We use strictly necessary cookies to keep you signed in. We don’t use advertising cookies. See our{' '}
        <Link href="/privacy" style={{ color: '#c13e2a', textDecoration: 'underline' }}>Privacy Policy</Link>.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => choose('all')}
          style={{
            flex: 1, minWidth: 130, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #d44d36 0%, #b83521 100%)', color: '#fff',
            fontSize: '0.82rem', fontWeight: 700,
          }}
        >
          Accept all
        </button>
        <button
          onClick={() => choose('necessary')}
          style={{
            flex: 1, minWidth: 130, padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
            background: 'white', color: '#6b5e4d', border: '1px solid #d6c9b0',
            fontSize: '0.82rem', fontWeight: 700,
          }}
        >
          Necessary only
        </button>
      </div>
    </div>
  );
}
