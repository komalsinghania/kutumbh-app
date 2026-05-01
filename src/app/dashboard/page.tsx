'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { subscribeToProspects, subscribeToActivityLog } from '@/lib/firestore';
import { Prospect, ProspectStage, ActivityEntry } from '@/types';
import {
  calculateOverallScore, getCompatBreakdown, getAshtakootBreakdown, calculateCompatScore, getDealbreakersCheck,
} from '@/lib/scoring';
import { calculateAshtakoot } from '@/lib/kundli';
import CompatBreakdown from '@/components/CompatBreakdown';
import AshtakootBreakdown from '@/components/AshtakootBreakdown';
import ActivityFeed from '@/components/ActivityFeed';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

type MainTab = 'board' | 'matches' | 'timeline' | 'profile';
type MatchSubTab = 'compat' | 'kundli';
type ActivityFilterType = 'all' | 'conversation' | 'flag_green' | 'flag_red' | 'stage_change';
type Nudge = { icon: string; text: string; prospectName: string; prospectId: string; cta: string; };

function timeAgo(ts?: number): string {
  if (!ts) return '';
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
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

const JOURNEY_LABELS: Record<string, string> = {
  new: 'New', photo_exchanged: 'Photos', kundli_sent: 'Kundli', kundli_matched: 'Matched',
  call_done: 'Call', family_call: 'Family', meeting_fixed: 'Meeting', met: 'Met', interested: 'Interested',
};

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

function CircleProgress({ value, size = 36 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#d6c9b0" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#c13e2a" strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
    </svg>
  );
}

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [mainTab, setMainTab] = useState<MainTab>('board');
  const [boardStage, setBoardStage] = useState<ProspectStage>('new');
  const [matchSub, setMatchSub] = useState<MatchSubTab>('compat');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activityFilter, setActivityFilter] = useState<ActivityFilterType>('all');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [showAllNudges, setShowAllNudges] = useState(false);

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleCompare = (id: string) =>
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
    if (!loading && user && !profile) router.replace('/onboarding');
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (!user) return;
    const u1 = subscribeToProspects(user.uid, setProspects);
    const u2 = subscribeToActivityLog(user.uid, setActivity);
    return () => { u1(); u2(); };
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
  const visibleNudges = showAllNudges ? nudges : nudges.slice(0, 3);
  const activeJourneyStages = JOURNEY_STAGES.filter(s => (stageCounts[s] ?? 0) > 0);

  const byCompat = [...prospects].sort((a, b) =>
    (calculateOverallScore(b.gunaScore, b.compatScore) ?? 0) - (calculateOverallScore(a.gunaScore, a.compatScore) ?? 0)
  );
  const byKundli = [...prospects].filter(p => p.gunaScore !== null && p.gunaScore !== undefined).sort((a, b) => (b.gunaScore ?? 0) - (a.gunaScore ?? 0));

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const firstName = profile.name.split(' ')[0];

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: '#f5ede0', overflow: 'hidden' }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="suite-header h-14 flex items-center px-4 justify-between z-20" style={{ flexShrink: 0 }}>
        <Logo className="text-lg" dark />
        <button
          className="flex items-center gap-2"
          style={{ cursor: 'pointer' }}
          onClick={() => setMainTab('profile')}
        >
          <span className="text-sm font-medium" style={{ color: '#ffffff' }}>{firstName}</span>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: '#ffffff', color: '#1a1410', border: '1px solid rgba(255,255,255,0.4)' }}>
            {initials(profile.name)}
          </div>
        </button>
      </header>

      {/* ── Scrollable content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      <div className="max-w-2xl mx-auto" style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom) + 16px)' }}>

        {/* ═══ BOARD ═══ */}
        {mainTab === 'board' && (
          <div>
            {prospects.length === 0 ? (
              /* ── Empty state ─────────────────────────────────────────── */
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                  style={{ background: '#c13e2a' }}>
                  <span style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '2.5rem', color: '#f5ede0', fontStyle: 'italic', letterSpacing: '-0.02em' }}>Rm</span>
                </div>
                <h2 style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.4rem', color: '#1a1410' }} className="font-semibold mb-2">
                  No prospects yet. Add your first.
                </h2>
                <p className="text-sm mb-6" style={{ color: '#6b5e4d' }}>Before every roka, there&apos;s a year of maybes.</p>
                <Link href="/prospects/new" className="btn-primary px-8">+ Add Prospect</Link>
              </div>
            ) : (
              <>
                {/* ── Section 2: Journey Snapshot ─────────────────────── */}
                <div className="px-4 pt-4 pb-2">
                  {/* Journey path */}
                  <div className="overflow-x-auto scrollbar-none" style={{ paddingBottom: 4 }}>
                    <div className="flex items-center" style={{ minWidth: `${JOURNEY_STAGES.length * 68}px`, padding: '4px 2px' }}>
                      {JOURNEY_STAGES.map((s, i) => {
                        const count = stageCounts[s] ?? 0;
                        const hasProsps = count > 0;
                        const dotSize = hasProsps ? Math.min(42, 22 + count * 4) : 22;
                        return (
                          <div key={s} className="flex items-center" style={{ flex: 1 }}>
                            <div className="flex flex-col items-center" style={{ minWidth: dotSize + 8 }}>
                              <button
                                onClick={() => { if (hasProsps) setBoardStage(s); }}
                                style={{
                                  width: dotSize, height: dotSize, borderRadius: '50%',
                                  background: hasProsps ? 'linear-gradient(135deg, #c13e2a, #c13e2a)' : 'transparent',
                                  border: `2px solid ${hasProsps ? '#c13e2a' : '#d6c9b0'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: hasProsps ? 'pointer' : 'default',
                                  flexShrink: 0,
                                  animation: hasProsps ? `fadeUpIn 0.4s ease-out ${i * 0.07}s both` : undefined,
                                  outline: boardStage === s && hasProsps ? '2px solid rgba(193,62,42,0.5)' : undefined,
                                  outlineOffset: 2,
                                }}>
                                <span style={{
                                  fontFamily: 'var(--font-fraunces, Fraunces, serif)',
                                  fontSize: dotSize > 30 ? '0.68rem' : '0.58rem',
                                  fontWeight: 700,
                                  color: hasProsps ? '#1a1410' : '#d6c9b0',
                                }}>
                                  {count}
                                </span>
                              </button>
                              <span style={{ fontSize: '0.5rem', color: '#6b5e4d', marginTop: 3, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                {JOURNEY_LABELS[s] ?? s}
                              </span>
                            </div>
                            {i < JOURNEY_STAGES.length - 1 && (
                              <div style={{
                                flex: 1, height: 1,
                                background: `linear-gradient(90deg, ${hasProsps ? '#c13e2a' : '#d6c9b0'}, #d6c9b0)`,
                                marginBottom: 14,
                                transformOrigin: 'left',
                                animation: `journeyLineDraw 0.8s ease-out ${i * 0.07 + 0.1}s both`,
                              }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Metric cards */}
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div style={{
                      background: 'white', borderRadius: 10, border: '0.5px solid #d6c9b0',
                      borderLeft: '3px solid #c13e2a', padding: '11px 10px',
                      animation: 'fadeUpIn 0.4s ease-out 0.15s both',
                    }}>
                      <div style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.6rem', fontWeight: 700, color: '#1a1410', lineHeight: 1 }}>
                        {prospects.length}
                      </div>
                      <div style={{ fontSize: '0.58rem', color: '#6b5e4d', marginTop: 3 }}>Total Prospects</div>
                      <div style={{ fontSize: '0.52rem', color: '#d6c9b0', marginTop: 1 }}>across {activeJourneyStages.length} stages</div>
                    </div>

                    <div style={{
                      background: 'white', borderRadius: 10, border: '0.5px solid #d6c9b0',
                      borderLeft: '3px solid #c13e2a', padding: '11px 10px',
                      animation: 'fadeUpIn 0.4s ease-out 0.25s both',
                    }}>
                      {bestMatch && bestMatchScore !== null ? (
                        <>
                          <div style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.6rem', fontWeight: 700, color: '#c13e2a', lineHeight: 1 }}>
                            {bestMatchScore}%
                          </div>
                          <div style={{ fontSize: '0.58rem', color: '#6b5e4d', marginTop: 3 }}>Best Match</div>
                          <div style={{ fontSize: '0.52rem', color: '#d6c9b0', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {bestMatch.name.split(' ')[0]}
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.6rem', fontWeight: 700, color: '#d6c9b0', lineHeight: 1 }}>—</div>
                          <div style={{ fontSize: '0.58rem', color: '#6b5e4d', marginTop: 3 }}>Best Match</div>
                          <div style={{ fontSize: '0.52rem', color: '#d6c9b0', marginTop: 1 }}>No scores yet</div>
                        </>
                      )}
                    </div>

                    <div style={{
                      background: 'white', borderRadius: 10, border: '0.5px solid #d6c9b0',
                      borderLeft: '3px solid #c13e2a', padding: '11px 10px',
                      animation: 'fadeUpIn 0.4s ease-out 0.35s both',
                    }}>
                      <div className="flex items-start gap-1">
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.6rem', fontWeight: 700, color: '#1a1410', lineHeight: 1 }}>
                            {avgCompat !== null ? `${avgCompat}%` : '—'}
                          </div>
                          <div style={{ fontSize: '0.58rem', color: '#6b5e4d', marginTop: 3 }}>Avg Compat</div>
                        </div>
                        {avgCompat !== null && <CircleProgress value={avgCompat} size={34} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Section 3: Needs Attention ──────────────────────── */}
                <div className="px-4 pb-3">
                  <p className="section-label mb-2">Needs Attention</p>
                  {nudges.length === 0 ? (
                    <div style={{ background: '#faf4e8', borderRadius: 10, padding: '11px 14px', border: '0.5px solid #d6c9b0', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1rem' }}>✅</span>
                      <span style={{ fontSize: '0.78rem', color: '#6b5e4d' }}>All caught up! No pending actions.</span>
                    </div>
                  ) : (
                    <>
                      {visibleNudges.map((nudge, i) => (
                        <button key={`${nudge.prospectId}-${i}`}
                          onClick={() => router.push(`/prospects/${nudge.prospectId}`)}
                          className="w-full text-left mb-2"
                          style={{
                            background: '#faf4e8', borderRadius: 10, padding: '10px 14px',
                            border: '0.5px solid #d6c9b0', borderLeft: '3px solid #c13e2a',
                            display: 'flex', alignItems: 'center', gap: 10,
                            animation: `slideInRight 0.35s ease-out ${i * 0.08}s both`,
                          }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>{nudge.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1a1410' }}>{nudge.prospectName}</div>
                            <div style={{ fontSize: '0.68rem', color: '#6b5e4d', marginTop: 1 }}>{nudge.text}</div>
                          </div>
                          <span style={{
                            fontSize: '0.62rem', color: '#c13e2a', fontWeight: 600, flexShrink: 0,
                            fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontStyle: 'italic',
                          }}>{nudge.cta}</span>
                        </button>
                      ))}
                      {nudges.length > 3 && (
                        <button onClick={() => setShowAllNudges(v => !v)}
                          style={{ fontSize: '0.7rem', color: '#c13e2a', fontWeight: 600, padding: '4px 0' }}>
                          {showAllNudges ? 'Show less ▲' : `See all ${nudges.length} →`}
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* ── Section 4: Stage Tabs ────────────────────────────── */}
                <div className="flex overflow-x-auto scrollbar-none px-4 pt-1 pb-0 gap-1 sticky top-0 z-10 bg-[#f5ede0]"
                  style={{ borderBottom: '1px solid #d6c9b0' }}>
                  {activeStageTabs.map(s => (
                    <button key={s} onClick={() => setBoardStage(s)}
                      className="shrink-0 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors"
                      style={{
                        color: boardStage === s ? '#c13e2a' : '#6b5e4d',
                        borderBottom: `2px solid ${boardStage === s ? '#c13e2a' : 'transparent'}`,
                        marginBottom: -1,
                      }}>
                      {STAGE_TAB_LABELS[s]} <span style={{ color: boardStage === s ? '#c13e2a' : '#d6c9b0', fontWeight: 400 }}>({stageCounts[s]})</span>
                    </button>
                  ))}
                </div>

                <div className="px-4 pt-3 space-y-3">
                  {boardProspects.length === 0 && (
                    <div className="text-center py-10" style={{ color: '#6b5e4d' }}>No prospects in this stage.</div>
                  )}
                  {boardProspects.map((p, i) => (
                    <BoardProspectCard key={p.id} prospect={p} index={i} onTap={() => router.push(`/prospects/${p.id}`)} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ MATCHES ═══ */}
        {mainTab === 'matches' && (
          <div>
            <div className="flex items-center justify-between px-4 pt-3 pb-0 sticky top-0 z-10 bg-[#f5ede0]"
              style={{ borderBottom: '1px solid #d6c9b0' }}>
              <div className="flex gap-1">
                {(['compat', 'kundli'] as MatchSubTab[]).map(sub => (
                  <button key={sub} onClick={() => setMatchSub(sub)}
                    className="px-4 py-2.5 text-xs font-semibold transition-colors"
                    style={{
                      color: matchSub === sub ? '#c13e2a' : '#6b5e4d',
                      borderBottom: `2px solid ${matchSub === sub ? '#c13e2a' : 'transparent'}`,
                      marginBottom: -1,
                    }}>
                    {sub === 'compat' ? 'By Compatibility' : 'By Kundli'}
                  </button>
                ))}
              </div>
              {compareMode ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#6b5e4d' }}>{compareIds.length}/3</span>
                  {compareIds.length >= 2 && (
                    <button className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ background: '#c13e2a', color: '#1a1410' }}
                      onClick={() => router.push(`/compare?ids=${compareIds.join(',')}`)}>
                      Compare
                    </button>
                  )}
                  <button className="text-xs" style={{ color: '#6b5e4d' }}
                    onClick={() => { setCompareMode(false); setCompareIds([]); }}>Cancel</button>
                </div>
              ) : (
                <button className="text-xs font-semibold" style={{ color: '#c13e2a' }} onClick={() => setCompareMode(true)}>Compare</button>
              )}
            </div>

            <div className="px-4 pt-3 space-y-2.5">
              {matchSub === 'compat' && (
                byCompat.length === 0
                  ? <p className="text-center py-10 text-sm" style={{ color: '#6b5e4d' }}>Add birth details to see kundli scores.</p>
                  : byCompat.map(p => {
                    const overall = calculateOverallScore(p.gunaScore, p.compatScore);
                    const isSelected = compareIds.includes(p.id);
                    return (
                      <div key={p.id}>
                        <div style={{ border: isSelected ? '2px solid #c13e2a' : '0.5px solid #d6c9b0', borderRadius: 12, background: 'white', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                          <div className="p-4" onClick={() => compareMode ? toggleCompare(p.id) : router.push(`/prospects/${p.id}`)}>
                            <ProspectCardInner prospect={p} isSelected={isSelected} />
                          </div>
                          <div className="px-4 pb-3 flex items-center justify-between">
                            <div className="text-xs" style={{ color: '#6b5e4d' }}>
                              {overall !== null ? <span className="font-semibold" style={{ color: '#c13e2a' }}>{overall}% match</span> : 'No score'}
                              {p.compatScore !== null && ` · ${p.compatScore}% compat`}
                            </div>
                            <button className="text-xs font-semibold" style={{ color: '#c13e2a' }}
                              onClick={e => { e.stopPropagation(); toggleExpand(p.id); }}>
                              {expanded.has(p.id) ? 'Hide ▲' : 'Why? ▼'}
                            </button>
                          </div>
                          {expanded.has(p.id) && profile && (
                            <div className="px-4 pb-4 pt-1" style={{ borderTop: '1px solid #d6c9b0' }}>
                              <CompatBreakdown criteria={getCompatBreakdown(profile, p)} total={p.compatScore ?? calculateCompatScore(profile, p)} dealbreakersCheck={getDealbreakersCheck(profile, p)} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}

              {matchSub === 'kundli' && (
                byKundli.length === 0
                  ? <p className="text-center py-10 text-sm" style={{ color: '#6b5e4d' }}>
                      Add birth details to see kundli scores.
                    </p>
                  : byKundli.map(p => {
                    const isSelected = compareIds.includes(p.id);
                    const hasProfile = profile?.nakshatra !== undefined && profile.nakshatra >= 0;
                    return (
                      <div key={p.id}>
                        <div style={{ border: isSelected ? '2px solid #c13e2a' : '0.5px solid #d6c9b0', borderRadius: 12, background: 'white', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                          <div className="p-4" onClick={() => compareMode ? toggleCompare(p.id) : router.push(`/prospects/${p.id}`)}>
                            <ProspectCardInner prospect={p} isSelected={isSelected} />
                          </div>
                          <div className="px-4 pb-3 flex items-center justify-between">
                            <div className="text-xs" style={{ color: '#6b5e4d' }}>
                              <span className="font-semibold" style={{ color: '#b8892b' }}>{p.gunaScore}/36 gunas</span>
                              {hasProfile && p.nakshatra !== undefined && (() => {
                                const r = calculateAshtakoot(profile.nakshatra, p.nakshatra!, profile.rashiIndex, p.rashiIndex);
                                const doshas = [r.hasNadiDosha && 'Nadi', r.hasBhakutDosha && 'Bhakut', r.hasGanaDosha && 'Gana'].filter(Boolean);
                                return doshas.length > 0
                                  ? <span style={{ color: '#8B2A2A' }}> · {doshas.join(', ')} dosha</span>
                                  : <span style={{ color: '#2D6B4F' }}> · No major dosha</span>;
                              })()}
                            </div>
                            {hasProfile && p.nakshatra !== undefined && (
                              <button className="text-xs font-semibold" style={{ color: '#c13e2a' }}
                                onClick={e => { e.stopPropagation(); toggleExpand(p.id); }}>
                                {expanded.has(p.id) ? 'Hide ▲' : 'Kundli ▼'}
                              </button>
                            )}
                          </div>
                          {expanded.has(p.id) && hasProfile && p.nakshatra !== undefined && (
                            <div className="px-4 pb-4 pt-1" style={{ borderTop: '1px solid #d6c9b0' }}>
                              <AshtakootBreakdown koots={getAshtakootBreakdown(profile.nakshatra, p.nakshatra)} total={p.gunaScore ?? 0} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* ═══ TIMELINE ═══ */}
        {mainTab === 'timeline' && (
          <div className="px-4 pt-3">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mb-3">
              {([['all', 'All'], ['conversation', '💬 Calls'], ['flag_green', '💚 Green'], ['flag_red', '🚩 Red'], ['stage_change', '➡️ Stages']] as [ActivityFilterType, string][]).map(([f, label]) => (
                <button key={f} onClick={() => setActivityFilter(f)}
                  className="shrink-0 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all"
                  style={activityFilter === f
                    ? { background: '#c13e2a', color: '#1a1410', border: 'none' }
                    : { background: 'white', color: '#6b5e4d', borderColor: '#d6c9b0' }}>
                  {label}
                </button>
              ))}
            </div>
            <ActivityFeed entries={activity} filterType={activityFilter} />
          </div>
        )}

        {/* ═══ PROFILE ═══ */}
        {mainTab === 'profile' && (
          <div className="px-4 pt-4 space-y-3">
            <div className="card p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                  style={{ background: 'rgba(193,62,42,0.12)', color: '#c13e2a', border: '2px solid rgba(193,62,42,0.3)' }}>
                  {initials(profile.name)}
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.2rem', color: '#1a1410' }} className="font-semibold">{profile.name}</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#6b5e4d' }}>{profile.age} · {profile.city} · {profile.profession}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ['Education', profile.education],
                  ['Income', profile.income],
                  ['Diet', profile.diet],
                  ['Manglik', profile.manglik],
                ].filter(([, v]) => v).map(([l, v]) => (
                  <div key={l} className="rounded-lg py-2 px-3" style={{ background: '#f5ede0' }}>
                    <p className="text-xs" style={{ color: '#6b5e4d' }}>{l}</p>
                    <p className="font-medium text-xs mt-0.5" style={{ color: '#1a1410' }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {(profile.prefAgeMin || profile.prefCities?.length) && (
              <div className="card p-5">
                <p className="section-label mb-3">Preferences</p>
                <div className="space-y-2 text-sm">
                  {profile.prefAgeMin && profile.prefAgeMax && (
                    <div className="flex justify-between">
                      <span style={{ color: '#6b5e4d' }}>Age range</span>
                      <span style={{ color: '#1a1410' }} className="font-medium">{profile.prefAgeMin}–{profile.prefAgeMax} yrs</span>
                    </div>
                  )}
                  {profile.prefCities?.length > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: '#6b5e4d' }}>Cities</span>
                      <span style={{ color: '#1a1410' }} className="font-medium text-right">{profile.prefCities.join(', ')}</span>
                    </div>
                  )}
                  {profile.prefIncome && (
                    <div className="flex justify-between">
                      <span style={{ color: '#6b5e4d' }}>Min income</span>
                      <span style={{ color: '#1a1410' }} className="font-medium">{profile.prefIncome} LPA</span>
                    </div>
                  )}
                  {profile.prefFamily && (
                    <div className="flex justify-between">
                      <span style={{ color: '#6b5e4d' }}>Family type</span>
                      <span style={{ color: '#1a1410' }} className="font-medium">{profile.prefFamily}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="card p-5">
              <p className="section-label mb-3">Your Journey</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Prospects', value: prospects.length },
                  { label: 'Active', value: prospects.filter(p => p.stage !== 'rejected' && p.stage !== 'on_hold').length },
                  { label: 'Interested', value: prospects.filter(p => p.stage === 'interested').length },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.75rem', color: '#c13e2a' }} className="font-semibold leading-none">{value}</div>
                    <div className="text-xs mt-1" style={{ color: '#6b5e4d' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/profile" className="card p-4 flex items-center justify-between" style={{ textDecoration: 'none' }}>
              <span className="font-medium text-sm" style={{ color: '#1a1410' }}>Edit Profile & Preferences</span>
              <span style={{ color: '#c13e2a' }}>›</span>
            </Link>

            <button onClick={() => signOut(auth).then(() => router.replace('/'))}
              className="w-full card p-4 flex items-center justify-between text-left">
              <span className="font-medium text-sm" style={{ color: '#8B2A2A' }}>Sign Out</span>
              <span style={{ color: '#8B2A2A' }}>›</span>
            </button>
          </div>
        )}
      </div>
      </div>

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      {(mainTab === 'board' || mainTab === 'matches') && (
        <Link href="/prospects/new"
          className="fixed z-30 w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold transition-transform active:scale-95"
          style={{
            bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)',
            right: 20,
            background: '#c13e2a',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(193,62,42,0.45)',
          }}>
          +
        </Link>
      )}

      {/* ── Bottom Tab Bar ──────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex"
        style={{
          background: 'white',
          borderTop: '0.5px solid #d6c9b0',
          height: 'calc(56px + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
        {([
          ['board',    '⊞',  'Board'],
          ['matches',  '♡',  'Matches'],
          ['timeline', '◷',  'Timeline'],
          ['profile',  '◎',  'Profile'],
        ] as [MainTab, string, string][]).map(([tab, icon, label]) => (
          <button key={tab} onClick={() => setMainTab(tab)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
            style={{ color: mainTab === tab ? '#c13e2a' : '#6b5e4d' }}>
            <span className="text-xl leading-none">{icon}</span>
            <span className="text-[10px] font-semibold">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ── Board Prospect Card ──────────────────────────────────────────────────── */

function BoardProspectCard({ prospect: p, index, onTap }: { prospect: Prospect; index: number; onTap: () => void }) {
  const overall = calculateOverallScore(p.gunaScore, p.compatScore);
  const cardInitials = p.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const progress = stageProgress(p.stage);
  const stageIdx = stageOrderIndex(p.stage);
  const quickAction = STAGE_QUICK_ACTION[p.stage];

  return (
    <button onClick={onTap} className="w-full text-left"
      style={{
        background: 'white', borderRadius: 12, border: '0.5px solid #d6c9b0',
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)', padding: 14, display: 'block',
        animation: `fadeUpIn 0.35s ease-out ${index * 0.06}s both`,
      }}>

      {/* Top row */}
      <div className="flex items-center gap-3">
        {p.photos?.[0] ? (
          <img src={p.photos[0]} alt="" className="shrink-0 rounded-full object-cover"
            style={{ width: 44, height: 44, border: '1.5px solid #d6c9b0' }} />
        ) : (
          <div className="shrink-0 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ width: 44, height: 44, background: 'rgba(193,62,42,0.1)', color: '#c13e2a', border: '1.5px solid rgba(193,62,42,0.25)' }}>
            {cardInitials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="truncate font-semibold"
            style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '0.95rem', color: '#1a1410' }}>
            {p.name}
          </h3>
          <p className="text-xs truncate mt-0.5" style={{ color: '#6b5e4d' }}>
            {[p.age && `${p.age}`, p.city, p.profession].filter(Boolean).join(' · ')}
          </p>
        </div>
        {overall !== null && (
          <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(193,62,42,0.1)', border: '1.5px solid rgba(193,62,42,0.3)' }}>
            <span style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '0.7rem', fontWeight: 700, color: '#c13e2a' }}>{overall}%</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: '0.5px', background: '#d6c9b0', margin: '10px 0 8px' }} />

      {/* Stage progress bar */}
      <div style={{ height: 4, background: '#d6c9b0', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'linear-gradient(90deg, #c13e2a, #c13e2a)',
          borderRadius: 2, transformOrigin: 'left',
          animation: 'barFillIn 0.5s ease-out both',
        }} />
      </div>
      <div style={{ fontSize: '0.56rem', color: '#d6c9b0', marginTop: 3 }}>
        Stage {stageIdx + 1} of {STAGE_ORDER.length}
      </div>

      {/* Divider */}
      <div style={{ height: '0.5px', background: '#d6c9b0', margin: '8px 0' }} />

      {/* Flags + metadata */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {(p.greenFlagCount ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#2D6B4F' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#2D6B4F' }} />
            {p.greenFlagCount}
          </span>
        )}
        {(p.redFlagCount ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#8B2A2A' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#8B2A2A' }} />
            {p.redFlagCount}
          </span>
        )}
        {p.gunaScore !== null && p.gunaScore !== undefined && (
          <span className="text-xs" style={{ color: '#b8892b' }}>⭐ {p.gunaScore}/36</span>
        )}
        {p.source && (
          <span style={{ fontSize: '0.6rem', background: '#faf4e8', color: '#6b5e4d', borderRadius: 99, padding: '2px 7px' }}>
            {p.source}
          </span>
        )}
        {(p.conversationCount ?? 0) > 0 && (
          <span className="text-xs" style={{ color: '#6b5e4d' }}>💬 {p.conversationCount}</span>
        )}
        {p.lastActivityAt && (
          <span className="text-xs ml-auto" style={{ color: '#d6c9b0' }}>{timeAgo(p.lastActivityAt)}</span>
        )}
      </div>

      {/* Quick action */}
      {quickAction && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <span style={{
            fontSize: '0.62rem',
            fontFamily: 'var(--font-fraunces, Fraunces, serif)',
            fontStyle: 'italic',
            color: '#c13e2a',
            border: '1px solid rgba(193,62,42,0.5)',
            borderRadius: 6,
            padding: '3px 10px',
          }}>
            {quickAction}
          </span>
        </div>
      )}
    </button>
  );
}

/* ── Prospect Card Inner (Matches tab) ───────────────────────────────────── */

function ProspectCardInner({ prospect: p, isSelected }: { prospect: Prospect; isSelected: boolean }) {
  const overall = calculateOverallScore(p.gunaScore, p.compatScore);
  const cardInitials = p.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      {p.photos?.[0] ? (
        <img src={p.photos[0]} alt="" className="shrink-0 rounded-full object-cover"
          style={{ width: 48, height: 48, border: '1.5px solid #d6c9b0' }} />
      ) : (
        <div className="shrink-0 rounded-full flex items-center justify-center text-sm font-semibold"
          style={{ width: 48, height: 48, background: 'rgba(193,62,42,0.1)', color: '#c13e2a', border: '1.5px solid rgba(193,62,42,0.25)' }}>
          {cardInitials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-semibold"
            style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1rem', color: '#1a1410' }}>
            {p.name}
          </h3>
          {isSelected && <span className="text-xs font-bold shrink-0" style={{ color: '#c13e2a' }}>✓</span>}
        </div>
        <p className="text-xs truncate mt-0.5" style={{ color: '#6b5e4d' }}>
          {[p.age && `${p.age}`, p.city, p.profession].filter(Boolean).join(' · ')}
        </p>
      </div>
      {overall !== null && (
        <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(193,62,42,0.1)', border: '1.5px solid rgba(193,62,42,0.3)' }}>
          <span style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '0.75rem', fontWeight: 700, color: '#c13e2a' }}>{overall}%</span>
        </div>
      )}
    </div>
  );
}
