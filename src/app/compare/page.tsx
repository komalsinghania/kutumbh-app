'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getProspect } from '@/lib/firestore';
import { Prospect, STAGE_LABELS, NAKSHATRAS } from '@/types';
import { calculateOverallScore } from '@/lib/scoring';
import { calculateAshtakoot } from '@/lib/kundli';
import { hasCompareAccess } from '@/lib/trial';
import { Logo } from '@/components/Logo';

function daysSince(createdAt: number): number {
  return Math.floor((Date.now() - createdAt) / 86400000);
}

function timeAgo(ts?: number): string {
  if (!ts) return '—';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

const SERIF = 'var(--font-fraunces, Fraunces, Georgia, serif)';

// Avatar gradients, cycled per contender.
const AVATAR_GRAD: [string, string][] = [
  ['#c13e2a', '#8B2A2A'],
  ['#b8892b', '#8a6420'],
  ['#2D6B4F', '#1d4a36'],
];

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// Score → semantic colour (green strong / gold mid / red weak).
function scoreColor(v: number | null): string {
  if (v === null) return '#9b8e7e';
  if (v >= 70) return '#2D6B4F';
  if (v >= 50) return '#b8892b';
  return '#c13e2a';
}

// Chip tones used across the signal cards.
const TONES = {
  green:   { bg: 'rgba(45,107,79,0.10)',  fg: '#2D6B4F', bd: 'rgba(45,107,79,0.28)' },
  amber:   { bg: 'rgba(184,137,43,0.13)', fg: '#9a6f1f', bd: 'rgba(184,137,43,0.35)' },
  red:     { bg: 'rgba(193,62,42,0.10)',  fg: '#c13e2a', bd: 'rgba(193,62,42,0.28)' },
  neutral: { bg: '#f4ecdd',               fg: '#6b5e4d', bd: '#e6dbc4' },
} as const;

function Chip({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  const t = TONES[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 9px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

// Eased count-up for score numbers.
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf: number;
    const t0 = performance.now();
    const dur = 950;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{v}{suffix}</>;
}

// Compact circular gauge that draws itself in on mount.
function Ring({ value, size = 62 }: { value: number | null; size?: number }) {
  const stroke = 5;
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const r = (size - stroke) / 2 - 1;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value ?? 0, 100);
  const offset = on ? circ - (pct / 100) * circ : circ;
  const color = scoreColor(value);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(26,20,16,0.06)" strokeWidth={stroke} />
        {value !== null && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }} />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: SERIF, fontSize: size * 0.3, fontWeight: 800, color: '#1a1410', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {value !== null ? <CountUp to={value} /> : '—'}
        </span>
        <span style={{ fontSize: size * 0.105, color: '#a99c88', fontWeight: 800, letterSpacing: '0.16em', marginTop: 2 }}>
          {value !== null ? 'OVERALL' : 'N/A'}
        </span>
      </div>
    </div>
  );
}

// Slim section card with an eyebrow label.
function Section({ eyebrow, title, delay, children }: { eyebrow: string; title: string; delay: number; children: React.ReactNode }) {
  return (
    <div className="cmp-in" style={{
      background: 'white', border: '1px solid #e9dfca', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 2px 14px rgba(80,50,20,0.04)', animationDelay: `${delay}ms`,
    }}>
      <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #f2ead9', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h2 style={{ fontFamily: SERIF, fontSize: '0.95rem', fontWeight: 700, color: '#1a1410' }}>{title}</h2>
        <p style={{ fontSize: '0.56rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c9a86a' }}>{eyebrow}</p>
      </div>
      {children}
    </div>
  );
}

type GridRow = { label: string; cell: (p: Prospect) => React.ReactNode; best?: (p: Prospect) => boolean };

