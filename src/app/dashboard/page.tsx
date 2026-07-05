'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { subscribeToProspects } from '@/lib/firestore';
import { Prospect, ProspectStage } from '@/types';
import {
  calculateOverallScore, getCompatBreakdown, getAshtakootBreakdown, calculateCompatScore, getDealbreakersCheck,
} from '@/lib/scoring';
import { calculateAshtakoot } from '@/lib/kundli';
import CompatBreakdown from '@/components/CompatBreakdown';
import AshtakootBreakdown from '@/components/AshtakootBreakdown';
import RazorpayButton from '@/components/RazorpayButton';
import PlanCard from '@/components/PlanCard';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

/* ─── tiny helper: score colour ────────────────────────────────────────── */
function scoreColor(v: number): string {
  if (v >= 70) return '#2D6B4F';
  if (v >= 50) return '#b8892b';
  return '#c13e2a';
}

type MainTab = 'board' | 'matches' | 'decision' | 'compare' | 'profile';
type MatchSubTab = 'compat' | 'kundli';
type Nudge = { icon: string; text: string; prospectName: string; prospectId: string; cta: string; };

function timeAgo(ts?: number): string {
  if (!ts) return '';
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

/* ─── Almanac helpers ──────────────────────────────────────────────────── */
const NUM_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
  'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
function numWord(n: number): string { return NUM_WORDS[n] ?? String(n); }

const ORDINAL_WORDS = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth',
  'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh'];
function ordinalWord(n: number): string { return ORDINAL_WORDS[n] ?? `${n}th`; }

// Maps a nudge icon to a short noun for the "Needs You" stat (e.g. "One call").
const NUDGE_NOUN: Record<string, string> = {
  '📋': 'review', '📞': 'call', '🔯': 'kundli', '🚩': 'flag', '🕐': 'follow-up',
};

// Issue number for the masthead — weeks since the user joined.
function weeksSince(ts: number): number {
  return Math.max(1, Math.floor((Date.now() - ts) / 604800000) + 1);
}

function diaryDate(d: Date): { weekday: string; rest: string } {
  return {
    weekday: d.toLocaleDateString('en-GB', { weekday: 'long' }),
    rest: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

// Soft, diary-voiced "n days ago" for narrative copy.
function timeAgoWords(ts?: number): string {
  if (!ts) return 'a while ago';
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d <= 0) return 'earlier today';
  if (d === 1) return 'yesterday';
  if (d <= 12) return `${numWord(d).toLowerCase()} days ago`;
  return `${d} days ago`;
}

// Picks the one prospect to feature as the diary's "Lead".
function pickLead(prospects: Prospect[], nudges: Nudge[]): Prospect | null {
  if (prospects.length === 0) return null;
  const active = prospects.filter(p => p.stage !== 'rejected');
  // 1. The first nudge that points at a still-active prospect.
  for (const n of nudges) {
    const p = active.find(x => x.id === n.prospectId);
    if (p) return p;
  }
  // 2. Otherwise the furthest-along active prospect, most-recent first.
  const ranked = [...active].sort((a, b) => {
    const ja = JOURNEY_STAGES.indexOf(a.stage);
    const jb = JOURNEY_STAGES.indexOf(b.stage);
    if (jb !== ja) return jb - ja;
    return (b.lastActivityAt ?? b.createdAt) - (a.lastActivityAt ?? a.createdAt);
  });
  return ranked[0] ?? prospects[0];
}

// One italic sentence describing where the lead stands and what's due next.
function leadNarrative(p: Prospect): string {
  const pos = stageOrderIndex(p.stage) + 1;
  const when = timeAgoWords(p.lastActivityAt ?? p.createdAt);
  switch (p.stage) {
    case 'new':
      return `Newly added — ${ordinalWord(pos)} of eleven. Her biodata is waiting for your first read.`;
    case 'photo_exchanged':
      return `At the Photos stage — ${ordinalWord(pos)} of eleven. Look closely, then decide if the kundli is worth matching.`;
    case 'kundli_sent':
      return `Kundli is out for matching — ${ordinalWord(pos)} of eleven. The pandit's verdict is what you're waiting on.`;
    case 'kundli_matched':
      return `Kundli matched — ${ordinalWord(pos)} of eleven. A first call is the natural next step.`;
    case 'call_done':
      return `At the Call stage — ${ordinalWord(pos)} of eleven. You spoke ${when}; a follow-up is due to keep things warm.`;
    case 'family_call':
      return `Families are talking — ${ordinalWord(pos)} of eleven. Listen for warmth and genuine intent.`;
    case 'meeting_fixed':
      return `A meeting is fixed — ${ordinalWord(pos)} of eleven. Prepare what you most want to observe.`;
    case 'met':
      return `You've met — ${ordinalWord(pos)} of eleven. Sit with how it felt before the next move.`;
    case 'interested':
      return `Mutually interested — ${ordinalWord(pos)} of eleven. The conversation now turns gently toward roka.`;
    case 'on_hold':
      return `On hold — paused ${when}. A gentle nudge may bring it back to life.`;
    default:
      return `Last touched ${when}.`;
  }
}

// Short italic note for each entry in "Also in the Diary".
function diaryNote(p: Prospect): string {
  const when = timeAgoWords(p.lastActivityAt ?? p.createdAt);
  switch (p.stage) {
    case 'new': return 'Newly added — biodata awaiting your first read.';
    case 'photo_exchanged': return 'Photos shared — appearance review pending.';
    case 'kundli_sent': return 'Kundli sent — waiting on the match verdict.';
    case 'kundli_matched': return 'Newly matched — a first call is next.';
    case 'call_done': return `Spoke ${when} — a follow-up call is due.`;
    case 'family_call': return 'Families talking — waiting to hear back.';
    case 'meeting_fixed': return 'Meeting fixed — preparation pending.';
    case 'met': return 'Met in person — reflecting on the next step.';
    case 'interested': return 'Mutually interested — roka on the horizon.';
    case 'on_hold': return `On hold — paused ${when}.`;
    default: return STAGE_TAB_LABELS[p.stage];
  }
}

const STAGE_ORDER: ProspectStage[] = [
  'new', 'photo_exchanged', 'kundli_sent', 'kundli_matched',
  'call_done', 'family_call', 'meeting_fixed', 'met', 'interested', 'on_hold', 'rejected',
];

const STAGE_TAB_LABELS: Record<ProspectStage, string> = {
  new: 'New Lead', photo_exchanged: 'Photos', kundli_sent: 'Kundli', kundli_matched: 'Matched',
  call_done: 'Calls', family_call: 'Family', meeting_fixed: 'Meeting', met: 'Met',
  interested: 'Interested', on_hold: 'On Hold', rejected: 'Closed',
};

const JOURNEY_STAGES: ProspectStage[] = [
  'new', 'photo_exchanged', 'kundli_sent', 'kundli_matched',
  'call_done', 'family_call', 'meeting_fixed', 'met', 'interested',
];

const STAGE_QUICK_ACTION: Partial<Record<ProspectStage, string>> = {
  new: 'Review Biodata', photo_exchanged: 'Check Kundli', kundli_sent: 'View Report',
  kundli_matched: 'Schedule Call', call_done: 'Log Another Call', family_call: 'Rate Family',
  meeting_fixed: 'Prep Meeting', met: 'Rate Meeting', interested: 'Next Steps',
  on_hold: 'Resume', rejected: 'View Summary',
};

function stageProgress(stage: ProspectStage): number {
  const idx = JOURNEY_STAGES.indexOf(stage);
  if (idx < 0) return 0;
  return Math.round((idx / (JOURNEY_STAGES.length - 1)) * 100);
}

function stageOrderIndex(stage: ProspectStage): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx >= 0 ? idx : 0;
}

