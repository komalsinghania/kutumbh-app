'use client';
import { useState } from 'react';
import {
  ConversationLog, CALL_TYPES, CALL_DURATIONS, CONVERSATION_TOPICS,
  MOOD_OPTIONS, THEIR_VIBE_OPTIONS, FOLLOW_UP_OPTIONS,
} from '@/types';
import PillGroup from './PillGroup';
import EmojiPicker from './EmojiPicker';

interface Props {
  conversations: ConversationLog[];
  onAdd: (data: Omit<ConversationLog, 'id'>) => Promise<void>;
  onDelete: (id: string) => void;
  presetType?: string;
}

const TYPE_ICONS: Record<string, string> = {
  'First Phone Call': '📞',
  'Second Phone Call': '📞',
  'Third+ Phone Call': '📞',
  'Video Call': '📹',
  'WhatsApp Chat': '💬',
  'In-Person Chat': '🤝',
  'Family Call': '👨‍👩‍👧',
};

const FOLLOW_UP_COLORS: Record<string, { bg: string; color: string }> = {
  'Definitely want to talk again': { bg: 'rgba(45,107,79,0.12)', color: '#2D6B4F' },
  'Maybe, need to think': { bg: 'rgba(184,134,11,0.12)', color: '#B8860B' },
  'Not sure about this one': { bg: 'rgba(196,162,101,0.12)', color: '#C4A265' },
  "Don't want to continue": { bg: 'rgba(139,26,43,0.1)', color: '#8B1A2B' },
};

export default function ConversationTimeline({ conversations, onAdd, onDelete, presetType }: Props) {
  const [showForm, setShowForm] = useState(conversations.length === 0 || !!presetType);
  const [saving, setSaving] = useState(false);

  const [callType, setCallType] = useState(presetType || '');
  const [duration, setDuration] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [mood, setMood] = useState('');
  const [theirVibe, setTheirVibe] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [note, setNote] = useState('');

  const resetForm = () => {
    setCallType(presetType || '');
    setDuration('');
    setTopics([]);
    setMood('');
    setTheirVibe('');
    setFollowUp('');
    setNote('');
  };

  const canSave = callType && duration && mood && theirVibe && followUp;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const now = new Date();
      await onAdd({
        callType, duration, topics, mood, theirVibe, followUp,
        note: note || undefined,
        date: now.toLocaleDateString('en-IN'),
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now(),
      });
      resetForm();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleTopic = (t: string) => setTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  return (
    <div className="space-y-4">
      {!showForm && (
        <button className="btn-primary w-full" onClick={() => setShowForm(true)}>
          + Log a Call or Chat
        </button>
      )}

      {showForm && (
        <div className="card p-5 space-y-5" style={{ borderColor: 'rgba(201,168,76,0.4)', borderWidth: '1.5px' }}>
          <h3 className="section-label">Log Conversation</h3>

          <div>
            <p className="section-label mb-2">Type of Conversation</p>
            <PillGroup options={CALL_TYPES} selected={callType ? [callType] : []} onToggle={v => setCallType(v)} multi={false} size="xs" />
          </div>

          <div>
            <p className="section-label mb-2">Duration</p>
            <PillGroup options={CALL_DURATIONS} selected={duration ? [duration] : []} onToggle={v => setDuration(v)} multi={false} size="xs" />
          </div>

          <div>
            <p className="section-label mb-2">Topics Discussed (select all that apply)</p>
            <PillGroup options={CONVERSATION_TOPICS} selected={topics} onToggle={toggleTopic} multi={true} size="xs" />
          </div>

          <div>
            <p className="section-label mb-2">Your Mood After</p>
            <EmojiPicker options={MOOD_OPTIONS} value={mood} onChange={setMood} />
          </div>

          <div>
            <p className="section-label mb-2">Their Vibe</p>
            <PillGroup options={THEIR_VIBE_OPTIONS} selected={theirVibe ? [theirVibe] : []} onToggle={v => setTheirVibe(v)} multi={false} size="xs" />
          </div>

          <div>
            <p className="section-label mb-2">Follow-up?</p>
            <PillGroup options={FOLLOW_UP_OPTIONS} selected={followUp ? [followUp] : []} onToggle={v => setFollowUp(v)} multi={false} size="xs" />
          </div>

          <div>
            <label className="section-label block mb-1">Add a note (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Anything worth noting…"
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => { resetForm(); setShowForm(false); }}>Cancel</button>
            <button className="btn-primary flex-1 disabled:opacity-40" disabled={!canSave || saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {conversations.length === 0 && !showForm && (
        <p className="text-sm text-center py-6" style={{ color: '#9A8A75' }}>No conversations logged yet.</p>
      )}

      <div className="space-y-3">
        {conversations.map(c => (
          <div key={c.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{TYPE_ICONS[c.callType] ?? '💬'}</span>
                <div>
                  <span className="text-sm font-semibold" style={{ color: '#1C1612' }}>{c.callType}</span>
                  <span className="text-xs ml-2" style={{ color: '#9A8A75' }}>{c.duration}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-lg">{c.mood}</span>
                <button onClick={() => onDelete(c.id)} className="text-lg leading-none" style={{ color: '#D4C9BC' }}>×</button>
              </div>
            </div>

            {c.topics.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {c.topics.map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(196,162,101,0.1)', color: '#C4A265', border: '1px solid rgba(196,162,101,0.25)' }}>{t}</span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs" style={{ color: '#6B5D52' }}>{c.theirVibe}</span>
              {c.followUp && (() => {
                const fc = FOLLOW_UP_COLORS[c.followUp];
                return (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={fc ? { background: fc.bg, color: fc.color } : { background: '#F5EFE8', color: '#6B5D52' }}>
                    {c.followUp}
                  </span>
                );
              })()}
            </div>

            {c.note && <p className="text-xs mt-2 italic" style={{ color: '#9A8A75' }}>"{c.note}"</p>}

            <p className="text-xs mt-2" style={{ color: '#D4C9BC' }}>{c.date} {c.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
