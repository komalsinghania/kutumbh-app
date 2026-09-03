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
  lang, onLang, left, wide = false,
}: {
  lang: FamilyLang;
  onLang: (l: FamilyLang) => void;
  left?: React.ReactNode;
  /** Must match the FamilyPage it sits above, or the logo drifts away from the
   *  content beneath it. */
  wide?: boolean;
}) {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 40,
      background: "#1a1410",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      paddingTop: "env(safe-area-inset-top, 0px)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        height: 60, padding: "0 20px", maxWidth: wide ? 1120 : 620, margin: "0 auto",
      }}>
        {left}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Logo dark style={{ fontSize: "1.05rem" }} />
        </div>

        {/* Hinglish is the default; English is the option, not a fallback. */}
        <div
          role="group"
          aria-label="Language"
          style={{
            display: "flex", flexShrink: 0, padding: 2, borderRadius: 8,
            background: "rgba(255,255,255,0.08)",
          }}
        >
          {(["hi", "en"] as FamilyLang[]).map(l => (
            <button
              key={l}
              onClick={() => onLang(l)}
              aria-pressed={lang === l}
              style={{
                minHeight: 30, padding: "0 12px", border: 0, borderRadius: 6, cursor: "pointer",
                fontFamily: "var(--font-dm-sans, sans-serif)",
                fontSize: "0.78rem", fontWeight: 600,
                background: lang === l ? "#f5ede0" : "transparent",
                color: lang === l ? "#1a1410" : "rgba(245,237,224,0.62)",
                transition: "background 0.15s ease",
              }}
            >
              {l === "hi" ? "Hinglish" : "English"}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

export function FamilyPage({ children, wide = false }: {
  children: React.ReactNode;
  /** The shortlist is a reading column and stays narrow. One rishta is a
   *  dossier someone decides from, so it gets the full width to work in. */
  wide?: boolean;
}) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5ede0",
      // A step larger than the rest of the app: the reader is often over 55,
      // on a phone, outdoors.
      fontSize: "17px",
    }}>
      <div style={{
        maxWidth: wide ? 1120 : 620, margin: "0 auto",
        padding: "28px 20px calc(48px + env(safe-area-inset-bottom))",
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
        width: 38, height: 38, flexShrink: 0, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)",
        color: "#f3e7d3", cursor: "pointer",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
