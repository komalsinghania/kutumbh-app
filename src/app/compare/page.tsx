'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getProspect } from '@/lib/firestore';
import { Prospect, STAGE_LABELS, NAKSHATRAS } from '@/types';
import { calculateOverallScore } from '@/lib/scoring';
import { calculateAshtakoot } from '@/lib/kundli';
import StarRating from '@/components/StarRating';

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

function CompareContent() {
  const { user, profile } = useAuth();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F9F6F0' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="logo text-4xl">कुटुम्भ</div>
          <div className="gold-spinner" />
        </div>
      </div>
    );
  }

  if (prospects.length < 2) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F9F6F0' }}>
        <div className="text-center">
          <p style={{ color: '#9A8A75' }}>Select 2–3 prospects to compare.</p>
          <button onClick={() => router.back()} className="btn-primary mt-4">Go Back</button>
        </div>
      </div>
    );
  }

  const overalls = prospects.map(p => calculateOverallScore(p.gunaScore, p.compatScore));
  const bestOverall = Math.max(...overalls.filter(s => s !== null) as number[]);
  const bestKundli = Math.max(...prospects.map(p => p.gunaScore ?? 0));
  const bestCompat = Math.max(...prospects.map(p => p.compatScore ?? 0));
  const bestGreen = Math.max(...prospects.map(p => p.greenFlagCount ?? 0));
  const bestFamily = Math.max(...prospects.map(p => p.familyScore ?? 0));
  const bestConv = Math.max(...prospects.map(p => p.conversationCount ?? 0));

  type Row = { label: string; getValue: (p: Prospect) => React.ReactNode; isBest?: (p: Prospect) => boolean };

  const rows: Row[] = [
    {
      label: 'Overall Score',
      getValue: p => { const s = calculateOverallScore(p.gunaScore, p.compatScore); return s !== null ? `${s}%` : '—'; },
      isBest: p => { const s = calculateOverallScore(p.gunaScore, p.compatScore); return s === bestOverall && s !== null; },
    },
    {
      label: 'Kundli Score',
      getValue: p => p.gunaScore !== null ? `${p.gunaScore}/36` : '—',
      isBest: p => p.gunaScore === bestKundli && p.gunaScore !== null,
    },
    {
      label: 'Compatibility',
      getValue: p => p.compatScore !== null ? `${p.compatScore}%` : '—',
      isBest: p => p.compatScore === bestCompat && p.compatScore !== null,
    },
    {
      label: 'Doshas',
      getValue: p => {
        if (!profile || profile.nakshatra < 0 || p.nakshatra === undefined) return '—';
        const r = calculateAshtakoot(profile.nakshatra, p.nakshatra, profile.rashiIndex, p.rashiIndex);
        const doshas = [r.hasNadiDosha && 'Nadi', r.hasBhakutDosha && 'Bhakut', r.hasGanaDosha && 'Gana'].filter(Boolean);
        return doshas.length === 0 ? '✅ None' : `⚠️ ${doshas.join(', ')}`;
      },
      isBest: p => {
        if (!profile || profile.nakshatra < 0 || p.nakshatra === undefined) return false;
        const r = calculateAshtakoot(profile.nakshatra, p.nakshatra, profile.rashiIndex, p.rashiIndex);
        return !r.hasNadiDosha && !r.hasBhakutDosha && !r.hasGanaDosha;
      },
    },
    {
      label: 'Nakshatra',
      getValue: p => p.nakshatra !== undefined ? NAKSHATRAS[p.nakshatra] : '—',
    },
    {
      label: 'Green Flags',
      getValue: p => (p.greenFlagCount ?? 0) > 0 ? `+${p.greenFlagCount}` : '—',
      isBest: p => (p.greenFlagCount ?? 0) > 0 && (p.greenFlagCount ?? 0) === bestGreen,
    },
    {
      label: 'Red Flags',
      getValue: p => (p.redFlagCount ?? 0) > 0 ? `${p.redFlagCount}` : '0',
      isBest: p => (p.redFlagCount ?? 0) === Math.min(...prospects.map(x => x.redFlagCount ?? 0)),
    },
    {
      label: 'Family Score',
      getValue: p => p.familyScore ? (
        <span className="flex items-center gap-1 justify-center">
          <StarRating value={Math.round(p.familyScore)} size="sm" color="#C4A265" />
          <span className="text-xs" style={{ color: '#9A8A75' }}>{p.familyScore}</span>
        </span>
      ) : '—',
      isBest: p => !!p.familyScore && p.familyScore === bestFamily,
    },
    {
      label: 'Conversations',
      getValue: p => (p.conversationCount ?? 0) > 0 ? `💬 ${p.conversationCount}` : '—',
      isBest: p => (p.conversationCount ?? 0) > 0 && (p.conversationCount ?? 0) === bestConv,
    },
    {
      label: 'Last Activity',
      getValue: p => timeAgo(p.lastActivityAt),
    },
    {
      label: 'Age',
      getValue: p => p.age ? `${p.age} yrs` : '—',
    },
    {
      label: 'City',
      getValue: p => p.city || '—',
    },
    {
      label: 'Education',
      getValue: p => p.education || '—',
    },
    {
      label: 'Income',
      getValue: p => p.income || '—',
    },
    {
      label: 'Diet',
      getValue: p => p.diet || '—',
    },
    {
      label: 'Manglik',
      getValue: p => p.manglik || '—',
    },
    {
      label: 'Days Since Added',
      getValue: p => `${daysSince(p.createdAt)}d`,
    },
    {
      label: 'Stage',
      getValue: p => STAGE_LABELS[p.stage] || '—',
    },
    {
      label: 'Source',
      getValue: p => p.source || '—',
    },
  ];

  // Rule-based summary
  const summaryParts: string[] = [];
  const sorted = [...prospects].sort((a, b) => {
    const aScore = calculateOverallScore(a.gunaScore, a.compatScore) ?? 0;
    const bScore = calculateOverallScore(b.gunaScore, b.compatScore) ?? 0;
    return bScore - aScore;
  });
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

  return (
    <div className="min-h-screen pb-10" style={{ background: '#F9F6F0', overflowY: 'auto' }}>
      <div className="suite-header px-4 flex items-center gap-3 sticky top-0 z-10" style={{ height: 56 }}>
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full" style={{ color: 'rgba(249,246,240,0.8)' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontFamily: 'var(--font-playfair, Playfair Display, Georgia, serif)', color: '#F9F6F0', fontStyle: 'italic', fontSize: '1.125rem' }} className="font-bold">Help Me Decide</h1>
      </div>

      <div className="max-w-2xl mx-auto px-3 pt-5 space-y-5">
        {/* Names header */}
        <div className="grid mb-2" style={{ gridTemplateColumns: `130px repeat(${prospects.length}, 1fr)` }}>
          <div />
          {prospects.map(p => (
            <div key={p.id} className="text-center px-1">
              <p style={{ fontFamily: 'var(--font-playfair, Playfair Display, Georgia, serif)', color: '#1C1612' }} className="font-semibold text-sm leading-tight">{p.name}</p>
              <p className="text-xs" style={{ color: '#9A8A75' }}>{p.age} • {p.city}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid #E8DFD3', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          {rows.map((row, ri) => (
            <div key={row.label}
              className="grid items-center"
              style={{ gridTemplateColumns: `130px repeat(${prospects.length}, 1fr)`, background: ri % 2 === 0 ? 'white' : '#F9F6F0' }}>
              <div className="px-3 py-3 text-xs font-semibold" style={{ color: '#C4A265' }}>{row.label}</div>
              {prospects.map(p => {
                const val = row.getValue(p);
                const best = row.isBest?.(p) ?? false;
                return (
                  <div key={p.id} className="px-2 py-3 text-center text-sm font-medium rounded"
                    style={{ background: best ? 'rgba(196,162,101,0.1)' : 'transparent', color: best ? '#C4A265' : '#1C1612' }}>
                    {best && typeof val === 'string' && <span className="mr-1">★</span>}{val}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Summary */}
        {summaryParts.length > 0 && (
          <div className="card p-5" style={{ borderColor: '#C4A265', borderWidth: '1.5px' }}>
            <p className="section-label mb-2">Summary</p>
            {summaryParts.map((s, i) => (
              <p key={i} className="text-sm leading-relaxed mb-1" style={{ color: '#1C1612' }}>• {s}</p>
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F9F6F0' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="logo text-4xl">कुटुम्भ</div>
          <div className="gold-spinner" />
        </div>
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
