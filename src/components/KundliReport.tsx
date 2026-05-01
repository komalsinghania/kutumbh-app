'use client';
import { calculateAshtakoot, KootDetail, NAKSHATRA_NAMES, RASHI_SHORT } from '@/lib/kundli';
import { UserProfile } from '@/types';

interface Props {
  userNakshatra: number;
  prospectNakshatra: number;
  userRashi?: number;
  prospectRashi?: number;
  userProfile: UserProfile;
  prospectName: string;
  prospectDob?: string;
  prospectBirthTime?: string;
  prospectBirthPlace?: string;
}

const STATUS_COLOR: Record<string, string> = {
  full: 'text-green-700',
  partial: 'text-[#c13e2a]',
  miss: 'text-red-600',
};
const BAR_COLOR: Record<string, string> = {
  full: 'bg-green-500',
  partial: 'bg-[#c13e2a]',
  miss: 'bg-red-400',
};
const STATUS_ICON: Record<string, string> = {
  full: '✅',
  partial: '🟡',
  miss: '❌',
};

export default function KundliReport({
  userNakshatra,
  prospectNakshatra,
  userRashi,
  prospectRashi,
  userProfile,
  prospectName,
  prospectDob,
  prospectBirthTime,
  prospectBirthPlace,
}: Props) {
  const result = calculateAshtakoot(userNakshatra, prospectNakshatra, userRashi, prospectRashi);
  const { koots, total, interpretation, hasNadiDosha, hasBhakutDosha, hasGanaDosha } = result;

  const scoreColor = total >= 32 ? 'text-green-700' : total >= 24 ? 'text-[#b8892b]' : total >= 18 ? 'text-[#c13e2a]' : 'text-red-600';
  const doshas = [
    hasNadiDosha && { name: 'Nadi Dosha', severity: 'high', desc: 'Same Nadi — can affect health and progeny. Consult a pandit for remedies.' },
    hasBhakutDosha && { name: 'Bhakut Dosha', severity: 'medium', desc: 'Unfavorable Rashi distance — can cause separation or financial issues.' },
    hasGanaDosha && { name: 'Gana Dosha', severity: 'medium', desc: 'Temperament clash between Deva and Rakshasa Gana.' },
  ].filter(Boolean) as { name: string; severity: string; desc: string }[];

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="bg-white rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Kundli Milan</p>
            <p className="text-sm text-gray-500 mt-0.5">{userProfile.name} × {prospectName}</p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${scoreColor}`} style={{ fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)' }}>
              {total}/36
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{interpretation}</div>
          </div>
        </div>

        {/* Score bar */}
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${total >= 32 ? 'bg-green-500' : total >= 24 ? 'bg-[#b8892b]' : total >= 18 ? 'bg-[#c13e2a]' : 'bg-red-400'}`}
            style={{ width: `${(total / 36) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0 — Not recommended</span>
          <span>18 — Avg</span>
          <span>24 — Good</span>
          <span>36 — Excellent</span>
        </div>
      </div>

      {/* Birth details comparison */}
      <div className="bg-white rounded-2xl p-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">Birth Details</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">{userProfile.name} (You)</p>
            <p className="text-sm text-[#1a1410] font-medium">{NAKSHATRA_NAMES[userNakshatra]}</p>
            {userRashi !== undefined && <p className="text-xs text-gray-500">{RASHI_SHORT[userRashi]}</p>}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{prospectName}</p>
            <p className="text-sm text-[#1a1410] font-medium">{NAKSHATRA_NAMES[prospectNakshatra]}</p>
            {prospectRashi !== undefined && <p className="text-xs text-gray-500">{RASHI_SHORT[prospectRashi]}</p>}
            {prospectDob && <p className="text-xs text-gray-400">{prospectDob}</p>}
            {prospectBirthTime && <p className="text-xs text-gray-400">{prospectBirthTime}</p>}
            {prospectBirthPlace && <p className="text-xs text-gray-400">{prospectBirthPlace}</p>}
          </div>
        </div>
      </div>

      {/* Dosha alerts */}
      {doshas.length > 0 && (
        <div className="space-y-2">
          {doshas.map(d => (
            <div key={d.name} className={`rounded-xl p-4 border ${d.severity === 'high' ? 'bg-red-50 border-red-200' : 'bg-[#faf4e8] border-[#d6c9b0]'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span>{d.severity === 'high' ? '⚠️' : '⚡'}</span>
                <span className={`text-sm font-semibold ${d.severity === 'high' ? 'text-red-700' : 'text-[#c13e2a]'}`}>{d.name}</span>
              </div>
              <p className="text-xs text-gray-600">{d.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* 8-koot scorecard */}
      <div className="bg-white rounded-2xl p-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Ashtakoot Scorecard</p>
        <div className="space-y-4">
          {koots.map((k: KootDetail) => (
            <div key={k.name}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-1.5 flex-1 min-w-0">
                  <span className="text-sm shrink-0 mt-px">{STATUS_ICON[k.status]}</span>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className={`text-xs font-semibold ${STATUS_COLOR[k.status]}`}>{k.name}</span>
                      <span className="text-xs text-gray-400">({k.meaning})</span>
                      {k.dosha && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">Dosha</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 leading-snug mt-0.5">{k.detail}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      You: <span className="text-[#1a1410] font-medium">{k.userVal}</span>
                      {' · '}
                      {prospectName}: <span className="text-[#1a1410] font-medium">{k.prospectVal}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-bold ${STATUS_COLOR[k.status]}`}>{k.pts}</span>
                  <span className="text-xs text-gray-300">/{k.maxPts}</span>
                </div>
              </div>
              <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden ml-6">
                <div
                  className={`h-full rounded-full ${BAR_COLOR[k.status]}`}
                  style={{ width: k.maxPts > 0 ? `${(k.pts / k.maxPts) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Total row */}
        <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500 font-semibold">Total Guna Score</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-lg font-bold ${scoreColor}`}>{total}/36</span>
            <span className="text-xs text-gray-400">({interpretation.split('—')[0].trim()})</span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          Kundli Milan is a traditional Vedic compatibility guide. Results are for informational purposes only — mutual understanding, values, and communication matter most.
        </p>
      </div>
    </div>
  );
}
