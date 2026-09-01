'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Chrome for the family view: header, language toggle, sign out.
//
// Deliberately spare. There are no tabs, no filters, no search and no menu —
// one list and one detail page is the whole surface. Nothing destructive is
// reachable from here except removing your own access.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { FAMILY_LANG_KEY, type FamilyLang } from '@/lib/family-copy';

export function useFamilyLang(): [FamilyLang, (l: FamilyLang) => void] {
  const [lang, setLangState] = useState<FamilyLang>('hi');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAMILY_LANG_KEY);
      if (saved === 'en' || saved === 'hi') setLangState(saved);
    } catch { /* private mode — the default is fine */ }
  }, []);

  const setLang = (l: FamilyLang) => {
    setLangState(l);
    try { localStorage.setItem(FAMILY_LANG_KEY, l); } catch { /* ignore */ }
  };

  return [lang, setLang];
}

export function FamilyHeader({
  lang, onLang, left,
}: {
  lang: FamilyLang;
  onLang: (l: FamilyLang) => void;
  left?: React.ReactNode;
}) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: 'linear-gradient(150deg, #1a0c07 0%, #3d1309 100%)',
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        height: 62, padding: '0 16px', maxWidth: 640, margin: '0 auto',
      }}>
        {left}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Logo dark style={{ fontSize: '1.15rem' }} />
        </div>

        {/* Language toggle — Hinglish is the default, English is the option. */}
        <div style={{
          display: 'flex', borderRadius: 999, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.18)', flexShrink: 0,
        }}>
          {(['hi', 'en'] as FamilyLang[]).map(l => (
            <button
              key={l}
              onClick={() => onLang(l)}
              aria-pressed={lang === l}
              style={{
                minHeight: 34, padding: '0 13px', border: 'none', cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: 700,
                background: lang === l ? 'rgba(255,255,255,0.92)' : 'transparent',
                color: lang === l ? '#1a0c07' : 'rgba(255,255,255,0.65)',
              }}
            >
              {l === 'hi' ? 'Hinglish' : 'English'}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

export function FamilyPage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#f5ede0',
      // Body copy runs a step larger than the rest of the app: the reader is
      // often over 55 and on a phone in daylight.
      fontSize: '17px',
    }}>
      <div style={{
        maxWidth: 640, margin: '0 auto',
        padding: `18px 16px calc(32px + env(safe-area-inset-bottom))`,
      }}>
        {children}
      </div>
    </div>
  );
}

export function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 42, height: 42, flexShrink: 0, borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.16)',
        color: '#f3e7d3', cursor: 'pointer',
      }}
    >
      <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
        <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
