'use client';
import { useRouter } from 'next/navigation';
import { ActivityEntry, ActivityType } from '@/types';

const TYPE_ICON: Record<ActivityType, string> = {
  added: '✨',
  stage_change: '➡️',
  conversation: '💬',
  flag_green: '💚',
  flag_red: '🚩',
  family_score: '⭐',
  meeting: '🤝',
  note: '📝',
  kundli: '🔯',
  family_verdict: '👩🏽',
};

const TYPE_COLOR: Record<ActivityType, { bg: string; color: string }> = {
  added: { bg: 'rgba(193,62,42,0.1)', color: '#c13e2a' },
  stage_change: { bg: 'rgba(92,46,30,0.1)', color: '#5C2E1E' },
  conversation: { bg: 'rgba(193,62,42,0.12)', color: '#c13e2a' },
  flag_green: { bg: 'rgba(45,107,79,0.12)', color: '#2D6B4F' },
  flag_red: { bg: 'rgba(139,26,43,0.12)', color: '#c13e2a' },
  family_score: { bg: 'rgba(193,62,42,0.12)', color: '#c13e2a' },
  meeting: { bg: 'rgba(193,62,42,0.08)', color: '#c13e2a' },
  note: { bg: '#f5ede0', color: '#6b5e4d' },
  kundli: { bg: 'rgba(193,62,42,0.15)', color: '#c13e2a' },
  family_verdict: { bg: 'rgba(45,107,79,0.12)', color: '#2D6B4F' },
};

interface Props {
  entries: ActivityEntry[];
  filterType?: ActivityType | 'all';
  filterProspectId?: string;
}

function groupByDate(entries: ActivityEntry[]) {
  const groups: Record<string, ActivityEntry[]> = {};
  for (const e of entries) {
    if (!groups[e.date]) groups[e.date] = [];
    groups[e.date].push(e);
  }
  return groups;
}

function relativeDate(dateStr: string): string {
  const today = new Date().toLocaleDateString('en-IN');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-IN');
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return dateStr;
}

export default function ActivityFeed({ entries, filterType = 'all', filterProspectId }: Props) {
  const router = useRouter();

  const filtered = entries.filter(e =>
    (filterType === 'all' || e.type === filterType) &&
    (!filterProspectId || e.prospectId === filterProspectId)
  );

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sm" style={{ color: '#6b5e4d' }}>Your activity will appear here as you track prospects.</p>
      </div>
    );
  }

  const groups = groupByDate(filtered);

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([date, dayEntries]) => (
        <div key={date} className="relative pl-4" style={{ borderLeft: '2px solid rgba(193,62,42,0.3)' }}>
          <p className="section-label mb-3">{relativeDate(date)}</p>
          <div className="space-y-2">
            {dayEntries.map(e => (
              <button
                key={e.id}
                onClick={() => router.push(`/prospects/${e.prospectId}`)}
                className="w-full rounded-xl p-3 flex items-start gap-3 text-left transition-colors"
                style={{ background: 'white', border: '1px solid #d6c9b0' }}
              >
                <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm"
                  style={{ background: TYPE_COLOR[e.type].bg, color: TYPE_COLOR[e.type].color }}>
                  {TYPE_ICON[e.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: '#c13e2a' }}>{e.prospectName}</p>
                  <p className="text-sm leading-snug" style={{ color: '#1a1410' }}>{e.summary}</p>
                </div>
                <span className="text-xs shrink-0" style={{ color: '#d6c9b0' }}>{e.time}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
