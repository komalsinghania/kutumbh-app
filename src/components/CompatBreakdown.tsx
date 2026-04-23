'use client';
import { CompatCriterion, DealbreakersCheckItem, MatchStatus } from '@/lib/scoring';

const STATUS_ICON: Record<MatchStatus, string> = { full: '✅', partial: '🟡', miss: '❌' };
const STATUS_COLOR: Record<MatchStatus, string> = {
  full: 'text-green-700',
  partial: 'text-yellow-700',
  miss: 'text-red-600',
};
const BAR_COLOR: Record<MatchStatus, string> = {
  full: 'bg-green-500',
  partial: 'bg-yellow-400',
  miss: 'bg-red-400',
};

export default function CompatBreakdown({
  criteria,
  total,
  dealbreakersCheck,
}: {
  criteria: CompatCriterion[];
  total: number;
  dealbreakersCheck?: DealbreakersCheckItem[];
}) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Compatibility Breakdown</p>

      {criteria.map(c => (
        <div key={c.label}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 flex-1 min-w-0">
              <span className="text-sm shrink-0 mt-px">{STATUS_ICON[c.status]}</span>
              <div className="min-w-0">
                <span className={`text-xs font-semibold ${STATUS_COLOR[c.status]}`}>{c.label}</span>
                <p className="text-xs text-gray-500 leading-snug mt-0.5">{c.detail}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  You: <span className="text-[#3D2B1F] font-medium">{c.userVal}</span>
                  {' · '}
                  Prospect: <span className="text-[#3D2B1F] font-medium">{c.prospectVal}</span>
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className={`text-xs font-bold ${STATUS_COLOR[c.status]}`}>
                +{c.pts}
              </span>
              <span className="text-xs text-gray-300">/{c.maxPts}</span>
            </div>
          </div>
          <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden ml-6">
            <div
              className={`h-full rounded-full ${BAR_COLOR[c.status]}`}
              style={{ width: `${(c.pts / c.maxPts) * 100}%` }}
            />
          </div>
        </div>
      ))}

      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-500 font-medium">Total Compatibility</span>
        <span className="text-sm font-bold text-[#A0522D]">{total}%</span>
      </div>

      {dealbreakersCheck && dealbreakersCheck.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Non-Negotiables Check</p>
          <div className="space-y-1.5">
            {dealbreakersCheck.map(item => (
              <div key={item.label} className="flex items-start gap-1.5">
                <span className="text-sm shrink-0 mt-px">{item.met ? '✅' : '❌'}</span>
                <div className="min-w-0">
                  <span className={`text-xs font-semibold ${item.met ? 'text-green-700' : 'text-red-600'}`}>
                    {item.label}
                  </span>
                  <p className="text-xs text-gray-500 leading-snug">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
