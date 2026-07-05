'use client';
import { useState } from 'react';
import {
  ConversationLog, CALL_TYPES, CALL_DURATIONS, CONVERSATION_TOPICS,
  MOOD_OPTIONS, THEIR_VIBE_OPTIONS, FOLLOW_UP_OPTIONS,
} from '@/types';

interface Props {
  conversations: ConversationLog[];
  onAdd: (data: Omit<ConversationLog, 'id'>) => Promise<void>;
  onUpdate?: (id: string, data: Partial<Omit<ConversationLog, 'id'>>) => Promise<void>;
  onDelete: (id: string) => void;
  presetType?: string;
}

/* ── Call type meta ── */
const CALL_TYPE_META: Record<string, { icon: React.ReactNode; short: string }> = {
  'First Phone Call':  { icon: <PhoneIcon />, short: '1st Call' },
  'Second Phone Call': { icon: <PhoneIcon />, short: '2nd Call' },
  'Third+ Phone Call': { icon: <PhoneIcon />, short: '3rd+ Call' },
  'Video Call':        { icon: <VideoIcon />, short: 'Video' },
  'WhatsApp Chat':     { icon: <ChatIcon />,  short: 'WhatsApp' },
  'In-Person Chat':    { icon: <HandshakeIcon />, short: 'In-Person' },
  'Family Call':       { icon: <FamilyIcon />, short: 'Family' },
};

/* ── Follow-up sentiment config ── */
const FOLLOW_UP_CONFIG: Record<string, { bg: string; color: string; border: string; dot: string; icon: string }> = {
  'Definitely want to talk again': { bg: 'rgba(45,107,79,0.08)', color: '#2D6B4F', border: 'rgba(45,107,79,0.25)', dot: '#2D6B4F', icon: '✓' },
  'Maybe, need to think':          { bg: 'rgba(193,140,42,0.08)', color: '#7a5c00', border: 'rgba(193,140,42,0.3)', dot: '#c18c2a', icon: '~' },
  'Not sure about this one':       { bg: 'rgba(193,62,42,0.08)', color: '#c13e2a', border: 'rgba(193,62,42,0.25)', dot: '#c13e2a', icon: '?' },
  "Don't want to continue":        { bg: 'rgba(139,42,42,0.08)', color: '#8B2A2A', border: 'rgba(139,42,42,0.25)', dot: '#8B2A2A', icon: '✕' },
};

/* ── Their vibe config ── */
const VIBE_CONFIG: Record<string, { bg: string; color: string; emoji: string }> = {
  'Very Interested':      { bg: 'rgba(45,107,79,0.1)',  color: '#2D6B4F', emoji: '🔥' },
  'Interested':           { bg: 'rgba(45,107,79,0.07)', color: '#2D6B4F', emoji: '😊' },
  'Hard to Read':         { bg: 'rgba(106,95,82,0.1)',  color: '#6b5e4d', emoji: '🤔' },
  'Seemed Disinterested': { bg: 'rgba(193,62,42,0.08)', color: '#c13e2a', emoji: '😐' },
  'Rude / Off-putting':   { bg: 'rgba(139,42,42,0.1)',  color: '#8B2A2A', emoji: '😠' },
};

/* ── Topic category grouping for visual layout ── */
const TOPIC_CATEGORIES: { label: string; color: string; topics: string[] }[] = [
  { label: 'Life & Career', color: '#4A3728', topics: ['Career & Work', 'Education Background', 'Financial Expectations', 'Property & Assets'] },
  { label: 'Family & Values', color: '#2D6B4F', topics: ['Family Values', 'In-Laws Expectations', 'Children & Parenting', 'Religious Practices'] },
  { label: 'Future Together', color: '#c13e2a', topics: ['Living Arrangements', 'Future Plans & Goals', 'Wedding Expectations', 'Relocation Willingness'] },
  { label: 'Lifestyle', color: '#7a5c00', topics: ['Hobbies & Interests', 'Food & Lifestyle', 'Travel Preferences', 'Social Habits'] },
  { label: 'Health & Past', color: '#6b5e4d', topics: ['Health & Medical', 'Past Relationships'] },
];

