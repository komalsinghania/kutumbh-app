import type { CSSProperties } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// A small, strict style system shared by the family view and the Profile tab.
//
// Both screens had drifted: eight font sizes competing, weights from 400 to 800
// picked ad hoc, four corner radii, and tiny red uppercase labels on every
// section — which is what actually made them read as busy rather than formal.
// The rules here are deliberately few, so the surfaces stay consistent:
//
//   • ONE type scale. Fraunces at 500 for anything display, never heavier —
//     the weight is what made headings look chunky rather than composed.
//   • Section labels are muted and sentence-cased, not red and shouting.
//     Sindoor is reserved for primary actions and genuinely urgent state.
//   • ONE corner radius per role, one border colour, one shadow.
//   • Tabular numerals wherever figures sit in a column.
// ─────────────────────────────────────────────────────────────────────────────

export const C = {
  ink: '#1a1410',
  inkSoft: '#2d241c',
  paper: '#f5ede0',
  card: '#ffffff',
  cardQuiet: '#faf7f1',
  line: '#e6dcc9',
  lineSoft: '#f0e9dc',
  muted: '#6b5e4d',
  faint: '#9b8e7e',
  sindoor: '#c13e2a',
  sindoorSoft: 'rgba(193,62,42,0.08)',
  gold: '#b8892b',
  success: '#2d6b4f',
  successSoft: 'rgba(45,107,79,0.10)',
  danger: '#8b2a2a',
} as const;

export const DISPLAY = "var(--font-fraunces, Fraunces, Georgia, serif)";
export const BODY = "var(--font-dm-sans, 'DM Sans', system-ui, sans-serif)";

/** Page title. One per screen. */
export const title: CSSProperties = {
  fontFamily: DISPLAY,
  fontSize: '1.75rem',
  fontWeight: 500,
  letterSpacing: '-0.015em',
  lineHeight: 1.15,
  color: C.ink,
  margin: 0,
};

/** Card / row heading. */
export const heading: CSSProperties = {
  fontFamily: DISPLAY,
  fontSize: '1.18rem',
  fontWeight: 500,
  letterSpacing: '-0.01em',
  lineHeight: 1.25,
  color: C.ink,
  margin: 0,
};

/** Section label. Muted and sentence-case — it orients, it doesn't shout. */
export const label: CSSProperties = {
  fontFamily: BODY,
  fontSize: '0.72rem',
  fontWeight: 600,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: C.faint,
  margin: 0,
};

export const body: CSSProperties = {
  fontFamily: BODY,
  fontSize: '0.94rem',
  lineHeight: 1.6,
  color: C.ink,
  margin: 0,
};

export const meta: CSSProperties = {
  fontFamily: BODY,
  fontSize: '0.84rem',
  lineHeight: 1.55,
  color: C.muted,
  margin: 0,
};

export const faint: CSSProperties = {
  ...meta,
  fontSize: '0.78rem',
  color: C.faint,
};

/** The one card treatment. No competing radii or shadows. */
export const card: CSSProperties = {
  background: C.card,
  border: `1px solid ${C.line}`,
  borderRadius: 12,
  overflow: 'hidden',
};

/** Padding used inside every card, so blocks line up across sections. */
export const PAD = 18;

export const divider: CSSProperties = {
  height: 1,
  background: C.lineSoft,
  border: 0,
  margin: 0,
};

export const numeral: CSSProperties = {
  fontFamily: DISPLAY,
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 500,
  letterSpacing: '-0.02em',
};

/** Primary action. Solid, and the only place sindoor fills a shape. */
export const btnPrimary: CSSProperties = {
  fontFamily: BODY,
  fontSize: '0.9rem',
  fontWeight: 600,
  color: '#fff',
  background: C.sindoor,
  border: '1px solid transparent',
  borderRadius: 9,
  padding: '11px 18px',
  cursor: 'pointer',
  lineHeight: 1.2,
};

/** Secondary action. Outlined — most buttons should be this one. */
export const btnSecondary: CSSProperties = {
  fontFamily: BODY,
  fontSize: '0.9rem',
  fontWeight: 600,
  color: C.ink,
  background: C.card,
  border: `1px solid ${C.line}`,
  borderRadius: 9,
  padding: '11px 18px',
  cursor: 'pointer',
  lineHeight: 1.2,
};

/** Quiet text action for destructive or rarely-used options. */
export const btnQuiet: CSSProperties = {
  fontFamily: BODY,
  fontSize: '0.84rem',
  fontWeight: 500,
  color: C.muted,
  background: 'none',
  border: 0,
  padding: 0,
  cursor: 'pointer',
};