function computeNudges(prospects: Prospect[]): Nudge[] {
  const now = Date.now();
  const nudges: Nudge[] = [];
  for (const p of prospects) {
    if (nudges.length >= 6) break;
    const daysSinceAdded = Math.floor((now - p.createdAt) / 86400000);
    const daysSinceActivity = p.lastActivityAt ? Math.floor((now - p.lastActivityAt) / 86400000) : daysSinceAdded;
    if (p.stage === 'new' && daysSinceAdded > 3) {
      nudges.push({ icon: '📋', text: `Review biodata — added ${daysSinceAdded} days ago`, prospectName: p.name, prospectId: p.id, cta: 'Review →' });
    } else if (p.stage === 'call_done' && (p.conversationCount ?? 0) === 0) {
      nudges.push({ icon: '📞', text: 'Log your call', prospectName: p.name, prospectId: p.id, cta: 'Log Call →' });
    } else if (p.nakshatra !== undefined && p.nakshatra >= 0 && (p.gunaScore === null || p.gunaScore === undefined)) {
      nudges.push({ icon: '🔯', text: 'Kundli match ready to calculate', prospectName: p.name, prospectId: p.id, cta: 'Calculate →' });
    } else if ((p.redFlagCount ?? 0) >= 3) {
      nudges.push({ icon: '🚩', text: `${p.redFlagCount} red flags — review before proceeding`, prospectName: p.name, prospectId: p.id, cta: 'Review →' });
    } else if (daysSinceActivity >= 7) {
      nudges.push({ icon: '🕐', text: `No activity in ${daysSinceActivity} days`, prospectName: p.name, prospectId: p.id, cta: 'Follow Up →' });
    }
  }
  return nudges;
}

function CircleProgress({ value, size = 40, color = '#c13e2a' }: { value: number; size?: number; color?: string }) {
  const strokeWidth = 3.5;
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(214,201,176,0.5)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.34,1.56,0.64,1)' }} />
    </svg>
  );
}

