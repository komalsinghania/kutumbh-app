'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Building blocks for the dashboard's Profile tab.
//
// The tab used to be a stack of floating cards, each with its own radius,
// shadow and a tiny red uppercase label. Everything shouted, so nothing led.
// These pieces share one card treatment and one type scale (see ui.ts), and
// keep sindoor for actions rather than decoration.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from 'react';
import Link from 'next/link';
import { C, BODY, heading, label, meta, faint, card, numeral } from '@/components/ui';

export function Section({ title, aside, children }: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 12, marginBottom: 10,
      }}>
        <h2 style={label}>{title}</h2>
        {aside}
      </div>
      <div style={card}>{children}</div>
    </section>
  );
}

/** Label-left / value-right row. Rows sit flush so the hairlines line up. */
export function DataRow({ name, value }: { name: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      gap: 16, padding: '13px 18px', borderTop: `1px solid ${C.lineSoft}`,
    }}>
      <span style={{ ...meta, flexShrink: 0 }}>{name}</span>
      <span style={{
        fontFamily: BODY, fontSize: '0.92rem', fontWeight: 500,
        color: C.ink, textAlign: 'right',
      }}>{String(value)}</span>
    </div>
  );
}

/** A tappable row that leads somewhere. Same metrics as DataRow so a card of
 *  mixed rows still lines up. */
export function LinkRow({ href, children, onClick }: {
  href?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span style={{ fontFamily: BODY, fontSize: '0.92rem', fontWeight: 500, color: C.ink }}>
        {children}
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill={C.faint} aria-hidden>
        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
      </svg>
    </>
  );
  const style: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 16, padding: '15px 18px', width: '100%',
    background: 'none', border: 0, cursor: 'pointer', textDecoration: 'none',
    textAlign: 'left',
  };
  if (href) return <Link href={href} style={style}>{inner}</Link>;
  return <button onClick={onClick} style={style}>{inner}</button>;
}

/**
 * Identity block. The old version put a gradient bar behind the name and then
 * a grid below it — which rendered as a large empty white slab whenever the
 * profile had no education/income/diet yet. Missing fields now simply produce
 * no rows, and the card ends where the content ends.
 */
export function IdentityCard({ name, initials, meta: metaLine, rows }: {
  name: string;
  initials: string;
  meta: string;
  rows: { name: string; value?: string | number | null }[];
}) {
  const hasRows = rows.some(r => r.value !== undefined && r.value !== null && r.value !== '');
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
        <div style={{
          width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
          background: C.sindoorSoft, color: C.sindoor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: BODY, fontSize: '0.9rem', fontWeight: 600,
        }}>{initials}</div>
        <div style={{ minWidth: 0 }}>
          <h2 style={heading}>{name}</h2>
          {metaLine && <p style={{ ...meta, marginTop: 2 }}>{metaLine}</p>}
        </div>
      </div>

      {hasRows
        ? rows.map(r => <DataRow key={r.name} name={r.name} value={r.value} />)
        : (
          <div style={{ padding: '14px 18px', borderTop: `1px solid ${C.lineSoft}` }}>
            <p style={faint}>
              Your education, income and diet aren&apos;t filled in yet — they sharpen every match score.
            </p>
          </div>
        )}
    </div>
  );
}

/**
 * Four figures in one row. Only the count that represents progress is coloured;
 * when every number is a different colour, none of them mean anything.
 */
export function JourneyStats({ stats }: {
  stats: { label: string; value: number; highlight?: boolean }[];
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`,
    }}>
      {stats.map((s, i) => (
        <div
          key={s.label}
          style={{
            padding: '18px 12px',
            textAlign: 'center',
            borderLeft: i === 0 ? 'none' : `1px solid ${C.lineSoft}`,
          }}
        >
          <div style={{
            ...numeral,
            fontSize: '1.7rem',
            lineHeight: 1,
            color: s.highlight ? C.success : C.ink,
          }}>{s.value}</div>
          <div style={{ ...faint, marginTop: 6 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