const CATEGORY_TOPIC_SET = new Set(TOPIC_CATEGORIES.flatMap(c => c.topics));

/* ── Inline SVG icons ── */
function PhoneIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5 19.79 19.79 0 01.01 4.82 2 2 0 012 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.91a16 16 0 006.72 6.72l1.28-1.28a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function VideoIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M15 10l4.55-2.73A1 1 0 0121 8.23v7.54a1 1 0 01-1.45.9L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function ChatIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function HandshakeIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17 11l-4-4H7l-4 4 4 4h6l4-4zm0 0l3 3M7 11l-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function FamilyIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="16" cy="8" r="2" stroke="currentColor" strokeWidth="1.6"/><path d="M4 19c0-3.314 2.239-6 5-6s5 2.686 5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M16 12c2.209 0 4 1.79 4 4.5V19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}

/* ── Section wrapper ── */
function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          background: 'linear-gradient(135deg, #c13e2a, #8B2A2A)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>{num}</span>
        </div>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1a1410', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

/* ── Duration badge short-form ── */
const DURATION_SHORT: Record<string, string> = {
  'Under 10 mins': '< 10m',
  '10-20 mins': '10–20m',
  '20-40 mins': '20–40m',
  '40-60 mins': '40–60m',
  '1 hour+': '1 hr+',
};