export default function DashboardPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [mainTab, setMainTab] = useState<MainTab>('board');
  const [boardStage, setBoardStage] = useState<ProspectStage>('new');
  const [decisionFilter, setDecisionFilter] = useState<'all' | 'interested' | 'on_hold' | 'rejected'>('all');
  const [matchSub, setMatchSub] = useState<MatchSubTab>('compat');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleCompare = (id: string) =>
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!loading && user && !profile) router.replace('/onboarding');
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (!user) return;
    const u1 = subscribeToProspects(user.uid, setProspects);
    return () => { u1(); };
  }, [user]);

  useEffect(() => {
    if (prospects.length > 0) {
      const firstFilled = STAGE_ORDER.find(s => prospects.some(p => p.stage === s));
      if (firstFilled) setBoardStage(firstFilled);
    }
  }, [prospects.length]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5ede0' }}>
        <div className="flex flex-col items-center gap-4">
          <Logo className="text-4xl" />
          <div className="gold-spinner" style={{ width: 28, height: 28 }} />
        </div>
      </div>
    );
  }

  const stageCounts = STAGE_ORDER.reduce((acc, s) => {
    acc[s] = prospects.filter(p => p.stage === s).length; return acc;
  }, {} as Record<ProspectStage, number>);

  const activeStageTabs = STAGE_ORDER.filter(s => stageCounts[s] > 0);
  const boardProspects = prospects.filter(p => p.stage === boardStage).sort((a, b) => b.createdAt - a.createdAt);

  // Board metrics
  const bestMatch = prospects.reduce<Prospect | null>((best, p) => {
    const s = calculateOverallScore(p.gunaScore, p.compatScore);
    if (s === null) return best;
    const bestS = best ? (calculateOverallScore(best.gunaScore, best.compatScore) ?? -1) : -1;
    return s > bestS ? p : best;
  }, null);
  const bestMatchScore = bestMatch ? calculateOverallScore(bestMatch.gunaScore, bestMatch.compatScore) : null;
  const prospectsWithCompat = prospects.filter(p => p.compatScore !== null && p.compatScore !== undefined);
  const avgCompat = prospectsWithCompat.length > 0
    ? Math.round(prospectsWithCompat.reduce((sum, p) => sum + (p.compatScore ?? 0), 0) / prospectsWithCompat.length)
    : null;
  const nudges = computeNudges(prospects);
  const totalDecisions = (stageCounts['interested'] ?? 0) + (stageCounts['on_hold'] ?? 0) + (stageCounts['rejected'] ?? 0);

  // ── Almanac (board) derived values ──
  const lead = pickLead(prospects, nudges);
  const diaryProspects = lead
    ? prospects
        .filter(p => p.id !== lead.id && p.stage !== 'rejected')
        .sort((a, b) => (b.lastActivityAt ?? b.createdAt) - (a.lastActivityAt ?? a.createdAt))
        .slice(0, 4)
    : [];
  const almanacDate = diaryDate(new Date());
  const weekNo = weeksSince(profile.createdAt);
  const needsValue = nudges.length === 0
    ? 'All clear'
    : `${numWord(nudges.length)} ${NUDGE_NOUN[nudges[0].icon] ?? 'task'}${nudges.length > 1 ? 's' : ''}`;
  const onHoldCount = stageCounts['on_hold'] ?? 0;
  const noteToSelf = onHoldCount > 0
    ? `${numWord(onHoldCount)} ${onHoldCount === 1 ? 'prospect rests' : 'prospects rest'} on hold — worth a review before the week is out.`
    : nudges.length > 0
    ? `${numWord(nudges.length)} ${nudges.length === 1 ? 'task waits' : 'tasks wait'} for you in the register below.`
    : 'All caught up — enjoy the calm before the next maybe.';

  const byCompat = [...prospects].sort((a, b) =>
    (calculateOverallScore(b.gunaScore, b.compatScore) ?? 0) - (calculateOverallScore(a.gunaScore, a.compatScore) ?? 0)
  );
  const byKundli = [...prospects].filter(p => p.gunaScore !== null && p.gunaScore !== undefined).sort((a, b) => (b.gunaScore ?? 0) - (a.gunaScore ?? 0));

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const firstName = profile.name.split(' ')[0];

  /* ── Sidebar nav items ─── */
  const NAV_ITEMS: [MainTab, string, string, number | null][] = [
    ['board',    'M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z', 'Board',     null],
    ['matches',  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', 'Matches',   null],
    ['decision', 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z', 'Decisions', totalDecisions > 0 ? totalDecisions : null],
    ['compare',  'M3 5h8v14H3V5zm10 0h8v14h-8V5z', profile?.isPaid ? 'Compare ✦' : 'Compare 🔒', compareIds.length > 0 ? compareIds.length : null],
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5ede0', overflow: 'hidden' }}>

      {/* ══════════════════════════════════════════════════════════════
           LEFT SIDEBAR  (desktop)
      ══════════════════════════════════════════════════════════════ */}
      {!isMobile && (
        <aside style={{
          width: 240, minWidth: 240, flexShrink: 0, zIndex: 30,
          background: 'linear-gradient(180deg, #1c1108 0%, #1a1410 60%, #1e120a 100%)',
          display: 'flex', flexDirection: 'column', height: '100vh',
          boxShadow: '4px 0 32px rgba(0,0,0,0.28)',
          borderRight: '1px solid rgba(255,255,255,0.04)',
        }}>

          {/* Brand */}
          <div style={{ padding: '22px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Logo className="text-xl" dark />
            <p style={{
              fontSize: '0.55rem', color: 'rgba(255,255,255,0.22)', marginTop: 5,
              letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500,
            }}>
              Your Marriage Companion
            </p>
          </div>

          {/* CTA */}
          <div style={{ padding: '16px 16px 10px' }}>
            <Link href="/prospects/new" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              background: 'linear-gradient(135deg, #d44d36 0%, #b83521 100%)',
              color: '#fff', borderRadius: 10, padding: '11px 16px',
              fontSize: '0.84rem', fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 6px 20px rgba(193,62,42,0.42), inset 0 1px 0 rgba(255,255,255,0.12)',
              letterSpacing: '0.01em',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              <span>Add Prospect</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: '4px 12px 0', overflowY: 'auto' }}>
            {NAV_ITEMS.map(([tab, iconPath, label, badge]) => {
              const isActive = mainTab === tab;
              return (
                <button key={tab} onClick={() => { if (tab === 'compare' && mainTab !== 'compare') setCompareIds([]); setMainTab(tab); }} className="w-full"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11,
                    padding: '11px 14px', borderRadius: 10, marginBottom: 3,
                    background: isActive ? 'rgba(193,62,42,0.16)' : 'transparent',
                    color: isActive ? '#f5ede0' : 'rgba(255,255,255,0.4)',
                    fontSize: '0.87rem', fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.18s ease',
                    position: 'relative',
                  }}>
                  {isActive && (
                    <span style={{
                      position: 'absolute', left: 0, top: '20%', bottom: '20%',
                      width: 3, background: '#c13e2a', borderRadius: '0 3px 3px 0',
                    }} />
                  )}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isActive ? '#c13e2a' : 'rgba(255,255,255,0.35)'} style={{ flexShrink: 0 }}>
                    <path d={iconPath} />
                  </svg>
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge !== null && (
                    <span style={{
                      background: '#c13e2a', color: 'white', borderRadius: 20,
                      padding: '2px 8px', fontSize: '0.58rem', fontWeight: 800, flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(193,62,42,0.4)',
                    }}>{badge}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User footer */}
          <div style={{ padding: '10px 12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setMainTab('profile')} className="w-full"
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '11px 14px', borderRadius: 10, cursor: 'pointer', marginBottom: 2,
                background: mainTab === 'profile' ? 'rgba(193,62,42,0.16)' : 'rgba(255,255,255,0.03)',
                transition: 'all 0.18s ease',
              }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(193,62,42,0.6), rgba(184,137,43,0.4))',
                color: '#f5ede0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.68rem', fontWeight: 800,
                border: '1.5px solid rgba(193,62,42,0.5)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}>{initials(profile.name)}</div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <p style={{ color: '#f0ebe2', fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firstName}</p>
                <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.6rem', marginTop: 1 }}>View Profile</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.2)"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
            </button>
            <button onClick={() => signOut(auth).then(() => router.replace('/'))} className="w-full"
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
                color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem',
                transition: 'color 0.15s ease',
              }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      )}

      {/* ══════════════════════════════════════════════════════════════
           MAIN CONTENT
      ══════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* ── Mobile Header ── */}
        {isMobile && (
          <header style={{
            height: 58, background: '#1a1410',
            display: 'flex', alignItems: 'center', padding: '0 16px',
            justifyContent: 'space-between', flexShrink: 0, zIndex: 20,
            boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
          }}>
            <Logo className="text-lg" dark />
            <button onClick={() => setMainTab('profile')} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(193,62,42,0.7), rgba(184,137,43,0.5))',
                color: '#f5ede0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.68rem', fontWeight: 800, border: '1.5px solid rgba(193,62,42,0.5)',
              }}>
                {initials(profile.name)}
              </div>
            </button>
          </header>
        )}

        {/* ── Desktop Top Bar ── (hidden on the board — the Almanac has its own masthead) */}
        {!isMobile && mainTab !== 'board' && (
          <header style={{
            height: 64, background: 'white',
            borderBottom: '1px solid #ede4d4',
            padding: '0 32px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexShrink: 0,
            boxShadow: '0 1px 12px rgba(0,0,0,0.05)',
          }}>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-fraunces, Fraunces, serif)',
                fontSize: '1.15rem', color: '#1a1410', fontWeight: 700, lineHeight: 1.2,
              }}>
                {mainTab === 'matches' ? 'Match Rankings' :
                 mainTab === 'decision' ? 'Final Decisions' :
                 mainTab === 'compare' ? 'Compare Prospects' : 'My Profile'}
              </h1>
              <p style={{ fontSize: '0.68rem', color: '#9b8e7e', marginTop: 3, fontWeight: 400 }}>
                {mainTab === 'matches' ? 'Sorted by overall compatibility and kundli scores' :
                 mainTab === 'decision' ? `${totalDecisions} total decisions recorded` :
                 mainTab === 'compare' ? 'Pick 2 or 3 prospects to compare side by side' :
                 `${profile.profession} · ${profile.city}`}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {mainTab === 'compare' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.78rem', color: '#6b5e4d', fontWeight: 500 }}>{compareIds.length}/3 selected</span>
                  {compareIds.length >= 2 && (
                    <button style={{
                      background: profile?.isPaid ? 'linear-gradient(135deg, #d44d36, #b83521)' : '#d6c9b0',
                      color: '#fff', borderRadius: 8, padding: '8px 18px',
                      fontSize: '0.8rem', fontWeight: 700, cursor: profile?.isPaid ? 'pointer' : 'not-allowed', border: 'none',
                      boxShadow: profile?.isPaid ? '0 4px 12px rgba(193,62,42,0.3)' : 'none',
                    }} onClick={() => profile?.isPaid && router.push(`/compare?ids=${compareIds.join(',')}`)}>
                      {profile?.isPaid ? 'Compare Now' : '🔒 Compare Now'}
                    </button>
                  )}
                  {compareIds.length > 0 && (
                    <button style={{
                      fontSize: '0.78rem', color: '#6b5e4d', cursor: 'pointer',
                      padding: '8px 14px', borderRadius: 8, border: '1px solid #d6c9b0', background: 'white',
                    }} onClick={() => setCompareIds([])}>Clear</button>
                  )}
                </div>
              )}
            </div>
          </header>
        )}

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          <div style={{ maxWidth: isMobile ? '100%' : (mainTab === 'board' ? 1080 : 880), margin: '0 auto', paddingBottom: isMobile ? 'calc(72px + env(safe-area-inset-bottom) + 16px)' : 40 }}>


        {/* ═══════════════════════════════════════════════════════
             BOARD TAB
        ═══════════════════════════════════════════════════════ */}
        {mainTab === 'board' && (
          <div>
            {prospects.length === 0 ? (

              /* ── Empty State ─────────────────────────────── */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', textAlign: 'center' }}>
                <div style={{
                  width: 96, height: 96, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #c13e2a, #b83521)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 28, boxShadow: '0 16px 40px rgba(193,62,42,0.3)',
                }}>
                  <span style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '2.6rem', color: '#f5ede0', fontStyle: 'italic' }}>Rm</span>
                </div>
                <h2 style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.5rem', color: '#1a1410', fontWeight: 700, marginBottom: 10 }}>
                  Start your journey
                </h2>
                <p style={{ fontSize: '0.9rem', color: '#6b5e4d', marginBottom: 30, maxWidth: 280, lineHeight: 1.6 }}>
                  Before every roka, there&apos;s a year of maybes. Add your first prospect to begin.
                </p>
                <Link href="/prospects/new" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #d44d36, #b83521)',
                  color: 'white', padding: '13px 28px', borderRadius: 12,
                  fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
                  boxShadow: '0 8px 24px rgba(193,62,42,0.35)',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                  Add First Prospect
                </Link>
              </div>

            ) : (
              <>
                {/* ── Almanac Masthead ──────────────────────── */}
                <div style={{ padding: `${isMobile ? 22 : 34}px ${isMobile ? 16 : 28}px 0` }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#b08442' }}>
                    Your Weekly Companion · No. {weekNo}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                    <h1 style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: isMobile ? '2rem' : '2.9rem', fontWeight: 600, color: '#1a1410', lineHeight: 1.04, letterSpacing: '-0.01em', margin: 0 }}>
                      The Rishta Report
                    </h1>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontStyle: 'italic', color: '#6b5e4d', fontSize: '0.92rem', lineHeight: 1.3 }}>
                      <div>{almanacDate.weekday}</div>
                      <div>{almanacDate.rest}</div>
                    </div>
                  </div>
                  <div style={{ height: 2.5, background: '#1a1410', marginTop: 14, borderRadius: 2 }} />
                </div>

                {/* ── Almanac Stats Strip ───────────────────── */}
                <div style={{ padding: `18px ${isMobile ? 16 : 28}px 0` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', rowGap: 18 }}>
                    {([
                      { label: 'In Pipeline', value: numWord(prospects.length), color: '#1a1410' },
                      { label: 'Best Match', value: bestMatchScore !== null ? `${bestMatchScore}%` : '—', color: '#c13e2a' },
                      { label: 'Avg Warmth', value: avgCompat !== null ? `${avgCompat}%` : '—', color: '#2D6B4F' },
                      { label: 'Needs You', value: needsValue, color: '#1a1410' },
                    ]).map((s, i) => {
                      const divided = (!isMobile && i > 0) || (isMobile && i % 2 === 1);
                      return (
                        <div key={s.label} style={{
                          paddingLeft: divided ? 18 : 0,
                          borderLeft: divided ? '1px solid #e3d9c6' : 'none',
                        }}>
                          <div style={{ fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9b8e7e', marginBottom: 6 }}>
                            {s.label}
                          </div>
                          <div style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: isMobile ? '1.5rem' : '1.9rem', fontWeight: 600, color: s.color, lineHeight: 1.05 }}>
                            {s.value}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ height: 1, background: '#e3d9c6', marginTop: 18 }} />
                </div>

                {/* ── Almanac Body: Lead + Diary ────────────── */}
                <div style={{
                  padding: `24px ${isMobile ? 16 : 28}px 0`,
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.7fr) minmax(0, 1fr)',
                  gap: isMobile ? 30 : 38,
                }}>

                  {/* LEAD — Needs Your Attention */}
                  {lead && (
                    <div style={{ animation: 'fadeUpIn 0.45s ease-out 0.05s both' }}>
                      <div style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#b08442', marginBottom: 16 }}>
                        Lead — Needs Your Attention
                      </div>
                      <div style={{ display: 'flex', gap: isMobile ? 16 : 22, flexDirection: isMobile ? 'column' : 'row' }}>
                        {lead.photos?.[0] ? (
                          <img src={lead.photos[0]} alt="" style={{ width: isMobile ? '100%' : 148, height: isMobile ? 220 : 188, borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1px solid #e3d9c6' }} />
                        ) : (
                          <div style={{
                            width: isMobile ? '100%' : 148, height: isMobile ? 150 : 188, borderRadius: 6, flexShrink: 0,
                            background: 'linear-gradient(150deg, #efe2cf 0%, #e7cbb8 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '2.6rem', fontWeight: 500,
                            color: 'rgba(193,62,42,0.45)', border: '1px solid #e3d9c6',
                          }}>{initials(lead.name)}</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h2 style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: isMobile ? '1.5rem' : '1.8rem', fontWeight: 600, color: '#1a1410', lineHeight: 1.1, margin: 0 }}>
                            {lead.name}
                          </h2>
                          <p style={{ fontSize: '0.78rem', color: '#7a6e62', marginTop: 4 }}>
                            {[lead.age ? `${lead.age}` : null, lead.city, lead.profession].filter(Boolean).join(' · ')}
                          </p>
                          <p style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontStyle: 'italic', fontSize: '1.02rem', color: '#4a4038', lineHeight: 1.5, marginTop: 14 }}>
                            “{leadNarrative(lead)}”
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18, flexWrap: 'wrap' }}>
                            <button onClick={() => router.push(`/prospects/${lead.id}`)} style={{
                              background: 'linear-gradient(135deg, #d44d36 0%, #b83521 100%)',
                              color: '#fff', borderRadius: 8, padding: '10px 20px',
                              fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', border: 'none',
                              boxShadow: '0 4px 14px rgba(193,62,42,0.32)',
                            }}>
                              {STAGE_QUICK_ACTION[lead.stage] ?? 'Open her page'}
                            </button>
                            {(() => {
                              const ov = calculateOverallScore(lead.gunaScore, lead.compatScore);
                              if (lead.gunaScore == null && ov === null) return null;
                              return (
                                <span style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontStyle: 'italic', fontSize: '0.82rem', color: '#9b8e7e' }}>
                                  {lead.gunaScore != null && `— kundli ${lead.gunaScore} of 36 `}
                                  {ov !== null && <span style={{ color: scoreColor(ov), fontWeight: 600, fontStyle: 'normal' }}>✦ {ov}%</span>}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* ALSO IN THE DIARY */}
                  <div style={{ borderLeft: isMobile ? 'none' : '1px solid #e3d9c6', paddingLeft: isMobile ? 0 : 26, animation: 'fadeUpIn 0.45s ease-out 0.12s both' }}>
                    <div style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9b8e7e', marginBottom: 14 }}>
                      Also in the Diary
                    </div>
                    {diaryProspects.length === 0 ? (
                      <p style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontStyle: 'italic', fontSize: '0.9rem', color: '#9b8e7e' }}>
                        No one else in the diary just yet.
                      </p>
                    ) : diaryProspects.map((p, i) => {
                      const ov = calculateOverallScore(p.gunaScore, p.compatScore);
                      return (
                        <button key={p.id} onClick={() => router.push(`/prospects/${p.id}`)} style={{
                          width: '100%', textAlign: 'left', display: 'block', cursor: 'pointer',
                          background: 'transparent', border: 'none',
                          padding: '13px 0',
                          borderTop: i === 0 ? 'none' : '1px solid #ece3d2',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                            <h3 style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.05rem', fontWeight: 600, color: '#1a1410', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                              {p.name}
                            </h3>
                            {ov !== null && (
                              <span style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '0.92rem', fontWeight: 700, color: scoreColor(ov), flexShrink: 0 }}>{ov}%</span>
                            )}
                          </div>
                          <p style={{ fontSize: '0.72rem', color: '#7a6e62', marginTop: 2 }}>
                            {[p.age ? `${p.age}` : null, p.city, p.profession].filter(Boolean).join(' · ')}
                          </p>
                          <p style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontStyle: 'italic', fontSize: '0.84rem', color: '#9b8e7e', marginTop: 6, lineHeight: 1.4 }}>
                            {diaryNote(p)}
                          </p>
                        </button>
                      );
                    })}

                    {/* A note to self */}
                    <button onClick={() => setMainTab('decision')} style={{
                      marginTop: 18, width: '100%', textAlign: 'left', display: 'block', cursor: 'pointer',
                      border: '1px solid #e3d9c6', borderRadius: 8, padding: '14px 16px',
                      background: 'rgba(255,255,255,0.45)',
                    }}>
                      <div style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontStyle: 'italic', fontSize: '0.88rem', color: '#6b5e4d', marginBottom: 4 }}>
                        A note to self
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#4a4038', lineHeight: 1.5 }}>
                        {noteToSelf}
                      </p>
                    </button>
                  </div>
                </div>

                {/* ── The Full Register (stage tabs + cards) ── */}
                <div style={{ padding: `34px ${isMobile ? 16 : 28}px 0` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <span style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 600, color: '#1a1410', whiteSpace: 'nowrap' }}>
                      The Full Register
                    </span>
                    <span style={{ flex: 1, height: 1, background: '#e3d9c6' }} />
                  </div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c13e2a', marginBottom: 12 }}>
                    By Stage
                  </div>
                  <div className="overflow-x-auto scrollbar-none" style={{ paddingBottom: 2 }}>
                    <div style={{ display: 'flex', gap: 6, minWidth: 'max-content' }}>
                      {activeStageTabs.map(s => (
                        <button key={s} onClick={() => setBoardStage(s)}
                          style={{
                            padding: '7px 14px', borderRadius: 20, fontSize: '0.76rem',
                            fontWeight: boardStage === s ? 700 : 500,
                            cursor: 'pointer', transition: 'all 0.18s ease', whiteSpace: 'nowrap',
                            background: boardStage === s ? 'linear-gradient(135deg, #d44d36, #b83521)' : 'white',
                            color: boardStage === s ? 'white' : '#6b5e4d',
                            border: boardStage === s ? 'none' : '1px solid #d6c9b0',
                            boxShadow: boardStage === s ? '0 4px 12px rgba(193,62,42,0.3)' : '0 1px 4px rgba(0,0,0,0.04)',
                          }}>
                          {STAGE_TAB_LABELS[s]}
                          <span style={{ marginLeft: 5, opacity: boardStage === s ? 0.8 : 0.5, fontSize: '0.7rem' }}>({stageCounts[s]})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Prospect Cards ────────────────────────── */}
                <div style={{ padding: `14px ${isMobile ? 16 : 28}px 0`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {boardProspects.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#9b8e7e', fontSize: '0.88rem' }}>
                      No prospects in this stage.
                    </div>
                  )}
                  {boardProspects.map((p, i) => (
                    <BoardProspectCard key={p.id} prospect={p} index={i} onTap={() => router.push(`/prospects/${p.id}`)} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}


        {/* ═══════════════════════════════════════════════════════
             MATCHES TAB
        ═══════════════════════════════════════════════════════ */}
        {(mainTab === 'matches' || mainTab === 'compare') && (
          <div>
            <div style={{
              padding: `18px ${isMobile ? 16 : 28}px 0`,
              position: 'sticky', top: 0, zIndex: 10,
              background: '#f5ede0', borderBottom: '1px solid #e8dece',
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['compat', 'kundli'] as MatchSubTab[]).map(sub => (
                  <button key={sub} onClick={() => setMatchSub(sub)}
                    style={{
                      padding: '8px 18px', borderRadius: 20, fontSize: '0.8rem',
                      fontWeight: matchSub === sub ? 700 : 500, cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      background: matchSub === sub ? 'linear-gradient(135deg, #d44d36, #b83521)' : 'white',
                      color: matchSub === sub ? 'white' : '#6b5e4d',
                      border: matchSub === sub ? 'none' : '1px solid #d6c9b0',
                      boxShadow: matchSub === sub ? '0 4px 12px rgba(193,62,42,0.3)' : 'none',
                      marginBottom: 14,
                    }}>
                    {sub === 'compat' ? '♡ Compatibility' : '✦ Kundli Score'}
                  </button>
                ))}
              </div>
            </div>

            {mainTab === 'compare' && (
              <div style={{ padding: `0 ${isMobile ? 16 : 28}px`, marginBottom: 4 }}>
                {/* ── Paywall for unpaid users ── */}
                {!profile?.isPaid && (
                  <div style={{ marginBottom: 16, borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 60px rgba(139,42,42,0.18), 0 4px 16px rgba(0,0,0,0.08)' }}>
                    {/* Top gradient hero */}
                    <div style={{
                      background: 'linear-gradient(145deg, #1a0d08 0%, #3a1510 40%, #1c0a0a 100%)',
                      padding: '32px 24px 0',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      {/* Decorative glow blobs */}
                      <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(193,62,42,0.35) 0%, transparent 70%)', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,137,43,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

                      {/* Badge row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: 'rgba(193,62,42,0.25)', border: '1px solid rgba(193,62,42,0.4)',
                          borderRadius: 20, padding: '5px 12px',
                        }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff6b4a', boxShadow: '0 0 6px rgba(255,107,74,0.8)' }} />
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'rgba(255,200,180,0.9)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Roka Ready</span>
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-fraunces, Fraunces, serif)',
                          fontSize: '1.6rem', fontWeight: 800, color: 'white', lineHeight: 1,
                        }}>
                          ₹499
                          <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginLeft: 6, fontFamily: 'inherit' }}>once</span>
                        </div>
                      </div>

                      {/* Headline */}
                      <div style={{ position: 'relative', marginBottom: 16 }}>
                        <h3 style={{
                          fontFamily: 'var(--font-fraunces, Fraunces, serif)',
                          fontSize: '1.55rem', fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: 8,
                        }}>
                          See the full picture.<br />
                          <em style={{ color: '#ffb8a0' }}>Before your roka.</em>
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, maxWidth: 320 }}>
                          Compare up to 3 prospects side by side — kundli score, compatibility, flags, and every dimension that matters.
                        </p>
                      </div>

                      {/* Feature pills */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 28, position: 'relative' }}>
                        {[
                          { icon: '✦', label: 'Side-by-side Compare' },
                          { icon: '♡', label: 'Compatibility score' },
                          { icon: '☽', label: 'Kundli Milan' },
                          { icon: '⚑', label: 'Red & green flags' },
                        ].map(f => (
                          <div key={f.label} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 20, padding: '5px 12px', backdropFilter: 'blur(4px)',
                          }}>
                            <span style={{ fontSize: '0.65rem', color: '#ffb8a0' }}>{f.icon}</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{f.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Bottom curve connector */}
                      <div style={{ height: 24, background: 'white', borderRadius: '50% 50% 0 0 / 100% 100% 0 0', marginLeft: -24, marginRight: -24 }} />
                    </div>

                    {/* Bottom white section */}
                    <div style={{ background: 'white', padding: '0 24px 26px' }}>
                      {/* Social proof strip */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: '#faf7f3', border: '1px solid #ede8df',
                        borderRadius: 14, padding: '10px 14px', marginBottom: 18,
                      }}>
                        <div style={{ display: 'flex' }}>
                          {['#c13e2a', '#8B2A2A', '#b8892b'].map((c, i) => (
                            <div key={i} style={{
                              width: 26, height: 26, borderRadius: '50%',
                              background: `linear-gradient(135deg, ${c}cc, ${c})`,
                              border: '2px solid white', marginLeft: i ? -8 : 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.55rem', fontWeight: 800, color: 'white',
                            }}>
                              {['P', 'A', 'S'][i]}
                            </div>
                          ))}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#6b5e4d', lineHeight: 1.4 }}>
                          <strong style={{ color: '#1a1410' }}>No subscription.</strong> Pay once, use till your roka. No auto-renewal, ever.
                        </span>
                      </div>

                      {/* Price breakdown */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#a89e92', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>You pay</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '2.2rem', fontWeight: 800, color: '#c13e2a', lineHeight: 1 }}>₹499</span>
                            <span style={{ fontSize: '0.75rem', color: '#a89e92', textDecoration: 'line-through' }}>₹2,000+/mo</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#a89e92', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}></div>
                          {/* <div style={{
                            background: 'rgba(45,107,79,0.1)', border: '1px solid rgba(45,107,79,0.25)',
                            borderRadius: 20, padding: '4px 12px',
                            fontSize: '0.75rem', fontWeight: 700, color: '#2D6B4F',
                          }}>Save ₹23,501/yr</div> */}
                        </div>
                      </div>

                      <RazorpayButton
                        onSuccess={refreshProfile}
                        label="Unlock Roka Ready — ₹499"
                        style={{ width: '100%', borderRadius: 14, padding: '15px 20px', fontSize: '0.95rem', letterSpacing: '0.01em' }}
                      />

                      <p style={{ textAlign: 'center', fontSize: '0.68rem', color: '#c0b4a6', marginTop: 10 }}>
                        🔒 Secured by Razorpay · UPI · Cards · Net Banking
                      </p>
                    </div>
                  </div>
                )}
                <div style={{
                  background: 'rgba(193,62,42,0.06)', border: '1px solid rgba(193,62,42,0.25)',
                  borderRadius: 12, padding: '10px 14px', fontSize: '0.78rem', color: '#6b5e4d',
                  opacity: profile?.isPaid ? 1 : 0.5, pointerEvents: profile?.isPaid ? 'auto' : 'none',
                }}>
                  Tap up to <strong style={{ color: '#c13e2a' }}>3 prospects</strong> to select them, then hit <strong style={{ color: '#c13e2a' }}>Compare Now</strong>.
                </div>
                {/* Mobile action row (desktop has these in the header) */}
                {isMobile && compareIds.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                    <span style={{ fontSize: '0.78rem', color: '#6b5e4d', fontWeight: 500 }}>{compareIds.length}/3 selected</span>
                    <div style={{ flex: 1 }} />
                    {compareIds.length >= 2 && (
                      <button style={{
                        background: profile?.isPaid ? 'linear-gradient(135deg, #d44d36, #b83521)' : '#d6c9b0',
                        color: '#fff', borderRadius: 8, padding: '8px 18px',
                        fontSize: '0.8rem', fontWeight: 700, cursor: profile?.isPaid ? 'pointer' : 'not-allowed', border: 'none',
                        boxShadow: profile?.isPaid ? '0 4px 12px rgba(193,62,42,0.3)' : 'none',
                      }} onClick={() => profile?.isPaid && router.push(`/compare?ids=${compareIds.join(',')}`)}>
                        {profile?.isPaid ? 'Compare Now' : '🔒 Compare Now'}
                      </button>
                    )}
                    <button style={{
                      fontSize: '0.78rem', color: '#6b5e4d', cursor: 'pointer',
                      padding: '8px 14px', borderRadius: 8, border: '1px solid #d6c9b0', background: 'white',
                    }} onClick={() => setCompareIds([])}>Clear</button>
                  </div>
                )}
              </div>
            )}

            <div style={{ padding: `12px ${isMobile ? 16 : 28}px 0`, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {matchSub === 'compat' && (
                byCompat.length === 0
                  ? <div style={{ textAlign: 'center', padding: '60px 0', color: '#9b8e7e', fontSize: '0.88rem' }}>
                      Add birth details to see compatibility scores.
                    </div>
                  : byCompat.map((p, idx) => {
                    const overall = calculateOverallScore(p.gunaScore, p.compatScore);
                    const isSelected = compareIds.includes(p.id);
                    return (
                      <div key={p.id} style={{
                        background: 'white', borderRadius: 16,
                        border: isSelected ? '2px solid #c13e2a' : '1px solid #ede4d4',
                        boxShadow: isSelected ? '0 4px 20px rgba(193,62,42,0.15)' : '0 2px 12px rgba(0,0,0,0.05)',
                        overflow: 'hidden', animation: `fadeUpIn 0.35s ease-out ${idx * 0.05}s both`,
                        transition: 'all 0.2s ease',
                      }}>
                        <div style={{ padding: '14px 16px', cursor: 'pointer' }}
                          onClick={() => mainTab === 'compare' ? toggleCompare(p.id) : router.push(`/prospects/${p.id}`)}>
                          {idx < 3 && overall !== null && (
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: '0.58rem', fontWeight: 800, padding: '3px 8px', borderRadius: 20,
                              background: idx === 0 ? 'rgba(184,137,43,0.12)' : idx === 1 ? 'rgba(193,62,42,0.08)' : 'rgba(107,94,77,0.08)',
                              color: idx === 0 ? '#b8892b' : idx === 1 ? '#c13e2a' : '#6b5e4d',
                              marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase',
                            }}>
                              {idx === 0 ? '★ Top Match' : idx === 1 ? '✦ 2nd' : '✦ 3rd'}
                            </div>
                          )}
                          <ProspectCardInner prospect={p} isSelected={isSelected} />
                        </div>
                        <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #f0ebe2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {overall !== null ? (
                              <>
                                <div style={{ position: 'relative', display: 'inline-flex' }}>
                                  <CircleProgress value={overall} size={32} color={scoreColor(overall)} />
                                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 800, color: scoreColor(overall) }}>{overall}</span>
                                </div>
                                <span style={{ fontSize: '0.72rem', color: '#6b5e4d' }}>
                                  <span style={{ fontWeight: 700, color: scoreColor(overall) }}>{overall}% match</span>
                                  {p.compatScore !== null && ` · ${p.compatScore}% compat`}
                                </span>
                              </>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#9b8e7e' }}>No score yet</span>
                            )}
                          </div>
                          <button style={{
                            fontSize: '0.72rem', fontWeight: 700, color: '#c13e2a',
                            padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                            border: '1px solid rgba(193,62,42,0.3)', background: 'rgba(193,62,42,0.04)',
                          }} onClick={e => { e.stopPropagation(); toggleExpand(p.id); }}>
                            {expanded.has(p.id) ? 'Hide ▲' : 'Why? ▼'}
                          </button>
                        </div>
                        {expanded.has(p.id) && profile && (
                          <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f0ebe2' }}>
                            <CompatBreakdown criteria={getCompatBreakdown(profile, p)} total={p.compatScore ?? calculateCompatScore(profile, p)} dealbreakersCheck={getDealbreakersCheck(profile, p)} />
                          </div>
                        )}
                      </div>
                    );
                  })
              )}

              {matchSub === 'kundli' && (
                byKundli.length === 0
                  ? <div style={{ textAlign: 'center', padding: '60px 0', color: '#9b8e7e', fontSize: '0.88rem' }}>
                      Add birth details to see kundli scores.
                    </div>
                  : byKundli.map((p, idx) => {
                    const isSelected = compareIds.includes(p.id);
                    const hasProfile = profile?.nakshatra !== undefined && profile.nakshatra >= 0;
                    return (
                      <div key={p.id} style={{
                        background: 'white', borderRadius: 16,
                        border: isSelected ? '2px solid #c13e2a' : '1px solid #ede4d4',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden',
                        animation: `fadeUpIn 0.35s ease-out ${idx * 0.05}s both`,
                      }}>
                        <div style={{ padding: '14px 16px', cursor: 'pointer' }}
                          onClick={() => mainTab === 'compare' ? toggleCompare(p.id) : router.push(`/prospects/${p.id}`)}>
                          <ProspectCardInner prospect={p} isSelected={isSelected} />
                        </div>
                        <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #f0ebe2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b8892b' }}>{p.gunaScore}/36 gunas</span>
                            {hasProfile && p.nakshatra !== undefined && (() => {
                              const r = calculateAshtakoot(profile.nakshatra, p.nakshatra!, profile.rashiIndex, p.rashiIndex);
                              const doshas = [r.hasNadiDosha && 'Nadi', r.hasBhakutDosha && 'Bhakut', r.hasGanaDosha && 'Gana'].filter(Boolean);
                              return doshas.length > 0
                                ? <span style={{ fontSize: '0.72rem', color: '#8B2A2A', marginLeft: 6 }}>· {doshas.join(', ')} dosha</span>
                                : <span style={{ fontSize: '0.72rem', color: '#2D6B4F', marginLeft: 6 }}>· No major dosha</span>;
                            })()}
                          </div>
                          {hasProfile && p.nakshatra !== undefined && (
                            <button style={{
                              fontSize: '0.72rem', fontWeight: 700, color: '#b8892b',
                              padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                              border: '1px solid rgba(184,137,43,0.35)', background: 'rgba(184,137,43,0.05)',
                            }} onClick={e => { e.stopPropagation(); toggleExpand(p.id); }}>
                              {expanded.has(p.id) ? 'Hide ▲' : 'Kundli ▼'}
                            </button>
                          )}
                        </div>
                        {expanded.has(p.id) && hasProfile && p.nakshatra !== undefined && (
                          <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f0ebe2' }}>
                            <AshtakootBreakdown koots={getAshtakootBreakdown(profile.nakshatra, p.nakshatra)} total={p.gunaScore ?? 0} />
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
             DECISION TAB
        ═══════════════════════════════════════════════════════ */}
        {mainTab === 'decision' && (() => {
          const decisionProspects = prospects
            .filter(p => ['interested', 'on_hold', 'rejected'].includes(p.stage))
            .filter(p => decisionFilter === 'all' || p.stage === decisionFilter)
            .sort((a, b) => (b.lastActivityAt ?? b.createdAt) - (a.lastActivityAt ?? a.createdAt));
          const counts = {
            interested: prospects.filter(p => p.stage === 'interested').length,
            on_hold: prospects.filter(p => p.stage === 'on_hold').length,
            rejected: prospects.filter(p => p.stage === 'rejected').length,
          };
          return (
            <div>
              {/* Summary chips */}
              <div style={{ padding: `22px ${isMobile ? 16 : 28}px 0`, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {([
                  { key: 'interested' as const, label: 'Interested', color: '#2D6B4F', bg: 'rgba(45,107,79,0.08)', border: '1px solid rgba(45,107,79,0.2)' },
                  { key: 'on_hold' as const, label: 'On Hold', color: '#b8892b', bg: 'rgba(184,137,43,0.08)', border: '1px solid rgba(184,137,43,0.2)' },
                  { key: 'rejected' as const, label: 'Rejected', color: '#8B2A2A', bg: 'rgba(139,42,42,0.08)', border: '1px solid rgba(139,42,42,0.2)' },
                ]).map(({ key, label, color, bg, border }) => (
                  <button key={key}
                    onClick={() => setDecisionFilter(decisionFilter === key ? 'all' : key)}
                    style={{
                      background: decisionFilter === key ? bg : 'white',
                      borderRadius: 14, border: decisionFilter === key ? border.replace('1px', '2px') : '1px solid #ede4d4',
                      padding: '16px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      cursor: 'pointer', transition: 'all 0.2s ease',
                      boxShadow: decisionFilter === key ? `0 0 0 4px ${bg}` : '0 2px 10px rgba(0,0,0,0.04)',
                    }}>
                    <span style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>
                      {counts[key]}
                    </span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                  </button>
                ))}
              </div>

              {/* Filter pills */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: `14px ${isMobile ? 16 : 28}px 0` }} className="scrollbar-none">
                {([
                  { key: 'all' as const, label: `All (${counts.interested + counts.on_hold + counts.rejected})` },
                  { key: 'interested' as const, label: `Interested (${counts.interested})` },
                  { key: 'on_hold' as const, label: `On Hold (${counts.on_hold})` },
                  { key: 'rejected' as const, label: `Rejected (${counts.rejected})` },
                ]).map(f => (
                  <button key={f.key} onClick={() => setDecisionFilter(f.key)}
                    style={{
                      flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: '0.76rem',
                      fontWeight: decisionFilter === f.key ? 700 : 500, cursor: 'pointer',
                      transition: 'all 0.18s ease', whiteSpace: 'nowrap',
                      background: decisionFilter === f.key ? '#1a1410' : 'white',
                      color: decisionFilter === f.key ? '#f5ede0' : '#6b5e4d',
                      border: decisionFilter === f.key ? 'none' : '1px solid #d6c9b0',
                      boxShadow: decisionFilter === f.key ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Cards */}
              <div style={{ padding: `14px ${isMobile ? 16 : 28}px`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {decisionProspects.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', textAlign: 'center', gap: 12 }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0e8d8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>🤔</div>
                    <p style={{ fontSize: '0.9rem', color: '#6b5e4d', fontWeight: 500 }}>No decisions recorded yet.</p>
                    <p style={{ fontSize: '0.75rem', color: '#9b8e7e' }}>Open a prospect and use the Final Decision card.</p>
                  </div>
                ) : decisionProspects.map((p, i) => {
                  const overall = calculateOverallScore(p.gunaScore, p.compatScore);
                  const cardInitials = p.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                  const dm = p.stage === 'interested'
                    ? { label: 'Interested', color: '#2D6B4F', bg: 'rgba(45,107,79,0.08)', border: 'rgba(45,107,79,0.3)' }
                    : p.stage === 'on_hold'
                    ? { label: 'On Hold', color: '#b8892b', bg: 'rgba(184,137,43,0.08)', border: 'rgba(184,137,43,0.3)' }
                    : { label: 'Rejected', color: '#8B2A2A', bg: 'rgba(139,42,42,0.08)', border: 'rgba(139,42,42,0.3)' };
                  return (
                    <button key={p.id} onClick={() => router.push(`/prospects/${p.id}`)}
                      style={{
                        width: '100%', textAlign: 'left', display: 'block',
                        background: 'white', borderRadius: 16,
                        border: `1.5px solid ${dm.border}`,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.05)', padding: 16,
                        animation: `fadeUpIn 0.35s ease-out ${i * 0.06}s both`,
                        cursor: 'pointer', transition: 'box-shadow 0.2s ease',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                        {p.photos?.[0] ? (
                          <img src={p.photos[0]} alt="" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2.5px solid ${dm.color}` }} />
                        ) : (
                          <div style={{ width: 50, height: 50, borderRadius: '50%', flexShrink: 0, background: dm.bg, color: dm.color, border: `2.5px solid ${dm.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800 }}>
                            {cardInitials}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1rem', color: '#1a1410', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </h3>
                          <p style={{ fontSize: '0.72rem', color: '#6b5e4d', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[p.age && `${p.age}`, p.city, p.profession].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 800, padding: '5px 13px', borderRadius: 20, flexShrink: 0,
                          color: dm.color, background: dm.bg, border: `1px solid ${dm.border}`,
                        }}>{dm.label}</span>
                      </div>
                      {overall !== null && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0ebe2', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '0.7rem', color: '#9b8e7e', fontWeight: 500, flexShrink: 0 }}>Match</span>
                          <div style={{ flex: 1, height: 5, background: '#f0ebe2', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${overall}%`, background: `linear-gradient(90deg, ${dm.color}, ${dm.color}aa)`, borderRadius: 3, transition: 'width 0.6s ease' }} />
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: dm.color, fontFamily: 'var(--font-fraunces, Fraunces, serif)', flexShrink: 0 }}>{overall}%</span>
                        </div>
                      )}
                      {p.lastActivityAt && (
                        <p style={{ fontSize: '0.62rem', color: '#b8aaa0', marginTop: 8, textAlign: 'right' }}>{timeAgo(p.lastActivityAt)}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════════════
             PROFILE TAB
        ═══════════════════════════════════════════════════════ */}
        {mainTab === 'profile' && (
          <div style={{ padding: `22px ${isMobile ? 16 : 28}px`, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Profile hero card */}
            <div style={{
              background: 'white', borderRadius: 18, overflow: 'hidden',
              border: '1px solid #ede4d4', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}>
              <div style={{ background: 'linear-gradient(135deg, #1c1108 0%, #2a1a0e 100%)', padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(193,62,42,0.7), rgba(184,137,43,0.5))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', fontWeight: 800, color: '#f5ede0',
                  border: '2px solid rgba(193,62,42,0.5)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }}>{initials(profile.name)}</div>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.3rem', color: '#f5ede0', fontWeight: 700 }}>{profile.name}</h2>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
                    {[profile.age && `${profile.age} yrs`, profile.city, profile.profession].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {([
                  ['Education', profile.education],
                  ['Income', profile.income],
                  ['Diet', profile.diet],
                  ['Manglik', profile.manglik],
                ] as [string, string | undefined][]).filter(([, v]) => v).map(([l, v]) => (
                  <div key={l} style={{ background: '#f5ede0', borderRadius: 10, padding: '10px 12px' }}>
                    <p style={{ fontSize: '0.62rem', color: '#9b8e7e', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{l}</p>
                    <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a1410', marginTop: 3 }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Preferences */}
            {(profile.prefAgeMin || profile.prefCities?.length) && (
              <div style={{ background: 'white', borderRadius: 16, padding: '18px 20px', border: '1px solid #ede4d4', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c13e2a', marginBottom: 14 }}>Preferences</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {profile.prefAgeMin && profile.prefAgeMax && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', color: '#6b5e4d' }}>Age range</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1a1410' }}>{profile.prefAgeMin}–{profile.prefAgeMax} yrs</span>
                    </div>
                  )}
                  {profile.prefCities?.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', color: '#6b5e4d' }}>Cities</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1a1410', textAlign: 'right', maxWidth: '60%' }}>{profile.prefCities.join(', ')}</span>
                    </div>
                  )}
                  {profile.prefIncome && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', color: '#6b5e4d' }}>Min income</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1a1410' }}>{profile.prefIncome} LPA</span>
                    </div>
                  )}
                  {profile.prefFamily && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', color: '#6b5e4d' }}>Family type</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1a1410' }}>{profile.prefFamily}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Journey stats */}
            <div style={{ background: 'white', borderRadius: 16, padding: '18px 20px', border: '1px solid #ede4d4', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c13e2a', marginBottom: 16 }}>Your Journey</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, textAlign: 'center' }}>
                {([
                  { label: 'Total', value: prospects.length, color: '#1a1410' },
                  { label: 'Active', value: prospects.filter(p => p.stage !== 'rejected' && p.stage !== 'on_hold').length, color: '#c13e2a' },
                  { label: 'Interested', value: prospects.filter(p => p.stage === 'interested').length, color: '#2D6B4F' },
                ] as { label: string; value: number; color: string }[]).map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
                    <span style={{ fontSize: '0.65rem', color: '#9b8e7e', fontWeight: 600, letterSpacing: '0.06em' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan status */}
            <PlanCard
              isPaid={profile.isPaid}
              paidAt={profile.paidAt}
              razorpayPaymentId={profile.razorpayPaymentId}
              onUpgradeSuccess={refreshProfile}
            />

            <Link href="/profile" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'white', borderRadius: 14, padding: '16px 20px',
              border: '1px solid #ede4d4', textDecoration: 'none',
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(193,62,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#c13e2a"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>
                </div>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1a1410' }}>Edit Profile & Preferences</span>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#c13e2a"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
            </Link>
          </div>
        )}

        </div>{/* end inner max-w */}
        </div>{/* end scrollable */}

        {/* ── Mobile FAB ── */}
        {isMobile && (mainTab === 'board' || mainTab === 'matches' || mainTab === 'decision') && (
          <Link href="/prospects/new"
            style={{
              position: 'fixed', zIndex: 30, width: 56, height: 56, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1,
              bottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)',
              right: 20, color: '#fff',
              background: 'linear-gradient(135deg, #d44d36, #b83521)',
              boxShadow: '0 6px 24px rgba(193,62,42,0.5)',
            }}>
            +
          </Link>
        )}

        {/* ── Mobile Bottom Nav ── */}
        {isMobile && (
          <nav style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
            background: 'white', borderTop: '1px solid #e8dece',
            height: 'calc(64px + env(safe-area-inset-bottom))',
            paddingBottom: 'env(safe-area-inset-bottom)',
            display: 'flex',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          }}>
            {([
              ['board',    'M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z', 'Board'],
              ['matches',  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', 'Matches'],
              ['decision', 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z', 'Decisions'],
              ['compare',  'M3 5h8v14H3V5zm10 0h8v14h-8V5z', 'Compare'],
              ['profile',  'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z', 'Profile'],
            ] as [MainTab, string, string][]).map(([tab, iconPath, label]) => {
              const isActive = mainTab === tab;
              return (
                <button key={tab} onClick={() => { if (tab === 'compare' && mainTab !== 'compare') setCompareIds([]); setMainTab(tab); }}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 3, cursor: 'pointer', position: 'relative',
                    transition: 'all 0.18s ease',
                  }}>
                  {isActive && (
                    <div style={{
                      position: 'absolute', top: 0, left: '25%', right: '25%', height: 2.5,
                      background: '#c13e2a', borderRadius: '0 0 3px 3px',
                    }} />
                  )}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={isActive ? '#c13e2a' : '#9b8e7e'}>
                    <path d={iconPath} />
                  </svg>
                  <span style={{ fontSize: '0.6rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#c13e2a' : '#9b8e7e' }}>{label}</span>
                  {tab === 'decision' && totalDecisions > 0 && (
                    <span style={{
                      position: 'absolute', top: 4, right: '50%', transform: 'translateX(calc(50% + 9px))',
                      minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                      fontSize: '0.55rem', fontWeight: 800, lineHeight: '16px',
                      background: '#c13e2a', color: 'white', textAlign: 'center',
                    }}>{totalDecisions}</span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>{/* end main column */}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Board Prospect Card — redesigned
══════════════════════════════════════════════════════════════════ */
function BoardProspectCard({ prospect: p, index, onTap }: { prospect: Prospect; index: number; onTap: () => void }) {
  const overall = calculateOverallScore(p.gunaScore, p.compatScore);
  const cardInitials = p.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const progress = stageProgress(p.stage);
  const stageIdx = stageOrderIndex(p.stage);
  const quickAction = STAGE_QUICK_ACTION[p.stage];
  const oc = overall !== null ? scoreColor(overall) : '#c13e2a';

  const decisionBadge = p.stage === 'interested'
    ? { label: 'Interested', color: '#2D6B4F', bg: 'rgba(45,107,79,0.1)' }
    : p.stage === 'on_hold'
    ? { label: 'On Hold', color: '#b8892b', bg: 'rgba(184,137,43,0.1)' }
    : p.stage === 'rejected'
    ? { label: 'Rejected', color: '#8B2A2A', bg: 'rgba(139,42,42,0.1)' }
    : null;

  return (
    <button onClick={onTap} style={{
      width: '100%', textAlign: 'left', display: 'block', cursor: 'pointer',
      background: 'white', borderRadius: 18,
      border: '1px solid #ede4d4',
      boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
      padding: 0, overflow: 'hidden',
      animation: `fadeUpIn 0.4s ease-out ${index * 0.07}s both`,
      transition: 'box-shadow 0.2s ease, transform 0.15s ease',
    }}>

      {/* Top accent bar — gradient showing stage progress */}
      <div style={{ height: 3, background: '#f5ede0', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`,
          background: 'linear-gradient(90deg, #c13e2a, #e06044)',
          borderRadius: '0 2px 2px 0',
          transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        }} />
      </div>

      <div style={{ padding: '16px 18px 14px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {/* Avatar */}
          <div style={{ flexShrink: 0, position: 'relative' }}>
            {p.photos?.[0] ? (
              <img src={p.photos[0]} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover', border: '2px solid #ede4d4' }} />
            ) : (
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(193,62,42,0.12), rgba(184,137,43,0.08))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-fraunces, Fraunces, serif)',
                fontSize: '1.05rem', fontWeight: 800, color: '#c13e2a',
                border: '1.5px solid rgba(193,62,42,0.2)',
              }}>{cardInitials}</div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <h3 style={{
                fontFamily: 'var(--font-fraunces, Fraunces, serif)',
                fontSize: '1rem', fontWeight: 700, color: '#1a1410',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
              }}>{p.name}</h3>
              {overall !== null && (
                <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(214,201,176,0.4)" strokeWidth="3" />
                    <circle cx="20" cy="20" r="16" fill="none" stroke={oc} strokeWidth="3"
                      strokeDasharray={`${2 * Math.PI * 16}`}
                      strokeDashoffset={`${2 * Math.PI * 16 * (1 - overall / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.34,1.56,0.64,1)' }} />
                  </svg>
                  <span style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.56rem', fontWeight: 800, color: oc,
                    fontFamily: 'var(--font-fraunces, Fraunces, serif)',
                  }}>{overall}%</span>
                </div>
              )}
            </div>
            <p style={{ fontSize: '0.73rem', color: '#7a6e62', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {[p.age && `${p.age}`, p.city, p.profession].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* Stage progress row */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.62rem', color: '#9b8e7e', fontWeight: 500, flexShrink: 0 }}>
            Stage {stageIdx + 1}/{STAGE_ORDER.length}
          </span>
          <div style={{ flex: 1, height: 5, background: '#f0e8d8', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'linear-gradient(90deg, #c13e2a, #e0654a)',
              borderRadius: 3, animation: 'barFillIn 0.6s ease-out both',
            }} />
          </div>
          <span style={{ fontSize: '0.62rem', color: '#c13e2a', fontWeight: 700, flexShrink: 0 }}>{progress}%</span>
        </div>

        {/* Decision badge */}
        {decisionBadge && (
          <div style={{ marginTop: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: '0.68rem', fontWeight: 700, padding: '4px 12px', borderRadius: 20,
              color: decisionBadge.color, background: decisionBadge.bg,
            }}>{decisionBadge.label}</span>
          </div>
        )}

        {/* Meta row */}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f5ede0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {(p.greenFlagCount ?? 0) > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#2D6B4F', fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2D6B4F', display: 'inline-block' }} />
              {p.greenFlagCount}
            </span>
          )}
          {(p.redFlagCount ?? 0) > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#8B2A2A', fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8B2A2A', display: 'inline-block' }} />
              {p.redFlagCount}
            </span>
          )}
          {p.gunaScore !== null && p.gunaScore !== undefined && (
            <span style={{ fontSize: '0.72rem', color: '#b8892b', fontWeight: 600 }}>✦ {p.gunaScore}/36</span>
          )}
          {p.source && (
            <span style={{ fontSize: '0.62rem', background: '#f5ede0', color: '#7a6e62', borderRadius: 20, padding: '2px 9px', fontWeight: 500 }}>
              {p.source}
            </span>
          )}
          {(p.conversationCount ?? 0) > 0 && (
            <span style={{ fontSize: '0.72rem', color: '#6b5e4d' }}>💬 {p.conversationCount}</span>
          )}
          {p.lastActivityAt && (
            <span style={{ fontSize: '0.66rem', color: '#b8aaa0', marginLeft: 'auto' }}>{timeAgo(p.lastActivityAt)}</span>
          )}
          {quickAction && (
            <span style={{
              marginLeft: 'auto',
              fontSize: '0.68rem', fontStyle: 'italic',
              fontFamily: 'var(--font-fraunces, Fraunces, serif)',
              color: '#c13e2a', fontWeight: 600,
              padding: '4px 12px', border: '1px solid rgba(193,62,42,0.35)',
              borderRadius: 20, background: 'rgba(193,62,42,0.04)',
            }}>{quickAction}</span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Prospect Card Inner (Matches tab)
══════════════════════════════════════════════════════════════════ */
function ProspectCardInner({ prospect: p, isSelected }: { prospect: Prospect; isSelected: boolean }) {
  const overall = calculateOverallScore(p.gunaScore, p.compatScore);
  const cardInitials = p.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {p.photos?.[0] ? (
        <img src={p.photos[0]} alt="" style={{
          width: 52, height: 52, borderRadius: 14, objectFit: 'cover', flexShrink: 0,
          border: `2px solid ${isSelected ? '#c13e2a' : '#ede4d4'}`,
        }} />
      ) : (
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: isSelected ? 'rgba(193,62,42,0.12)' : 'rgba(193,62,42,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-fraunces, Fraunces, serif)',
          fontSize: '1.05rem', fontWeight: 800, color: '#c13e2a',
          border: `1.5px solid ${isSelected ? 'rgba(193,62,42,0.4)' : 'rgba(193,62,42,0.15)'}`,
        }}>{cardInitials}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <h3 style={{
            fontFamily: 'var(--font-fraunces, Fraunces, serif)',
            fontSize: '1rem', fontWeight: 700, color: '#1a1410',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{p.name}</h3>
          {isSelected && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 800, color: 'white',
              background: '#c13e2a', padding: '2px 8px', borderRadius: 20,
            }}>✓ Selected</span>
          )}
        </div>
        <p style={{ fontSize: '0.73rem', color: '#7a6e62', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[p.age && `${p.age}`, p.city, p.profession].filter(Boolean).join(' · ')}
        </p>
      </div>
      {overall !== null && (
        <div style={{
          flexShrink: 0, minWidth: 44, height: 44, borderRadius: 12,
          background: `${scoreColor(overall)}12`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${scoreColor(overall)}33`,
        }}>
          <span style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '0.8rem', fontWeight: 800, color: scoreColor(overall) }}>{overall}%</span>
        </div>
      )}
    </div>
  );
}
