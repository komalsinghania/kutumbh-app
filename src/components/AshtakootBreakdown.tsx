'use client';
import { KootScore, MatchStatus } from '@/lib/scoring';

const STATUS_ICON: Record<MatchStatus, string> = { full: '✅', partial: '🟡', miss: '❌' };
const STATUS_COLOR: Record<MatchStatus, string> = {
  full: 'text-green-700',
  partial: 'text-[#c13e2a]',
  miss: 'text-red-600',
};
const BAR_COLOR: Record<MatchStatus, string> = {
  full: 'bg-green-500',
  partial: 'bg-[#c13e2a]',
  miss: 'bg-red-400',
};

export default function AshtakootBreakdown({
  koots,
  total,
}: {
  koots: KootScore[];
  total: number;
}) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ashtakoot Breakdown</p>

      {koots.map(k => (
        <div key={k.name}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 flex-1 min-w-0">
              <span className="text-sm shrink-0 mt-px">{STATUS_ICON[k.status]}</span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xs font-semibold ${STATUS_COLOR[k.status]}`}>{k.name}</span>
                  <span className="text-xs text-gray-400">({k.meaning})</span>
                </div>
                <p className="text-xs text-gray-500 leading-snug mt-0.5">{k.detail}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  You: <span className="text-[#1a1410] font-medium">{k.userVal}</span>
                  {' · '}
                  Prospect: <span className="text-[#1a1410] font-medium">{k.prospectVal}</span>
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className={`text-xs font-bold ${STATUS_COLOR[k.status]}`}>
                {k.pts}
              </span>
              <span className="text-xs text-gray-300">/{k.maxPts}</span>
            </div>
          </div>
          <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden ml-6">
            <div
              className={`h-full rounded-full ${BAR_COLOR[k.status]}`}
              style={{ width: `${(k.pts / k.maxPts) * 100}%` }}
            />
          </div>
        </div>
      ))}

      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-500 font-medium">Total Guna Score</span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-bold text-[#b8892b]">{total}/36</span>
          <span className="text-xs text-gray-400">
            ({total >= 28 ? 'Excellent' : total >= 21 ? 'Good' : total >= 18 ? 'Average' : 'Below average'})
          </span>
        </div>
      </div>
    </div>
  );
}