// Reusable label-vs-contenders grid used by the Signals & Details sections.
function CompareGrid({ prospects, rows }: { prospects: Prospect[]; rows: GridRow[] }) {
  const cols = `minmax(80px, 0.75fr) repeat(${prospects.length}, minmax(0, 1fr))`;
  return (
    <div>
      {rows.map((row, ri) => (
        <div key={row.label} className="grid items-center cmp-row"
          style={{ gridTemplateColumns: cols, background: ri % 2 ? '#fbf7ee' : 'white' }}>
          <div style={{ padding: '9px 16px', fontSize: '0.68rem', fontWeight: 700, color: '#93866f' }}>{row.label}</div>
          {prospects.map(p => {
            const best = row.best?.(p) ?? false;
            return (
              <div key={p.id} style={{
                padding: '7px 8px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 600,
                color: '#1a1410', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 4, minWidth: 0, overflow: 'hidden',
              }}>
                {best && <span style={{ color: '#2D6B4F', fontSize: '0.62rem' }}>★</span>}
                <span style={{ overflowWrap: 'anywhere' }}>{row.cell(p)}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const PAGE_CSS = `
@keyframes cmpUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.cmp-in { animation: cmpUp 0.55s cubic-bezier(0.22,1,0.36,1) both; }
.cmp-row { transition: background 0.15s ease; }
.cmp-row:hover { background: #f6eeda !important; }
.cmp-col { transition: background 0.18s ease; cursor: pointer; border: none; background: transparent; }
.cmp-col:hover { background: #fbf7ef; }
.cmp-col:hover .cmp-avatar { transform: scale(1.07); }
.cmp-avatar { transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1); }
@media (prefers-reduced-motion: reduce) {
  .cmp-in { animation: none; }
  .cmp-anim { transition: none !important; }
}
`;

function CompareContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ids = (searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 3);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || ids.length === 0) return;
    Promise.all(ids.map(id => getProspect(user.uid, id))).then(results => {
      setProspects(results.filter(Boolean) as Prospect[]);
      setLoading(false);
    });
  }, [user, ids.join(',')]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5ede0' }}>
        <div className="flex flex-col items-center gap-4">
          <Logo className="text-4xl" />
          <div className="gold-spinner" />
        </div>
      </div>
    );
  }

  // Compare is unlocked by payment or an active trial. Guard direct URL access.
  if (!hasCompareAccess(profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#f5ede0' }}>
        <div className="text-center">
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔒</div>
          <p style={{ color: '#1a1410', fontWeight: 600, marginBottom: 4 }}>Compare is locked</p>
          <p style={{ color: '#6b5e4d', fontSize: '0.85rem', marginBottom: 16 }}>
            Your free trial has ended. Unlock Compare to keep going.
          </p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (prospects.length < 2) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5ede0' }}>
        <div className="text-center">
          <p style={{ color: '#6b5e4d' }}>Select 2–3 prospects to compare.</p>
          <button onClick={() => router.back()} className="btn-primary mt-4">Go Back</button>
        </div>
      </div>
    );
  }

  return <ComparisonView prospects={prospects} profile={profile} onBack={() => router.back()} />;
}

export function ComparisonView({ prospects, profile, onBack }: {
  prospects: Prospect[];
  profile: { nakshatra: number; rashiIndex?: number } | null;
  onBack: () => void;
}) {
  const router = useRouter();
  // Arms the bar-growth transitions one frame after mount.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const overalls = prospects.map(p => calculateOverallScore(p.gunaScore, p.compatScore));
  const bestKundli = Math.max(...prospects.map(p => p.gunaScore ?? 0));
  const bestCompat = Math.max(...prospects.map(p => p.compatScore ?? 0));
  const bestOverall = Math.max(...(overalls.filter(s => s !== null) as number[]), -1);
  const bestGreen = Math.max(...prospects.map(p => p.greenFlagCount ?? 0));
  const bestFamily = Math.max(...prospects.map(p => p.familyScore ?? 0));
  const bestConv = Math.max(...prospects.map(p => p.conversationCount ?? 0));
  const leastRed = Math.min(...prospects.map(p => p.redFlagCount ?? 0));

  // Leader (highest overall) for the scoreboard strip.
  const scored = overalls.map((s, i) => ({ s, i })).filter(x => x.s !== null) as { s: number; i: number }[];
  const leaderIdx = scored.length ? scored.reduce((a, b) => (b.s > a.s ? b : a)).i : -1;
  const leaderTied = leaderIdx >= 0 && overalls.filter(s => s === overalls[leaderIdx]).length > 1;
  const leader = leaderIdx >= 0 ? prospects[leaderIdx] : null;

  const doshaInfo = (p: Prospect) => {
    if (!profile || profile.nakshatra < 0 || p.nakshatra === undefined) return null;
    const r = calculateAshtakoot(profile.nakshatra, p.nakshatra, profile.rashiIndex, p.rashiIndex);
    const list = [r.hasNadiDosha && 'Nadi', r.hasBhakutDosha && 'Bhakut', r.hasGanaDosha && 'Gana'].filter(Boolean) as string[];
    return { clear: list.length === 0, list };
  };

  // Head-to-head bar metrics.
  const battle = [
    { label: 'Overall Match', max: 100, suffix: '',    values: overalls,                          best: bestOverall, asPct: true },
    { label: 'Compatibility', max: 100, suffix: '%',   values: prospects.map(p => p.compatScore), best: bestCompat,  asPct: true },
    { label: 'Kundli Milan',  max: 36,  suffix: '/36', values: prospects.map(p => p.gunaScore),   best: bestKundli,  asPct: false },
  ];

  // "Who leads and by how much" caption per metric.
  const gapText = (values: (number | null)[]): string => {
    const ranked = values
      .map((v, i) => ({ v, i }))
      .filter(x => x.v !== null)
      .sort((a, b) => (b.v as number) - (a.v as number)) as { v: number; i: number }[];
    if (ranked.length < 2) return '';
    const gap = ranked[0].v - ranked[1].v;
    if (gap === 0) return 'Even';
    return `${prospects[ranked[0].i].name.split(' ')[0]} +${gap}`;
  };

  const verdictTone = (v: number | null): { tone: keyof typeof TONES; label: string } => {
    if (v === null) return { tone: 'neutral', label: 'Not scored' };
    if (v >= 70) return { tone: 'green', label: 'Top Match' };
    if (v >= 50) return { tone: 'amber', label: 'Promising' };
    return { tone: 'red', label: 'Weaker Fit' };
  };

  const signalRows: GridRow[] = [
    {
      label: 'Doshas',
      cell: p => {
        const d = doshaInfo(p);
        if (!d) return <Chip tone="neutral">—</Chip>;
        return d.clear ? <Chip tone="green">✓ No Doshas</Chip> : <Chip tone="amber">⚠ {d.list.join(', ')}</Chip>;
      },
      best: p => doshaInfo(p)?.clear ?? false,
    },
    {
      label: 'Nakshatra',
      cell: p => p.nakshatra !== undefined ? <Chip tone="neutral">{NAKSHATRAS[p.nakshatra]}</Chip> : <span style={{ color: '#b7ab99' }}>—</span>,
    },
    {
      label: 'Green Flags',
      cell: p => (p.greenFlagCount ?? 0) > 0 ? <Chip tone="green"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 1 }}><path d="M2 1v10M2 1h7l-2 3 2 3H2" stroke="#2D6B4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="rgba(45,107,79,0.18)"/></svg> +{p.greenFlagCount}</Chip> : <span style={{ color: '#b7ab99' }}>—</span>,
      best: p => (p.greenFlagCount ?? 0) > 0 && (p.greenFlagCount ?? 0) === bestGreen,
    },
    {
      label: 'Red Flags',
      cell: p => (p.redFlagCount ?? 0) > 0 ? <Chip tone="red">🚩 {p.redFlagCount}</Chip> : <Chip tone="green">✓ Clean</Chip>,
      best: p => (p.redFlagCount ?? 0) === leastRed,
    },
    {
      label: 'Conversations',
      cell: p => (p.conversationCount ?? 0) > 0 ? <>{p.conversationCount}</> : <span style={{ color: '#b7ab99' }}>—</span>,
      best: p => (p.conversationCount ?? 0) > 0 && (p.conversationCount ?? 0) === bestConv,
    },
    {
      label: 'Last Activity',
      cell: p => <span style={{ color: '#6b5e4d' }}>{timeAgo(p.lastActivityAt)}</span>,
    },
  ];

  const detailRows: GridRow[] = [
    { label: 'Age',          cell: p => p.age ? `${p.age} yrs` : '—' },
    { label: 'City',         cell: p => p.city || '—' },
    { label: 'Education',    cell: p => <span style={{ fontWeight: 500, fontSize: '0.74rem' }}>{p.education || '—'}</span> },
    { label: 'Income',       cell: p => p.income || '—' },
    { label: 'Diet',         cell: p => p.diet || '—' },
    { label: 'Manglik',      cell: p => p.manglik || '—' },
    { label: 'Days Tracked', cell: p => `${daysSince(p.createdAt)}d` },
    { label: 'Stage',        cell: p => <Chip tone="neutral">{STAGE_LABELS[p.stage] || '—'}</Chip> },
    { label: 'Source',       cell: p => <span style={{ fontWeight: 500 }}>{p.source || '—'}</span> },
  ];

  // Rule-based verdict copy.
  const summaryParts: string[] = [];
  const sorted = [...prospects].sort((a, b) =>
    (calculateOverallScore(b.gunaScore, b.compatScore) ?? 0) - (calculateOverallScore(a.gunaScore, a.compatScore) ?? 0));
  if (sorted.length >= 2) {
    const top = sorted[0];
    const parts: string[] = [];
    if ((top.greenFlagCount ?? 0) > 0) parts.push(`${top.greenFlagCount} green flags`);
    if (top.familyScore && top.familyScore >= 4) parts.push(`strong family score (${top.familyScore}/5)`);
    if (top.gunaScore && top.gunaScore >= 24) parts.push(`good kundli match (${top.gunaScore}/36)`);
    if (parts.length > 0) summaryParts.push(`${top.name} stands out with ${parts.join(', ')}.`);
    const withRedFlags = prospects.filter(p => (p.redFlagCount ?? 0) > 0);
    if (withRedFlags.length > 0) {
      summaryParts.push(`${withRedFlags.map(p => `${p.name} (${p.redFlagCount} red flag${(p.redFlagCount ?? 0) > 1 ? 's' : ''})`).join(', ')} — review before proceeding.`);
    }
  }

  const two = prospects.length === 2;

  return (
    <div className="min-h-screen pb-16" style={{ background: 'radial-gradient(120% 50% at 50% 0%, #f8f1e3 0%, #f5ede0 55%)' }}>
      <style>{PAGE_CSS}</style>

      {/* ── Header ── */}
      <div className="suite-header px-4 flex items-center gap-3 sticky top-0 z-20" style={{ height: 56 }}>
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full" style={{ color: '#ffffff' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 style={{ fontFamily: SERIF, color: '#ffffff', fontStyle: 'italic', fontSize: '1.125rem' }} className="font-bold">Help Me Decide</h1>
        <span style={{ marginLeft: 'auto', fontSize: '0.66rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.08em' }}>
          {prospects.length} CONTENDERS
        </span>
      </div>

      <div className="mx-auto px-3 sm:px-4 pt-4" style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Scoreboard ── */}
        <div className="cmp-in" style={{
          background: 'white', border: '1px solid #e9dfca', borderRadius: 18, overflow: 'hidden',
          boxShadow: '0 6px 24px rgba(80,50,20,0.07)', animationDelay: '0ms',
        }}>
          {/* Leader strip */}
          {leader && (
            <div style={{
              background: 'linear-gradient(90deg, #1a0d08 0%, #3a1510 55%, #241009 100%)',
              padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <p style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                {leaderTied
                  ? <>Neck and neck at <strong style={{ color: '#ffb8a0' }}>{overalls[leaderIdx]}%</strong></>
                  : <><strong style={{ color: '#ffb8a0' }}>{leader.name.split(' ')[0]}</strong> leads with <strong style={{ color: '#ffb8a0' }}>{overalls[leaderIdx]}%</strong> overall</>}
              </p>
            </div>
          )}

          {/* Contender columns */}
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${prospects.length}, 1fr)` }}>
            {prospects.map((p, i) => {
              const overall = overalls[i];
              const isLeader = !leaderTied && i === leaderIdx;
              const grad = AVATAR_GRAD[i % AVATAR_GRAD.length];
              const v = verdictTone(overall);
              return (
                <button key={p.id} className="cmp-col" onClick={() => router.push(`/prospects/${p.id}`)}
                  title={`Open ${p.name}'s profile`}
                  style={{
                    padding: '16px 8px 14px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', textAlign: 'center', gap: 7,
                    borderLeft: i > 0 ? '1px solid #f2ead9' : 'none',
                  }}>
                  <div style={{ position: 'relative' }}>
                    <div className="cmp-avatar" style={{
                      width: 42, height: 42, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`,
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 800, boxShadow: '0 3px 10px rgba(0,0,0,0.14)',
                    }}>{initials(p.name)}</div>
                    {isLeader && (
                      <span style={{
                        position: 'absolute', top: -7, right: -7, fontSize: '0.55rem',
                        fontWeight: 800, color: '#b8892b', letterSpacing: 0,
                      }}>#1</span>
                    )}
                  </div>
                  <div>
                    <p style={{ fontFamily: SERIF, fontSize: '0.86rem', fontWeight: 700, color: '#1a1410', lineHeight: 1.15 }}>{p.name}</p>
                    <p style={{ fontSize: '0.64rem', color: '#9b8e7e', marginTop: 1 }}>{p.age} · {p.city}</p>
                  </div>
                  <Ring value={overall} size={62} />
                  <Chip tone={v.tone}>{v.label}</Chip>
                </button>
              );
            })}

            {/* VS medallion (2 contenders only) */}
            {two && (
              <div style={{
                position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                width: 32, height: 32, borderRadius: '50%', background: 'white',
                border: '1px solid #e2cf9e', boxShadow: '0 3px 10px rgba(80,50,20,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: SERIF, fontStyle: 'italic', fontWeight: 800, fontSize: '0.68rem', color: '#b8892b',
                pointerEvents: 'none',
              }}>vs</div>
            )}
          </div>
        </div>

        {/* ── Head-to-head bars ── */}
        <Section eyebrow="Head to Head" title="The Numbers" delay={70}>
          <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {battle.map((m, mi) => (
              <div key={m.label}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                  <p style={{ fontSize: '0.66rem', fontWeight: 800, color: '#6b5e4d', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{m.label}</p>
                  <p style={{ fontSize: '0.62rem', fontWeight: 700, color: '#b09a76' }}>{gapText(m.values)}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {prospects.map((p, i) => {
                    const val = m.values[i];
                    const has = val !== null && val !== undefined;
                    const isBest = has && val === m.best && m.best > 0;
                    const pct = has ? Math.min((val! / m.max) * 100, 100) : 0;
                    const colorPct = m.asPct ? val : (has ? (val! / m.max) * 100 : null);
                    const color = scoreColor(has ? (colorPct as number) : null);
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 64, flexShrink: 0, fontSize: '0.68rem', fontWeight: 600, color: '#4a4038', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name.split(' ')[0]}
                        </span>
                        <div style={{ flex: 1, height: 8, borderRadius: 6, background: '#f0e7d4', overflow: 'hidden' }}>
                          <div className="cmp-anim" style={{
                            width: armed ? `${pct}%` : '0%', height: '100%', borderRadius: 6,
                            background: `linear-gradient(90deg, ${color}b8, ${color})`,
                            transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${mi * 120 + i * 90}ms`,
                          }} />
                        </div>
                        <span style={{
                          width: 52, flexShrink: 0, textAlign: 'right', fontSize: '0.74rem', fontWeight: 800,
                          color: has ? color : '#b7ab99', fontFamily: SERIF, fontVariantNumeric: 'tabular-nums',
                        }}>
                          {has ? <><CountUp to={val!} />{m.suffix}</> : '—'}{isBest && <span style={{ marginLeft: 2, fontSize: '0.6rem' }}>★</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Signals ── */}
        <Section eyebrow="Your Read" title="Signals & Flags" delay={140}>
          <CompareGrid prospects={prospects} rows={signalRows} />
        </Section>

        {/* ── Details ── */}
        <Section eyebrow="On Paper" title="The Details" delay={210}>
          <CompareGrid prospects={prospects} rows={detailRows} />
        </Section>

        {/* ── Verdict ── */}
        {summaryParts.length > 0 && (
          <div className="cmp-in" style={{
            position: 'relative', background: 'white', borderRadius: 16, padding: '14px 16px 14px 20px',
            border: '1px solid #e9dfca', boxShadow: '0 2px 14px rgba(80,50,20,0.04)',
            overflow: 'hidden', animationDelay: '280ms',
          }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(180deg, #c13e2a, #8B2A2A)' }} />
            <p style={{ fontSize: '0.56rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c13e2a', marginBottom: 6 }}>The Verdict</p>
            {summaryParts.map((s, i) => (
              <p key={i} style={{ fontSize: '0.82rem', lineHeight: 1.55, color: '#1a1410', marginBottom: 3, display: 'flex', gap: 8 }}>
                <span style={{ color: '#c13e2a', fontSize: '0.6rem', marginTop: 4 }}>◆</span><span>{s}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5ede0' }}>
        <div className="flex flex-col items-center gap-4">
          <Logo className="text-4xl" />
          <div className="gold-spinner" />
        </div>
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
