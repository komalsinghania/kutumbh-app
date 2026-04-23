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
};

const TYPE_COLOR: Record<ActivityType, { bg: string; color: string }> = {
  added: { bg: 'rgba(139,105,20,0.1)', color: '#C4A265' },
  stage_change: { bg: 'rgba(92,46,30,0.1)', color: '#5C2E1E' },
  conversation: { bg: 'rgba(201,168,76,0.12)', color: '#C4A265' },
  flag_green: { bg: 'rgba(45,107,79,0.12)', color: '#2D6B4F' },
  flag_red: { bg: 'rgba(139,26,43,0.12)', color: '#8B1A2B' },
  family_score: { bg: 'rgba(184,134,11,0.12)', color: '#B8860B' },
  meeting: { bg: 'rgba(139,105,20,0.08)', color: '#C4A265' },
  note: { bg: '#F5EFE8', color: '#6B5D52' },
  kundli: { bg: 'rgba(201,168,76,0.15)', color: '#C4A265' },
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
        <p className="text-sm" style={{ color: '#9A8A75' }}>Your activity will appear here as you track prospects.</p>
      </div>
    );
  }

  const groups = groupByDate(filtered);

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([date, dayEntries]) => (
        <div key={date} className="relative pl-4" style={{ borderLeft: '2px solid rgba(201,168,76,0.3)' }}>
          <p className="section-label mb-3">{relativeDate(date)}</p>
          <div className="space-y-2">
            {dayEntries.map(e => (
              <button
                key={e.id}
                onClick={() => router.push(`/prospects/${e.prospectId}`)}
                className="w-full rounded-xl p-3 flex items-start gap-3 text-left transition-colors"
                style={{ background: 'white', border: '1px solid #E8DFD3' }}
              >
                <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm"
                  style={{ background: TYPE_COLOR[e.type].bg, color: TYPE_COLOR[e.type].color }}>
                  {TYPE_ICON[e.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: '#C4A265' }}>{e.prospectName}</p>
                  <p className="text-sm leading-snug" style={{ color: '#1C1612' }}>{e.summary}</p>
                </div>
                <span className="text-xs shrink-0" style={{ color: '#D4C9BC' }}>{e.time}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