export default function ConversationTimeline({ conversations, onAdd, onUpdate, onDelete, presetType }: Props) {
  const [showForm, setShowForm] = useState(conversations.length === 0 || !!presetType);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [callType, setCallType] = useState(presetType || '');
  const [duration, setDuration] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [mood, setMood] = useState('');
  const [theirVibe, setTheirVibe] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [note, setNote] = useState('');
  const [customTopicText, setCustomTopicText] = useState('');
  const [showCustomTopic, setShowCustomTopic] = useState(false);

  const customTopics = topics.filter(t => !CATEGORY_TOPIC_SET.has(t));

  const resetForm = () => {
    setEditingId(null);
    setCallType(presetType || '');
    setDuration('');
    setTopics([]);
    setMood('');
    setTheirVibe('');
    setFollowUp('');
    setNote('');
    setCustomTopicText('');
    setShowCustomTopic(false);
  };

  const startEdit = (c: ConversationLog) => {
    setEditingId(c.id);
    setCallType(c.callType);
    setDuration(c.duration);
    setTopics(c.topics ?? []);
    setMood(c.mood);
    setTheirVibe(c.theirVibe);
    setFollowUp(c.followUp);
    setNote(c.note ?? '');
    setCustomTopicText('');
    setShowCustomTopic(false);
    setShowForm(true);
  };

  const canSave = callType && duration && mood && theirVibe && followUp;
  const filledCount = [callType, duration, mood, theirVibe, followUp].filter(Boolean).length;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const fields = { callType, duration, topics, mood, theirVibe, followUp };
      if (editingId && onUpdate) {
        await onUpdate(editingId, { ...fields, note: note || '' });
      } else {
        const now = new Date();
        await onAdd({
          ...fields,
          note: note || undefined,
          date: now.toLocaleDateString('en-IN'),
          time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          createdAt: Date.now(),
        });
      }
      resetForm();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleTopic = (t: string) => setTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const addCustomTopic = () => {
    const t = customTopicText.trim();
    if (!t) return;
    if (!topics.includes(t)) setTopics(prev => [...prev, t]);
    setCustomTopicText('');
    setShowCustomTopic(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Log CTA / Form ── */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%', padding: '16px 20px', borderRadius: 18, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #c13e2a 0%, #8B2A2A 100%)',
            color: 'white', fontWeight: 700, fontSize: '0.95rem',
            boxShadow: '0 6px 20px rgba(193,62,42,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PhoneIcon />
          </div>
          Log a Call or Chat
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ marginLeft: 4 }}>
            <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      ) : (
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e8dece', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

          {/* Form header with progress */}
          <div style={{
            background: 'linear-gradient(135deg, #c13e2a 0%, #8B2A2A 100%)',
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PhoneIcon />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', lineHeight: 1.2 }}>{editingId ? 'Edit Conversation' : 'Log Conversation'}</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                  {filledCount} of 5 required fields filled
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Progress dots */}
              <div style={{ display: 'flex', gap: 4 }}>
                {[callType, duration, mood, theirVibe, followUp].map((v, i) => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: v ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                    transition: 'background 0.2s',
                  }} />
                ))}
              </div>
              <button
                onClick={() => { resetForm(); setShowForm(false); }}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'white', fontSize: '1.1rem', lineHeight: 1,
                }}
              >×</button>
            </div>
          </div>

          {/* Form body */}
          <div style={{ padding: '20px 18px 22px', display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* 01 — Call type */}
            <Section num="01" title="Type of Conversation">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {CALL_TYPES.map(type => {
                  const meta = CALL_TYPE_META[type];
                  const isActive = callType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setCallType(type)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 6, padding: '10px 6px', borderRadius: 12, cursor: 'pointer',
                        border: isActive ? '2px solid #c13e2a' : '1.5px solid #e8dece',
                        background: isActive ? 'rgba(193,62,42,0.06)' : '#faf8f5',
                        boxShadow: isActive ? '0 0 0 3px rgba(193,62,42,0.1)' : 'none',
                        transition: 'all 0.18s',
                        color: isActive ? '#c13e2a' : '#6b5e4d',
                      }}
                    >
                      <div style={{ fontSize: '0.95rem', opacity: isActive ? 1 : 0.7 }}>{meta?.icon}</div>
                      <span style={{
                        fontSize: '0.62rem', fontWeight: isActive ? 700 : 500,
                        textAlign: 'center', lineHeight: 1.2,
                        color: isActive ? '#c13e2a' : '#6b5e4d',
                      }}>
                        {meta?.short ?? type}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Divider */}
            <div style={{ height: 1, background: '#f0ebe2' }} />

            {/* 02 — Duration */}
            <Section num="02" title="Duration">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CALL_DURATIONS.map(d => {
                  const isActive = duration === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      style={{
                        padding: '8px 16px', borderRadius: 24, cursor: 'pointer',
                        border: isActive ? '2px solid #c13e2a' : '1.5px solid #e0d8cc',
                        background: isActive ? 'linear-gradient(135deg, #c13e2a, #8B2A2A)' : 'white',
                        color: isActive ? 'white' : '#6b5e4d',
                        fontSize: '0.78rem', fontWeight: isActive ? 700 : 500,
                        boxShadow: isActive ? '0 3px 10px rgba(193,62,42,0.3)' : 'none',
                        transition: 'all 0.18s',
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </Section>

            <div style={{ height: 1, background: '#f0ebe2' }} />

            {/* 03 — Topics */}
            <Section num="03" title={`Topics Discussed ${topics.length > 0 ? `(${topics.length} selected)` : '— optional'}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {TOPIC_CATEGORIES.map(cat => (
                  <div key={cat.label}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, opacity: 0.8 }}>
                      {cat.label}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {cat.topics.map(t => {
                        const isActive = topics.includes(t);
                        return (
                          <button
                            key={t}
                            onClick={() => toggleTopic(t)}
                            style={{
                              padding: '5px 11px', borderRadius: 20, cursor: 'pointer',
                              border: isActive ? `1.5px solid ${cat.color}` : '1.5px solid #e8dece',
                              background: isActive ? `${cat.color}15` : '#faf8f5',
                              color: isActive ? cat.color : '#a89e92',
                              fontSize: '0.72rem', fontWeight: isActive ? 600 : 400,
                              transition: 'all 0.15s',
                            }}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Custom topics */}
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#8B2A2A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, opacity: 0.8 }}>
                    Custom
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                    {customTopics.map(t => (
                      <span key={t} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 8px 5px 11px', borderRadius: 20,
                        border: '1.5px solid #c13e2a', background: 'rgba(193,62,42,0.09)',
                        color: '#c13e2a', fontSize: '0.72rem', fontWeight: 600,
                      }}>
                        {t}
                        <button onClick={() => toggleTopic(t)} style={{ fontWeight: 800, lineHeight: 1, cursor: 'pointer', color: '#c13e2a' }}>×</button>
                      </span>
                    ))}
                    {showCustomTopic ? (
                      <input
                        type="text"
                        value={customTopicText}
                        onChange={e => setCustomTopicText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTopic(); } }}
                        onBlur={addCustomTopic}
                        placeholder="Add topic…"
                        autoFocus
                        style={{
                          padding: '5px 11px', borderRadius: 20, width: 150,
                          border: '1.5px solid #c13e2a', background: 'white',
                          fontSize: '0.72rem', color: '#1a1410', outline: 'none',
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => setShowCustomTopic(true)}
                        style={{
                          padding: '5px 11px', borderRadius: 20, cursor: 'pointer',
                          border: '1.5px dashed #c13e2a', background: 'white',
                          color: '#c13e2a', fontSize: '0.72rem', fontWeight: 600,
                        }}
                      >
                        + Other
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Section>

            <div style={{ height: 1, background: '#f0ebe2' }} />

            {/* 04 — Mood */}
            <Section num="04" title="Your Mood After">
              <div style={{ display: 'flex', gap: 8 }}>
                {MOOD_OPTIONS.map(opt => {
                  const isActive = mood === opt.emoji;
                  return (
                    <button
                      key={opt.emoji}
                      onClick={() => setMood(opt.emoji)}
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 5, padding: '10px 4px', borderRadius: 14, cursor: 'pointer',
                        border: isActive ? '2px solid #c13e2a' : '1.5px solid #e8dece',
                        background: isActive ? 'rgba(193,62,42,0.06)' : 'white',
                        boxShadow: isActive ? '0 0 0 3px rgba(193,62,42,0.1)' : 'none',
                        transition: 'all 0.18s',
                      }}
                    >
                      <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{opt.emoji}</span>
                      <span style={{
                        fontSize: '0.6rem', lineHeight: 1.2, textAlign: 'center',
                        fontWeight: isActive ? 700 : 400,
                        color: isActive ? '#c13e2a' : '#a89e92',
                      }}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <div style={{ height: 1, background: '#f0ebe2' }} />

            {/* 05 — Their Vibe */}
            <Section num="05" title="Their Vibe">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {THEIR_VIBE_OPTIONS.map(v => {
                  const cfg = VIBE_CONFIG[v];
                  const isActive = theirVibe === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setTheirVibe(v)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 12px', borderRadius: 24, cursor: 'pointer',
                        border: isActive ? `1.5px solid ${cfg?.color ?? '#c13e2a'}` : '1.5px solid #ede8df',
                        background: isActive ? (cfg?.bg ?? 'rgba(193,62,42,0.07)') : 'white',
                        transition: 'all 0.18s',
                        boxShadow: isActive ? `0 2px 8px ${cfg?.color ?? '#c13e2a'}22` : 'none',
                      }}
                    >
                      <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>{cfg?.emoji ?? '•'}</span>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? (cfg?.color ?? '#c13e2a') : '#6b5e4d',
                        whiteSpace: 'nowrap',
                      }}>
                        {v}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <div style={{ height: 1, background: '#f0ebe2' }} />

            {/* 06 — Follow-up */}
            <Section num="06" title="What's next?">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {FOLLOW_UP_OPTIONS.map(opt => {
                  const cfg = FOLLOW_UP_CONFIG[opt];
                  const isActive = followUp === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setFollowUp(opt)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '8px 13px', borderRadius: 24, cursor: 'pointer',
                        border: isActive ? `1.5px solid ${cfg?.border ?? '#c13e2a'}` : '1.5px solid #ede8df',
                        background: isActive ? (cfg?.bg ?? 'rgba(193,62,42,0.07)') : 'white',
                        transition: 'all 0.18s',
                        boxShadow: isActive ? `0 2px 10px ${cfg?.dot ?? '#c13e2a'}22` : 'none',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                        background: isActive ? (cfg?.dot ?? '#c13e2a') : '#ede8df',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.62rem', fontWeight: 800,
                        color: isActive ? 'white' : '#a89e92',
                        transition: 'all 0.18s',
                      }}>
                        {cfg?.icon ?? '•'}
                      </div>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? (cfg?.color ?? '#c13e2a') : '#6b5e4d',
                        whiteSpace: 'nowrap',
                      }}>
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <div style={{ height: 1, background: '#f0ebe2' }} />

            {/* 07 — Note */}
            <Section num="07" title="Note — optional">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Anything worth noting… a specific detail, how they made you feel, a red flag, etc."
                rows={3}
                style={{
                  width: '100%', borderRadius: 12, border: '1.5px solid #e8dece',
                  padding: '12px 14px', background: '#faf8f5', fontFamily: 'inherit',
                  fontSize: '0.85rem', color: '#1a1410', outline: 'none',
                  resize: 'none', lineHeight: 1.6,
                  transition: 'border-color 0.18s',
                }}
                onFocus={e => { e.target.style.borderColor = '#c13e2a'; }}
                onBlur={e => { e.target.style.borderColor = '#e8dece'; }}
              />
            </Section>

            {/* Save button */}
            <button
              disabled={!canSave || saving}
              onClick={handleSave}
              style={{
                padding: '14px', borderRadius: 14, border: 'none',
                cursor: canSave && !saving ? 'pointer' : 'not-allowed',
                background: canSave
                  ? 'linear-gradient(135deg, #c13e2a 0%, #8B2A2A 100%)'
                  : '#ede8df',
                color: canSave ? 'white' : '#a89e92',
                fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.02em',
                boxShadow: canSave ? '0 6px 18px rgba(193,62,42,0.35)' : 'none',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {saving ? (
                <>Saving…</>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                    <path d="M17 3H7L3 7v10a1 1 0 001 1h13a1 1 0 001-1V4a1 1 0 00-1-1z" stroke="white" strokeWidth="1.6" strokeLinejoin="round"/>
                    <path d="M13 17v-6H7v6" stroke="white" strokeWidth="1.6" strokeLinejoin="round"/>
                    <path d="M7 3v5h8" stroke="white" strokeWidth="1.6" strokeLinejoin="round"/>
                  </svg>
                  Save Conversation
                </>
              )}
            </button>

          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {conversations.length === 0 && !showForm && (
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e8dece', padding: '40px 20px', textAlign: 'center', boxShadow: '0 2px 14px rgba(0,0,0,0.05)' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px',
            background: 'rgba(193,62,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5 19.79 19.79 0 01.01 4.82 2 2 0 012 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.91a16 16 0 006.72 6.72l1.28-1.28a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="#c13e2a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1a1410', margin: '0 0 6px' }}>No conversations yet</p>
          <p style={{ fontSize: '0.8rem', color: '#a89e92', margin: 0, lineHeight: 1.5 }}>Log your first call or chat to start tracking the connection</p>
        </div>
      )}

      {/* ── Conversation History ── */}
      {conversations.length > 0 && (
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid #f0ebe2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(193,62,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c13e2a' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#c13e2a" strokeWidth="1.8"/>
                  <path d="M12 7v5l3 3" stroke="#c13e2a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Conversation History
              </span>
            </div>
            <span style={{
              fontSize: '0.72rem', fontWeight: 800, color: 'white',
              background: 'linear-gradient(135deg, #c13e2a, #8B2A2A)',
              borderRadius: 20, padding: '3px 10px',
              boxShadow: '0 2px 6px rgba(193,62,42,0.3)',
            }}>
              {conversations.length} {conversations.length === 1 ? 'call' : 'calls'}
            </span>
          </div>

          {/* Timeline entries */}
          <div style={{ padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {conversations.map((c, idx) => {
              const fuCfg = FOLLOW_UP_CONFIG[c.followUp];
              const vibeCfg = VIBE_CONFIG[c.theirVibe];
              const isLast = idx === conversations.length - 1;
              return (
                <div key={c.id} style={{ display: 'flex', gap: 12 }}>

                  {/* Spine */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                      background: fuCfg ? `${fuCfg.dot}18` : 'rgba(193,62,42,0.1)',
                      border: `2px solid ${fuCfg?.dot ?? '#c13e2a'}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem',
                    }}>
                      {c.mood}
                    </div>
                    {!isLast && (
                      <div style={{
                        width: 2, flex: 1, minHeight: 18, margin: '5px 0',
                        background: 'linear-gradient(to bottom, #e8dece, transparent)',
                      }} />
                    )}
                  </div>

                  {/* Content card */}
                  <div style={{
                    flex: 1,
                    border: '1.5px solid #ede8df',
                    borderLeft: `3px solid ${fuCfg?.dot ?? '#c13e2a'}`,
                    borderRadius: '0 14px 14px 0',
                    background: '#faf8f5',
                    padding: '11px 13px 12px',
                    marginBottom: isLast ? 0 : 12,
                  }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1a1410' }}>{c.callType}</span>
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 600, color: '#a89e92',
                            background: '#ede8df', borderRadius: 20, padding: '1px 8px',
                          }}>
                            {DURATION_SHORT[c.duration] ?? c.duration}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                        {onUpdate && (
                          <button
                            onClick={() => startEdit(c)}
                            aria-label="Edit conversation"
                            style={{
                              width: 24, height: 24, borderRadius: '50%', border: '1px solid #e8dece',
                              background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', color: '#c13e2a',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="#c13e2a" strokeWidth="1.8" strokeLinecap="round"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="#c13e2a" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(c.id)}
                          aria-label="Delete conversation"
                          style={{
                            width: 24, height: 24, borderRadius: '50%', border: '1px solid #e8dece',
                            background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#c0b8ae', fontSize: '0.95rem', lineHeight: 1,
                          }}
                        >×</button>
                      </div>
                    </div>

                    {/* Topics */}
                    {c.topics.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                        {c.topics.map(t => (
                          <span key={t} style={{
                            fontSize: '0.65rem', padding: '2px 8px', borderRadius: 20,
                            background: 'rgba(193,62,42,0.09)', color: '#c13e2a',
                            border: '1px solid rgba(193,62,42,0.18)', fontWeight: 500,
                          }}>{t}</span>
                        ))}
                      </div>
                    )}

                    {/* Vibe + Follow-up chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center', marginBottom: c.note ? 8 : 0 }}>
                      {c.theirVibe && (
                        <span style={{
                          fontSize: '0.7rem', color: vibeCfg?.color ?? '#6b5e4d',
                          background: vibeCfg?.bg ?? '#f0ebe2',
                          borderRadius: 20, padding: '3px 10px', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <span>{vibeCfg?.emoji ?? '•'}</span> {c.theirVibe}
                        </span>
                      )}
                      {c.followUp && (
                        <span style={{
                          fontSize: '0.7rem', padding: '3px 10px', borderRadius: 20,
                          fontWeight: 600, background: fuCfg?.bg ?? '#f5ede0',
                          color: fuCfg?.color ?? '#6b5e4d',
                          border: `1px solid ${fuCfg?.border ?? '#d6c9b0'}`,
                        }}>
                          {c.followUp}
                        </span>
                      )}
                    </div>

                    {/* Note */}
                    {c.note && (
                      <div style={{
                        background: 'rgba(193,62,42,0.04)', borderRadius: 8,
                        borderLeft: '3px solid rgba(193,62,42,0.2)',
                        padding: '6px 10px', marginBottom: 4,
                      }}>
                        <p style={{ fontSize: '0.78rem', color: '#6b5e4d', fontStyle: 'italic', margin: 0, lineHeight: 1.55 }}>
                          "{c.note}"
                        </p>
                      </div>
                    )}

                    {/* Date/time */}
                    <p style={{ fontSize: '0.62rem', color: '#b8b0a6', marginTop: 6, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6.5" stroke="#b8b0a6" strokeWidth="1.2"/>
                        <path d="M8 4.5v3.5l2 2" stroke="#b8b0a6" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                      {c.date} · {c.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
