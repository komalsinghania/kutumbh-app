'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  getProspect, updateProspect, subscribeToNotes, addNote, deleteProspect,
  subscribeToConversations, addConversation, updateConversation, deleteConversation,
  subscribeToFlags, addFlag, deleteFlag,
  subscribeFamilyScorecard, saveFamilyScorecard,
  subscribeMeetingData, saveMeetingData,
  logStageChange,
} from '@/lib/firestore';
import { compressImage } from '@/lib/compress-image';
import { calculateOverallScore, calculateGunaScore, calculateCompatScore } from '@/lib/scoring';
import { calculateKundli } from '@/lib/kundli';
import { track } from '@/lib/analytics';
import { getCityByName } from '@/lib/indian-cities';
import {
  Prospect, Note, ProspectStage, STAGE_LABELS, NAKSHATRAS, HOBBIES,
  ConversationLog, Flag, FamilyScorecard, FamilyScorecardKey,
  FAMILY_SCORECARD_DIMENSIONS, MeetingData, MeetingRecord, MeetingDimensionKey,
  POST_MEETING_DIMENSIONS,
  GREEN_FLAGS, RED_FLAGS,
  MEETING_QUESTIONS, GUT_FEELING_OPTIONS,
  STAGE_PROMPT_CONFIG,
} from '@/types';
import KundliReport from '@/components/KundliReport';
import ConversationTimeline from '@/components/ConversationTimeline';
import StarRating from '@/components/StarRating';
import EmojiPicker from '@/components/EmojiPicker';
import StagePromptModal from '@/components/StagePromptModal';
import toast from 'react-hot-toast';
import { Logo } from '@/components/Logo';

type Tab = 'overview' | 'conversations' | 'flags' | 'family' | 'meeting' | 'kundli' | 'decision';

const MEETING_ORDINALS = ['1st', '2nd', '3rd', '4th', '5th'];

// ── Meeting-question theming: group the prep questions into colour-coded topics ──
const QUESTION_TOPICS = {
  lifestyle: { label: 'Lifestyle',   color: '#E08A1E', emoji: '☀️' },
  values:    { label: 'Values',      color: '#7C5CBF', emoji: '🧭' },
  family:    { label: 'Family',      color: '#C13E7A', emoji: '👪' },
  future:    { label: 'Future',      color: '#2A9D8F', emoji: '🌱' },
  practical: { label: 'Practical',   color: '#3A7BD5', emoji: '📋' },
  personal:  { label: 'Connection',  color: '#C13E2A', emoji: '💗' },
  custom:    { label: 'Yours',       color: '#B8860B', emoji: '✍️' },
} as const;
type QuestionTopic = keyof typeof QUESTION_TOPICS;

const QUESTION_TOPIC_MAP: Record<string, QuestionTopic> = {
  'What does a typical day look like for you?': 'lifestyle',
  'What are your hobbies outside work?': 'lifestyle',
  'How do you feel about pets?': 'lifestyle',
  'What role does religion play in your daily life?': 'values',
  'How do you handle disagreements?': 'values',
  "What's your relationship with your siblings like?": 'family',
  'How often do you want to visit family after marriage?': 'family',
  'Have you been in a relationship before?': 'family',
  'Where do you see yourself in 5 years?': 'future',
  'What are your expectations from marriage?': 'future',
  'How do you feel about working after marriage?': 'future',
  'What kind of wedding do you envision?': 'future',
  "What's your take on finances — joint or separate?": 'practical',
  'Do you have any health conditions I should know about?': 'practical',
  'What made you say yes to meeting me?': 'personal',
};
const topicOf = (q: string): QuestionTopic => QUESTION_TOPIC_MAP[q] ?? 'custom';

// Shared flag glyph (same waving-flag shape used in the "Your Flags" header) —
// used for both green & red so the two sides match instead of heart-vs-flag.
function FlagIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill={color} stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      <line x1="4" y1="22" x2="4" y2="14" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
const FLAG_GREEN = '#2D6B4F', FLAG_RED = '#8B2A2A';

function meetingAvg(r: MeetingRecord): number | null {
  const vals = POST_MEETING_DIMENSIONS
    .map(d => r[d.key as MeetingDimensionKey] as number | undefined)
    .filter((v): v is number => v !== undefined && v > 0);
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

const JOURNEY_STAGES: ProspectStage[] = [
  'new', 'call_done', 'meeting_fixed', 'met',
];

const DECISION_STAGES: ProspectStage[] = ['interested', 'on_hold', 'rejected'];

const DECISION_INFO: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  interested: { label: 'Interested', icon: '✓', color: '#2D6B4F', bg: 'rgba(45,107,79,0.08)', border: 'rgba(45,107,79,0.3)' },
  on_hold: { label: 'On Hold', icon: '⏸', color: '#b8892b', bg: 'rgba(184,137,43,0.08)', border: 'rgba(184,137,43,0.3)' },
  rejected: { label: 'Rejected', icon: '✕', color: '#8B2A2A', bg: 'rgba(139,42,42,0.08)', border: 'rgba(139,42,42,0.3)' },
};

const JOURNEY_LABELS: Record<string, string> = {
  new: 'New', photo_exchanged: 'Photo', kundli_sent: 'Kundli',
  kundli_matched: 'Match', call_done: 'Call Done', family_call: 'Family',
  meeting_fixed: 'Meeting Fixed', met: 'Met', interested: 'Interested',
  on_hold: 'On Hold', rejected: 'Rejected',
};

// Stepper semantics: clicking a done/current stage REVIEWS its content tab;
// clicking a future stage ADVANCES the journey to it.
const STAGE_TAB: Record<string, Tab> = {
  new: 'overview', call_done: 'conversations', meeting_fixed: 'meeting', met: 'meeting',
};

// Action-phrased labels for the advance CTA (what you're marking as done)
const ADVANCE_LABELS: Record<string, string> = {
  call_done: 'Mark Call Done', meeting_fixed: 'Meeting Fixed', met: 'Mark as Met',
};

const SOURCE_OPTIONS = [
  'Matrimonial Website', 'Relative', 'Family Friend', 'Pandit ji', 'Community Event', 'Other',
];

// Icons for the journey stepper nodes
function stageIcon(stage: string, color: string): React.ReactNode {
  const s = { stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  switch (stage) {
    case 'new': // sparkle — a fresh prospect
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.9 5.6L20 10.5l-6.1 1.9L12 18l-1.9-5.6L4 10.5l6.1-1.9L12 3z" {...s}/></svg>;
    case 'call_done': // phone
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5 19.79 19.79 0 010 4.82 2 2 0 012 2.73h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 10.6a16 16 0 006.72 6.72l1.24-1.24a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.03z" {...s}/></svg>;
    case 'meeting_fixed': // calendar
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="3" {...s}/><path d="M16 2v4M8 2v4M3 10h18" {...s}/></svg>;
    case 'met': // two people
      return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" {...s}/><circle cx="9" cy="7" r="4" {...s}/><path d="M22 21v-2a4 4 0 00-3-3.87M15 3.13a4 4 0 010 7.75" {...s}/></svg>;
    default: // decision — heart
      return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" {...s}/></svg>;
  }
}

// ── Overview display components (top-level so children don't remount on render) ─

function DetailChip({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ background: '#fbf8f3', borderRadius: 12, border: '1px solid #f0e7d8', padding: '9px 12px' }}>
      <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#b08a4f', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#241209', lineHeight: 1.35 }}>
        {String(value)}
      </div>
    </div>
  );
}

function SectionCard({ icon, title, cols = 2, children }: { icon: React.ReactNode; title: string; cols?: number; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: 20, border: '1px solid #eee4d4', boxShadow: '0 4px 20px rgba(38,16,8,0.05)', overflow: 'hidden' }}>
      <div style={{ padding: '13px 16px 11px', borderBottom: '1px dashed #f0e7d8', display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 27, height: 27, borderRadius: 9, background: 'rgba(193,62,42,0.08)', border: '1px solid rgba(193,62,42,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#241209', textTransform: 'uppercase', letterSpacing: '0.16em' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '12px 14px 14px', display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

// ── Edit-mode field components (top-level so internal state is stable) ─────────

const editLabelStyle: React.CSSProperties = {
  fontSize: '0.6rem', fontWeight: 700, color: '#c13e2a',
  textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, display: 'block',
};
const editInputStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid #d6c9b0', borderRadius: 10,
  padding: '7px 10px', fontSize: '0.82rem', color: '#1a1410', background: 'white', outline: 'none',
};

function EditChip({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div style={{ background: '#faf8f5', borderRadius: 10, border: '1px solid #ede8df', padding: '8px 12px' }}>
      <label style={editLabelStyle}>{label}</label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} style={editInputStyle} />
    </div>
  );
}

function EditTextarea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div style={{ background: '#faf8f5', borderRadius: 10, border: '1px solid #ede8df', padding: '8px 12px' }}>
      <label style={editLabelStyle}>{label}</label>
      <textarea value={value} placeholder={placeholder} rows={3}
        onChange={e => onChange(e.target.value)} style={{ ...editInputStyle, resize: 'vertical' }} />
    </div>
  );
}

function EditPills({ label, options, value, onChange }: {
  label: string; options: readonly string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ background: '#faf8f5', borderRadius: 10, border: '1px solid #ede8df', padding: '8px 12px' }}>
      <label style={editLabelStyle}>{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => onChange(value === opt ? '' : opt)}
            className="px-2.5 py-1 rounded-full border text-xs font-medium transition-all"
            style={value === opt
              ? { background: '#c13e2a', color: 'white', borderColor: '#c13e2a' }
              : { background: 'white', color: '#6b5e4d', borderColor: '#d6c9b0' }}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function EditNakshatra({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ background: '#faf8f5', borderRadius: 10, border: '1px solid #ede8df', padding: '8px 12px' }}>
      <label style={editLabelStyle}>Nakshatra</label>
      <select value={value} onChange={e => onChange(Number(e.target.value))} style={editInputStyle}>
        <option value={-1}>Not set</option>
        {NAKSHATRAS.map((n, i) => <option key={n} value={i}>{n}</option>)}
      </select>
    </div>
  );
}

function EditHobbies({ selected, onToggle }: { selected: string[]; onToggle: (v: string) => void }) {
  const [showInput, setShowInput] = useState(false);
  const [text, setText] = useState('');
  const custom = selected.filter(h => !(HOBBIES as readonly string[]).includes(h));
  const add = () => {
    const v = text.trim();
    if (!v) return;
    if (!selected.includes(v)) onToggle(v);
    setText(''); setShowInput(false);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {HOBBIES.map(opt => (
        <button key={opt} type="button" onClick={() => onToggle(opt)}
          className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
          style={selected.includes(opt)
            ? { background: '#c13e2a', color: 'white', borderColor: '#c13e2a' }
            : { background: 'white', color: '#6b5e4d', borderColor: '#d6c9b0' }}>
          {opt}
        </button>
      ))}
      {custom.map(c => (
        <span key={c} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ background: '#c13e2a', color: 'white', border: '1px solid #c13e2a' }}>
          {c}
          <button type="button" onClick={() => onToggle(c)} style={{ marginLeft: 2, fontWeight: 700, lineHeight: 1 }}>×</button>
        </span>
      ))}
      {showInput ? (
        <input type="text" value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          onBlur={add} placeholder="Add hobby…" autoFocus
          className="px-3 py-1.5 rounded-full text-xs" style={{ width: 130, borderColor: '#c13e2a', border: '1.5px solid #c13e2a' }} />
      ) : (
        <button type="button" onClick={() => setShowInput(true)}
          className="px-3 py-1.5 rounded-full border text-xs font-medium"
          style={{ background: 'white', color: '#c13e2a', borderColor: '#c13e2a' }}>
          + Other
        </button>
      )}
    </div>
  );
}

export default function ProspectDetailPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [conversations, setConversations] = useState<ConversationLog[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [familySC, setFamilySC] = useState<FamilyScorecard | null>(null);
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null);

  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Flash the tab pill when it's opened from the journey stepper, so the
  // stepper→tab connection is visible instead of implicit.
  const [flashTab, setFlashTab] = useState<Tab | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTab = (tab: Tab) => {
    setActiveTab(tab);
    setFlashTab(tab);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashTab(null), 900);
  };

  const [pendingStage, setPendingStage] = useState<ProspectStage | null>(null);

  const [customFlagType, setCustomFlagType] = useState<'green' | 'red' | null>(null);
  const [customFlagText, setCustomFlagText] = useState('');

  const [familyScores, setFamilyScores] = useState<Partial<Record<FamilyScorecardKey, number>>>({});
  const [savingFamily, setSavingFamily] = useState(false);

  const [meetingLocal, setMeetingLocal] = useState<MeetingData>({ checkedItems: [], questionsAsked: [] });
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [customQuestionText, setCustomQuestionText] = useState('');
  const [activeMeetingIdx, setActiveMeetingIdx] = useState(0);

  const photoRef = useRef<HTMLInputElement>(null);

  // ── Overview edit mode ──
  type EditForm = {
    age: string; city: string; height: string; diet: string; source: string;
    education: string; profession: string; income: string; property: string;
    familyType: string; fatherOcc: string; motherOcc: string; siblings: string;
    manglik: string; gotra: string; rashi: string;
    nakshatra: number; rashiIndex: number; dobDate: string; dobTime: string; dobPlace: string;
    hobbies: string[]; phone: string; firstImpression: string;
  };
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const startEdit = () => {
    if (!prospect) return;
    setEditForm({
      age: prospect.age ? String(prospect.age) : '',
      city: prospect.city || '', height: prospect.height || '', diet: prospect.diet || '',
      source: prospect.source || '',
      education: prospect.education || '', profession: prospect.profession || '',
      income: prospect.income || '', property: prospect.property || '',
      familyType: prospect.familyType || '', fatherOcc: prospect.fatherOcc || '',
      motherOcc: prospect.motherOcc || '', siblings: prospect.siblings || '',
      manglik: prospect.manglik || '', gotra: prospect.gotra || '', rashi: prospect.rashi || '',
      nakshatra: prospect.nakshatra ?? -1, rashiIndex: prospect.rashiIndex ?? -1,
      dobDate: prospect.dobDate || '', dobTime: prospect.dobTime || '', dobPlace: prospect.dobPlace || '',
      hobbies: prospect.hobbies || [], phone: prospect.phone || '',
      firstImpression: prospect.firstImpression || '',
    });
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setEditForm(null); };
  const setEdit = (k: keyof EditForm, v: any) => setEditForm(f => f ? { ...f, [k]: v } : f);
  const toggleEditHobby = (h: string) => setEditForm(f => f
    ? { ...f, hobbies: f.hobbies.includes(h) ? f.hobbies.filter(x => x !== h) : [...f.hobbies, h] }
    : f);

  const recalcEditKundli = () => {
    if (!editForm) return;
    const { dobDate, dobTime, dobPlace } = editForm;
    if (!dobDate || !dobTime || !dobPlace) { toast('Enter date, time and place of birth first.', { icon: 'ℹ️' }); return; }
    const city = getCityByName(dobPlace);
    if (!city) { toast('City not found — pick the Nakshatra manually.', { icon: 'ℹ️' }); return; }
    try {
      const r = calculateKundli({ date: dobDate, time: dobTime, lat: city.lat, lng: city.lng, tzOffset: city.tz });
      setEditForm(f => f ? { ...f, nakshatra: r.nakshatra, rashiIndex: r.rashi, rashi: r.rashiName } : f);
      track('kundli_calculated', { context: 'edit_prospect' });
      toast.success(`Nakshatra: ${r.nakshatraName} (${r.rashiName})`);
    } catch { toast.error('Could not calculate — pick the Nakshatra manually.'); }
  };

  const saveEdit = async () => {
    if (!user || !prospect || !editForm || !profile) return;
    setSavingEdit(true);
    try {
      const f = editForm;
      const nakshatra = f.nakshatra >= 0 ? f.nakshatra : undefined;
      const base = {
        age: Number(f.age) || 0,
        city: f.city, height: f.height, diet: f.diet, source: (f.source || prospect.source) as Prospect['source'],
        education: f.education, profession: f.profession, income: f.income, property: f.property,
        familyType: f.familyType, fatherOcc: f.fatherOcc, motherOcc: f.motherOcc, siblings: f.siblings,
        manglik: f.manglik, gotra: f.gotra, rashi: f.rashi,
        nakshatra, rashiIndex: f.rashiIndex >= 0 ? f.rashiIndex : undefined,
        dobDate: f.dobDate, dobTime: f.dobTime, dobPlace: f.dobPlace,
        hobbies: f.hobbies.length > 0 ? f.hobbies : undefined,
        phone: f.phone, firstImpression: f.firstImpression,
      };
      // Recompute scores from the edited values
      const gunaScore = profile.nakshatra >= 0 && nakshatra !== undefined
        ? calculateGunaScore(
            profile.nakshatra, nakshatra,
            profile.rashiIndex, f.rashiIndex >= 0 ? f.rashiIndex : undefined,
          )
        : prospect.gunaScore ?? null;
      const compatScore = calculateCompatScore(profile, { ...prospect, ...base } as Prospect);
      const payload = { ...base, gunaScore, compatScore };
      await updateProspect(user.uid, id, payload);
      setProspect(p => p ? { ...p, ...payload } : p);
      toast.success('Details updated');
      setEditing(false); setEditForm(null);
    } catch {
      toast.error('Failed to save changes.');
    } finally { setSavingEdit(false); }
  };

  useEffect(() => {
    if (!user) return;
    getProspect(user.uid, id).then(p => { setProspect(p); setLoading(false); });
  }, [user, id]);

  useEffect(() => {
    if (!user) return;
    const unsubs = [
      subscribeToNotes(user.uid, id, setNotes),
      subscribeToConversations(user.uid, id, setConversations),
      subscribeToFlags(user.uid, id, setFlags),
      subscribeFamilyScorecard(user.uid, id, sc => {
        setFamilySC(sc);
        if (sc) setFamilyScores(sc.scores);
      }),
      subscribeMeetingData(user.uid, id, m => {
        setMeetingData(m);
        if (m) {
          setMeetingLocal({ ...m, questionsAsked: m.questionsAsked ?? [] });
          if (m.meetings && m.meetings.length > 0) {
            setActiveMeetingIdx(m.meetings.length - 1);
          }
        }
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [user, id]);

  const changeStage = async (stage: ProspectStage) => {
    if (!user || !prospect) return;
    await updateProspect(user.uid, id, { stage });
    setProspect(p => p ? { ...p, stage } : p);
    await logStageChange(user.uid, id, prospect.name, STAGE_LABELS[stage]);
    if (stage === 'new') openTab('overview');
    if (stage === 'call_done') openTab('conversations');
    if (stage === 'meeting_fixed' || stage === 'met') openTab('meeting');
    if (stage === 'interested' || stage === 'on_hold' || stage === 'rejected') {
      openTab('decision');
      track('decision_made', { decision: stage });
    }
  };

  const handleStagePromptConfirm = async (data: any) => {
    if (!pendingStage || !user || !prospect) { setPendingStage(null); return; }
    if (pendingStage === 'meeting_fixed' && (data.date || data.location)) {
      const updated = { ...meetingLocal, plannedDate: data.date, location: data.location };
      setMeetingLocal(updated);
      await saveMeetingData(user.uid, id, prospect.name, updated);
    }
    if (data.note) {
      await addNote(user.uid, id, `[${STAGE_LABELS[pendingStage]}] ${data.tags?.join(', ') || ''} — ${data.note}`);
    } else if (data.tags?.length) {
      await addNote(user.uid, id, `[${STAGE_LABELS[pendingStage]}] ${data.tags.join(', ')}`);
    }
    setPendingStage(null);
    toast.success('Notes saved');
  };

  const handleAddNote = async () => {
    if (!user || !noteText.trim()) return;
    setAddingNote(true);
    try { await addNote(user.uid, id, noteText.trim()); setNoteText(''); }
    catch { toast.error('Failed to add note.'); }
    finally { setAddingNote(false); }
  };

  const handleAddPhotos = async (files: FileList | null) => {
    if (!files || !user || !prospect) return;
    const existing = prospect.photos ?? [];
    const remaining = 3 - existing.length;
    if (remaining <= 0) { toast.error('Maximum 3 photos reached.'); return; }
    setAddingPhoto(true);
    try {
      const compressed = await Promise.all(Array.from(files).slice(0, remaining).map(f => compressImage(f)));
      const updated = [...existing, ...compressed];
      await updateProspect(user.uid, id, { photos: updated });
      setProspect(p => p ? { ...p, photos: updated } : p);
      toast.success(`${compressed.length} photo${compressed.length > 1 ? 's' : ''} added`);
    } catch { toast.error('Failed to add photo.'); }
    finally { setAddingPhoto(false); if (photoRef.current) photoRef.current.value = ''; }
  };

  const handleDeletePhoto = async (index: number) => {
    if (!user || !prospect) return;
    const updated = (prospect.photos ?? []).filter((_, i) => i !== index);
    await updateProspect(user.uid, id, { photos: updated });
    setProspect(p => p ? { ...p, photos: updated } : p);
  };

  const handleDelete = async () => {
    if (!user || !confirm('Delete this prospect? This cannot be undone.')) return;
    await deleteProspect(user.uid, id);
    toast.success('Prospect deleted');
    router.replace('/dashboard');
  };

  const handleAddConversation = async (data: Omit<ConversationLog, 'id'>) => {
    if (!user || !prospect) return;
    await addConversation(user.uid, id, prospect.name, data);
    track('call_logged', { call_type: data.callType });
    toast.success('Conversation logged!');
  };

  const handleUpdateConversation = async (convId: string, data: Partial<Omit<ConversationLog, 'id'>>) => {
    if (!user) return;
    await updateConversation(user.uid, id, convId, data);
    toast.success('Conversation updated');
  };

  const handleDeleteConversation = async (convId: string) => {
    if (!user) return;
    await deleteConversation(user.uid, id, convId);
    toast.success('Deleted');
  };

  const handleAddFlag = async (type: 'green' | 'red', text: string, isCustom = false) => {
    if (!user || !prospect) return;
    const now = new Date();
    await addFlag(user.uid, id, prospect.name, {
      type, text, isCustom,
      date: now.toLocaleDateString('en-IN'),
      createdAt: Date.now(),
    });
  };

  const handleDeleteFlag = async (flagId: string, flagType: 'green' | 'red') => {
    if (!user) return;
    await deleteFlag(user.uid, id, flagId, flagType);
    toast.success('Flag removed');
  };

  const handleSaveFamily = async () => {
    if (!user || !prospect) return;
    setSavingFamily(true);
    try {
      await saveFamilyScorecard(user.uid, id, prospect.name, familyScores);
      toast.success('Family score saved!');
    } catch { toast.error('Failed to save.'); }
    finally { setSavingFamily(false); }
  };

  const toggleMeetingItem = async (item: string, list: 'checkedItems' | 'questionsAsked') => {
    if (!user || !prospect) return;
    const current = meetingLocal[list];
    const updated = current.includes(item) ? current.filter(x => x !== item) : [...current, item];
    const newData = { ...meetingLocal, [list]: updated };
    setMeetingLocal(newData);
    await saveMeetingData(user.uid, id, prospect.name, { ...newData, updatedAt: Date.now() });
  };

  const handleSaveMeetingPost = async () => {
    if (!user || !prospect) return;
    setSavingMeeting(true);
    try {
      const existing = meetingLocal.meetings ?? [];
      const updated = [...existing];
      const current = updated[activeMeetingIdx] ?? { meetingNumber: activeMeetingIdx + 1 };
      updated[activeMeetingIdx] = { ...current, meetingNumber: activeMeetingIdx + 1, savedAt: Date.now() };
      const dataToSave = { ...meetingLocal, meetings: updated, updatedAt: Date.now() };
      await saveMeetingData(user.uid, id, prospect.name, dataToSave);
      setMeetingLocal(dataToSave);
      track('meeting_rated', { meeting_number: activeMeetingIdx + 1 });
      toast.success('Meeting rating saved!');
    } catch { toast.error('Failed to save.'); }
    finally { setSavingMeeting(false); }
  };

  const updateActiveMeeting = (updates: Partial<MeetingRecord>) => {
    setMeetingLocal(m => {
      const existing = m.meetings ?? [];
      const updated = [...existing];
      updated[activeMeetingIdx] = { ...updated[activeMeetingIdx] ?? { meetingNumber: activeMeetingIdx + 1 }, ...updates };
      return { ...m, meetings: updated };
    });
  };

  const addMeeting = () => {
    const newIdx = (meetingLocal.meetings?.length ?? 0);
    setMeetingLocal(m => ({ ...m, meetings: [...(m.meetings ?? []), { meetingNumber: newIdx + 1 }] }));
    setActiveMeetingIdx(newIdx);
  };

  const deleteMeeting = async (idx: number) => {
    if (!user || !prospect) return;
    const existing = meetingLocal.meetings ?? [];
    const updated = existing.filter((_, i) => i !== idx).map((m, i) => ({ ...m, meetingNumber: i + 1 }));
    const newActive = Math.min(activeMeetingIdx, Math.max(0, updated.length - 1));
    const newData = { ...meetingLocal, meetings: updated, updatedAt: Date.now() };
    setMeetingLocal(newData);
    setActiveMeetingIdx(newActive);
    await saveMeetingData(user.uid, id, prospect.name, newData);
    toast.success('Meeting removed.');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5ede0' }}>
        <div className="flex flex-col items-center gap-4">
          <Logo className="text-4xl" />
          <div className="gold-spinner" />
        </div>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5ede0' }}>
        <div className="text-center">
          <p style={{ color: '#6b5e4d' }}>Prospect not found.</p>
          <button onClick={() => router.replace('/dashboard')} className="btn-primary mt-4">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const overall = calculateOverallScore(prospect.gunaScore, prospect.compatScore);
  const photos = prospect.photos ?? [];
  const greenFlags = flags.filter(f => f.type === 'green');
  const redFlags = flags.filter(f => f.type === 'red');
  const alreadyFlaggedTexts = new Set(flags.map(f => f.text));

  const isMeetingStage = prospect.stage === 'meeting_fixed' || prospect.stage === 'met';
  const hasKundliData = prospect.nakshatra !== undefined && prospect.nakshatra >= 0;
  const savedMeetings = meetingLocal.meetings ?? [];
  const activeMeeting: MeetingRecord = savedMeetings[activeMeetingIdx] ?? { meetingNumber: activeMeetingIdx + 1 };
  const meetingCount = savedMeetings.filter(m => m.savedAt).length;

  // Two tab groups so the bar mirrors the stepper:
  //  • Journey tabs carry the same step number shown in "Step X of 5" up top.
  //    Meetings covers steps 3–4 (Meeting Fixed + Met); Decision is step 5.
  //  • Reference tabs have no journey step — fill them in anytime.
  const journeyTabs: { id: Tab; label: string; step: string }[] = [
    { id: 'overview', label: 'Overview', step: '1' },
    { id: 'conversations', label: `Calls (${conversations.length})`, step: '2' },
    { id: 'meeting', label: meetingCount > 0 ? `Meetings (${meetingCount})` : 'Meetings', step: '3–4' },
    { id: 'decision', label: DECISION_STAGES.includes(prospect.stage) ? 'Decision ✓' : 'Decision', step: '5' },
  ];
  const referenceTabs: { id: Tab; label: string }[] = [
    { id: 'flags', label: `Flags (${flags.length})` },
    { id: 'family', label: 'Family' },
    { id: 'kundli', label: 'Kundli' },
  ];

  const isDecisionStage = DECISION_STAGES.includes(prospect.stage);
  const currentIdx = isDecisionStage ? JOURNEY_STAGES.length : JOURNEY_STAGES.indexOf(prospect.stage);
  const isTerminal = prospect.stage === 'rejected';

  const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="flex justify-between py-2.5" style={{ borderBottom: '1px solid #f5ede0' }}>
        <span className="text-sm font-semibold" style={{ color: '#c13e2a', minWidth: '40%' }}>{label}</span>
        <span className="text-sm font-medium text-right" style={{ color: '#1a1410', maxWidth: '58%' }}>{String(value)}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: '#f5ede0' }}>
      {/* Lightbox */}
      {lightboxSrc && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" className="max-w-full max-h-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          <button className="absolute top-5 right-5 text-white text-3xl leading-none" onClick={() => setLightboxSrc(null)}>×</button>
        </div>
      )}

      {/* ── Cinematic dossier hero ── */}
      <div style={{
        background: 'linear-gradient(150deg, #1a0c07 0%, #3d1309 55%, #64200f 100%)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Giant watermark initial */}
        <div aria-hidden style={{
          position: 'absolute', top: -30, right: -10, lineHeight: 0.85,
          fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)',
          fontSize: 'clamp(160px, 28vw, 320px)', fontWeight: 700,
          color: 'rgba(255,255,255,0.045)', userSelect: 'none', pointerEvents: 'none',
        }}>
          {prospect.name[0]}
        </div>
        {/* Ambient glows */}
        <div aria-hidden style={{
          position: 'absolute', top: -140, left: '32%', width: 460, height: 460, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(217,164,65,0.14) 0%, rgba(217,164,65,0) 65%)',
          pointerEvents: 'none',
        }} />
        <div aria-hidden style={{
          position: 'absolute', bottom: -160, left: -90, width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(193,62,42,0.28) 0%, rgba(193,62,42,0) 70%)',
          pointerEvents: 'none',
        }} />
        {/* Ring ornaments */}
        <div aria-hidden style={{
          position: 'absolute', top: 26, right: '16%', width: 230, height: 230, borderRadius: '50%',
          border: '1px solid rgba(217,164,65,0.13)', pointerEvents: 'none',
        }} />
        <div aria-hidden style={{
          position: 'absolute', top: 58, right: 'calc(16% + 34px)', width: 162, height: 162, borderRadius: '50%',
          border: '1px dashed rgba(255,255,255,0.08)', pointerEvents: 'none',
        }} />

        {/* Nav row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, padding: '0 16px', position: 'relative', zIndex: 1, maxWidth: 1440, margin: '0 auto' }}>
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            style={{
              width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#f3e7d3', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.14)', cursor: 'pointer', borderRadius: 12,
              transition: 'background 0.18s',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span style={{
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.32em', textTransform: 'uppercase',
            color: 'rgba(217,164,65,0.85)', textIndent: '0.32em',
          }}>
            Prospect Dossier
          </span>
          <button
            onClick={handleDelete}
            aria-label="Delete prospect"
            title="Delete prospect"
            style={{
              width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,203,190,0.9)', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.14)', cursor: 'pointer', borderRadius: 12,
              transition: 'background 0.18s',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M6.5 7v5M9.5 7v5M3 4l.867 9.143A1 1 0 004.86 14h6.28a1 1 0 00.994-.857L13 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Identity + score gauges */}
        <div style={{ padding: '12px 20px 0', position: 'relative', zIndex: 1, maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '18px 28px' }}>

            {/* Avatar with gold halo */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                padding: 3, borderRadius: '50%',
                background: 'conic-gradient(from 220deg, #d9a441, rgba(217,164,65,0.15), #d9a441)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
              }}>
                {photos[0] ? (
                  <img
                    src={photos[0]} alt=""
                    onClick={() => setLightboxSrc(photos[0])}
                    style={{
                      width: 92, height: 92, borderRadius: '50%', objectFit: 'cover',
                      border: '3px solid #1a0c07', cursor: 'pointer', display: 'block',
                    }}
                  />
                ) : (
                  <div style={{
                    width: 92, height: 92, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '3px solid #1a0c07',
                    background: 'linear-gradient(145deg, #4a1a0d, #2a0f08)',
                    color: '#f3e7d3', fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)',
                    fontSize: '2.1rem', fontWeight: 700,
                  }}>
                    {prospect.name[0]}
                  </div>
                )}
              </div>
              {photos.length < 3 && (
                <button
                  onClick={() => photoRef.current?.click()}
                  title="Add photo"
                  style={{
                    position: 'absolute', bottom: 2, right: 2,
                    width: 26, height: 26, borderRadius: '50%',
                    background: '#d9a441', border: '2px solid #1a0c07',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2.5v7M2.5 6h7" stroke="#1a0c07" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Name block */}
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <div style={{
                fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase',
                color: 'rgba(217,164,65,0.9)', marginBottom: 6,
              }}>
                {prospect.source || 'Prospect'}
              </div>
              <h1 style={{
                fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)',
                color: '#fdf6ea', fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', fontWeight: 700,
                lineHeight: 1.08, margin: 0, letterSpacing: '-0.01em',
              }}>
                {prospect.name}
              </h1>
              <div style={{
                marginTop: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 10px',
                fontSize: '0.8rem', color: 'rgba(253,246,234,0.62)', fontWeight: 500,
              }}>
                {[
                  prospect.age && `${prospect.age} yrs`,
                  prospect.city,
                  prospect.height,
                  prospect.profession,
                ].filter(Boolean).map((item, i, arr) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {item}
                    {i < arr.length - 1 && <span aria-hidden style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(217,164,65,0.6)' }} />}
                  </span>
                ))}
              </div>
              {/* Photo strip thumbnails */}
              {photos.length > 1 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  {photos.slice(1).map((src, i) => (
                    <img
                      key={i} src={src} alt=""
                      onClick={() => setLightboxSrc(src)}
                      style={{
                        width: 40, height: 40, borderRadius: 10, objectFit: 'cover',
                        border: '1.5px solid rgba(217,164,65,0.5)', cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Score ring gauges */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, flexShrink: 0 }}>
              {[
                {
                  label: 'Overall',
                  display: overall !== null ? `${overall}` : '—',
                  suffix: overall !== null ? '%' : '',
                  pct: overall ?? 0,
                  color: '#d9a441',
                  warning: null as string | null,
                },
                {
                  label: 'Kundli',
                  display: prospect.gunaScore != null ? `${prospect.gunaScore}` : '—',
                  suffix: prospect.gunaScore != null ? '/36' : '',
                  pct: prospect.gunaScore != null ? (prospect.gunaScore / 36) * 100 : 0,
                  color: prospect.gunaScore != null && prospect.gunaScore < 18 ? '#ff7a5c' : '#8fd6b0',
                  warning: prospect.gunaScore != null && prospect.gunaScore < 18 ? 'Low match' : null,
                },
                {
                  label: 'Compat',
                  display: prospect.compatScore != null ? `${prospect.compatScore}` : '—',
                  suffix: prospect.compatScore != null ? '%' : '',
                  pct: prospect.compatScore ?? 0,
                  color: '#8fd6b0',
                  warning: null as string | null,
                },
              ].map(({ label, display, suffix, pct, color, warning }, gi) => {
                const R = 30;
                const CIRC = 2 * Math.PI * R;
                return (
                  <div key={label} className="hero-score-chip" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '4px 8px' }}>
                    <div style={{ position: 'relative', width: 78, height: 78 }}>
                      <svg width="78" height="78" viewBox="0 0 78 78">
                        <circle cx="39" cy="39" r={R} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                        <circle
                          className="gauge-fill"
                          cx="39" cy="39" r={R} fill="none"
                          stroke={color} strokeWidth="5" strokeLinecap="round"
                          strokeDasharray={CIRC}
                          strokeDashoffset={CIRC * (1 - Math.min(pct, 100) / 100)}
                          transform="rotate(-90 39 39)"
                          style={{ '--circ': `${CIRC}`, animationDelay: `${0.25 + gi * 0.12}s` } as React.CSSProperties}
                        />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)', fontSize: '1.15rem', fontWeight: 800, color: '#fdf6ea', lineHeight: 1 }}>
                          {display}<span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(253,246,234,0.55)' }}>{suffix}</span>
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: warning ? '#ff9a82' : 'rgba(253,246,234,0.55)', textIndent: '0.18em' }}>
                      {warning ?? label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Spacer for the overlapping journey card */}
        <div style={{ height: 52 }} />
      </div>

      {/* ── Journey stepper — floating card ── */}
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 16px', position: 'relative', zIndex: 2, marginTop: -32 }}>
        <div style={{
          background: 'white', borderRadius: 22, border: '1px solid #eee4d4',
          boxShadow: '0 16px 44px rgba(38,16,8,0.16)', overflow: 'hidden',
        }}>
          {/* Ambient progress strip along the card's top edge */}
          <div aria-hidden style={{ height: 3, background: '#f5eee1' }}>
            <div style={{
              height: '100%',
              width: `${((currentIdx + 1) / (JOURNEY_STAGES.length + 1)) * 100}%`,
              background: 'linear-gradient(90deg, #d9a441, #c13e2a)',
              transition: 'width 0.5s ease',
            }} />
          </div>

          {/* Header — current stage + journey actions */}
          <div className="journey-head" style={{ padding: '13px 14px 0 18px' }}>
            <div className="journey-head-main">
              <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#b08a4f', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                The Journey · Step {currentIdx + 1} of {JOURNEY_STAGES.length + 1}
              </div>
              <div style={{ fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)', fontSize: '1.15rem', fontWeight: 700, color: '#241209', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isDecisionStage ? DECISION_INFO[prospect.stage].label : JOURNEY_LABELS[prospect.stage]}
              </div>
            </div>
            <div className="journey-head-actions">
              <button
                disabled={currentIdx === 0}
                onClick={() => currentIdx > 0 && changeStage(JOURNEY_STAGES[currentIdx - 1])}
                aria-label={currentIdx > 0 ? `Back to ${JOURNEY_LABELS[JOURNEY_STAGES[currentIdx - 1]]}` : 'At the first step'}
                title={currentIdx > 0 ? `Back to ${JOURNEY_LABELS[JOURNEY_STAGES[currentIdx - 1]]}` : undefined}
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid', borderColor: currentIdx === 0 ? '#f0e7d8' : '#e2d5bf',
                  background: 'white',
                  color: currentIdx === 0 ? '#d8cbb4' : '#6b5a44',
                  cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.18s', flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {isDecisionStage ? (
                prospect.stage === 'interested' ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '9px 14px', borderRadius: 12,
                    border: '1.5px solid rgba(45,107,79,0.3)',
                    background: 'rgba(45,107,79,0.08)',
                    color: '#2D6B4F', fontWeight: 800, fontSize: '0.76rem',
                    flexShrink: 0,
                  }}>
                    ✓ Decided
                  </div>
                ) : (
                  <button
                    onClick={() => changeStage('met')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '10px 16px', borderRadius: 12, border: 'none',
                      background: 'linear-gradient(135deg, #c13e2a, #8B2A2A)',
                      color: 'white', fontWeight: 800, fontSize: '0.78rem',
                      cursor: 'pointer', boxShadow: '0 5px 16px rgba(193,62,42,0.35)',
                      transition: 'all 0.18s', flexShrink: 0,
                    }}
                  >
                    Reopen
                  </button>
                )
              ) : (
                <button
                  onClick={() => {
                    if (currentIdx < JOURNEY_STAGES.length - 1) {
                      changeStage(JOURNEY_STAGES[currentIdx + 1] as ProspectStage);
                    } else {
                      openTab('decision');
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '10px 16px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #c13e2a, #8B2A2A)',
                    color: 'white', fontWeight: 800, fontSize: '0.78rem',
                    cursor: 'pointer', boxShadow: '0 5px 16px rgba(193,62,42,0.35)',
                    transition: 'all 0.18s', flexShrink: 0,
                  }}
                >
                  {currentIdx < JOURNEY_STAGES.length - 1
                    ? <span>{ADVANCE_LABELS[JOURNEY_STAGES[currentIdx + 1]] ?? JOURNEY_LABELS[JOURNEY_STAGES[currentIdx + 1]]}</span>
                    : <span>Make a Decision</span>}
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                    <path d="M8 5L13 10L8 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Stepper rail */}
          <div className="scrollbar-none" style={{ overflowX: 'auto', padding: '16px 18px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content', width: '100%' }}>
              {([...JOURNEY_STAGES, 'decision'] as string[]).map((stage, idx) => {
                const isDecisionPill = stage === 'decision';
                const isDone = currentIdx > idx;
                const isCurrent = currentIdx === idx && !isDecisionPill;
                const isDecisionActive = isDecisionPill && (isDecisionStage || activeTab === 'decision');
                const decisionInfo = isDecisionPill && isDecisionStage ? DECISION_INFO[prospect.stage] : null;
                const label = isDecisionPill
                  ? (decisionInfo?.label ?? 'Decision')
                  : (stage === 'met' && meetingCount > 1 ? `Met (${meetingCount})` : JOURNEY_LABELS[stage]);
                const nodeAccent = decisionInfo?.color ?? '#c13e2a';
                return (
                  <div key={stage} style={{ display: 'flex', alignItems: 'flex-start', flex: idx < JOURNEY_STAGES.length ? '1 0 auto' : '0 0 auto' }}>
                    <button
                      onClick={() => {
                        if (isDecisionPill) { openTab('decision'); return; }
                        if (idx > currentIdx) { changeStage(stage as ProspectStage); return; }
                        openTab(STAGE_TAB[stage] ?? 'overview');
                      }}
                      aria-label={isDecisionPill ? 'Decision' : JOURNEY_LABELS[stage]}
                      title={isDecisionPill
                        ? 'Open the decision tab'
                        : idx > currentIdx
                        ? `Move journey to “${JOURNEY_LABELS[stage]}”`
                        : `Review ${JOURNEY_LABELS[stage]}`}
                      className="journey-node"
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        width: 64, flexShrink: 0,
                        animationDelay: `${idx * 0.06}s`,
                      }}
                    >
                      <div style={{ position: 'relative', width: 40, height: 40 }}>
                        {(isCurrent || (isDecisionPill && isDecisionStage)) && (
                          <span className="stage-pulse-ring" aria-hidden style={{
                            position: 'absolute', inset: 7, borderRadius: '50%',
                            border: `2px solid ${nodeAccent}`,
                          }} />
                        )}
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isDone
                            ? 'linear-gradient(145deg, #c13e2a, #8B2A2A)'
                            : isDecisionPill && isDecisionStage
                            ? decisionInfo!.bg
                            : (isCurrent || isDecisionActive)
                            ? 'white'
                            : '#faf6ef',
                          border: isDone
                            ? 'none'
                            : isDecisionPill && isDecisionStage
                            ? `2px solid ${decisionInfo!.color}`
                            : (isCurrent || isDecisionActive)
                            ? '2px solid #c13e2a'
                            : '1.5px solid #e7dcc8',
                          boxShadow: isDone
                            ? '0 3px 10px rgba(193,62,42,0.3)'
                            : (isCurrent || isDecisionActive)
                            ? '0 3px 12px rgba(193,62,42,0.18)'
                            : 'none',
                          transition: 'all 0.25s ease',
                        }}>
                          {isDone ? (
                            <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                              <path d="M1.5 5.5L5 9L12.5 1.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            stageIcon(stage, isDecisionPill && isDecisionStage ? decisionInfo!.color : (isCurrent || isDecisionActive) ? '#c13e2a' : '#b3a48b')
                          )}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.67rem',
                        fontWeight: (isCurrent || isDecisionActive) ? 800 : isDone ? 600 : 500,
                        color: isDecisionPill && isDecisionStage
                          ? decisionInfo!.color
                          : (isCurrent || isDecisionActive) ? '#c13e2a' : isDone ? '#241209' : '#b3a48b',
                        whiteSpace: 'nowrap', letterSpacing: '0.02em',
                      }}>
                        {label}
                      </span>
                    </button>
                    {idx < JOURNEY_STAGES.length && (
                      <div aria-hidden style={{
                        flex: '1 1 26px', minWidth: 18, height: 2, borderRadius: 2, marginTop: 19,
                        background: idx < currentIdx
                          ? 'linear-gradient(90deg, #c13e2a, #d9a441)'
                          : '#eee4d4',
                        transition: 'background 0.3s ease',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky tab dock ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(245,237,224,0.88)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(38,16,8,0.07)',
        marginTop: 14,
      }}>
        <div className="scrollbar-none" style={{ overflowX: 'auto', maxWidth: 1440, margin: '0 auto', padding: '10px 16px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, minWidth: 'max-content' }}>
            {/* Journey group — numbered to match "Step X of 5" up top */}
            <div style={{
              display: 'inline-flex', gap: 3,
              background: 'white', border: '1px solid #eee4d4', borderRadius: 999, padding: 4,
              boxShadow: '0 2px 12px rgba(38,16,8,0.07)',
            }}>
              {journeyTabs.map(t => {
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    className={flashTab === t.id ? 'tab-flash' : undefined}
                    onClick={() => setActiveTab(t.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      padding: '7px 15px 7px 8px', borderRadius: 999, border: 'none', cursor: 'pointer',
                      fontSize: '0.78rem', whiteSpace: 'nowrap',
                      fontWeight: active ? 700 : 500,
                      background: active ? '#241209' : 'transparent',
                      color: active ? '#f5e9d4' : '#8a7a63',
                      boxShadow: active ? '0 4px 12px rgba(36,18,9,0.28)' : 'none',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 20, height: 20, padding: '0 5px', borderRadius: 999,
                      fontSize: '0.62rem', fontWeight: 800, lineHeight: 1,
                      background: active ? 'rgba(245,233,212,0.18)' : '#f4ece0',
                      color: active ? '#f5e9d4' : '#b08a4f',
                    }}>{t.step}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Reference group — no journey step, use anytime */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: 'white', border: '1px solid #eee4d4', borderRadius: 999, padding: '4px 4px 4px 12px',
              boxShadow: '0 2px 12px rgba(38,16,8,0.07)',
            }}>
              <span style={{ fontSize: '0.56rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c4b291', paddingRight: 4, whiteSpace: 'nowrap' }}>Reference</span>
              {referenceTabs.map(t => {
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    className={flashTab === t.id ? 'tab-flash' : undefined}
                    onClick={() => setActiveTab(t.id)}
                    style={{
                      padding: '7px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
                      fontSize: '0.78rem', whiteSpace: 'nowrap',
                      fontWeight: active ? 700 : 500,
                      background: active ? '#241209' : 'transparent',
                      color: active ? '#f5e9d4' : '#8a7a63',
                      boxShadow: active ? '0 4px 12px rgba(36,18,9,0.28)' : 'none',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '16px 20px 0' }}>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (() => {
          return (
            <>
              {/* Hidden file input */}
              <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={e => handleAddPhotos(e.target.files)} />

              {/* ── Edit toolbar ── */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 14 }}>
                {!editing ? (
                  <button onClick={startEdit}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: '#c13e2a', background: 'rgba(193,62,42,0.06)', border: '1.5px solid rgba(193,62,42,0.35)', borderRadius: 20, padding: '7px 16px', cursor: 'pointer' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="#c13e2a" strokeWidth="1.8" strokeLinecap="round"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="#c13e2a" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                    Edit Details
                  </button>
                ) : (
                  <>
                    <button onClick={cancelEdit} disabled={savingEdit}
                      style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b5e4d', background: 'white', border: '1px solid #d6c9b0', borderRadius: 20, padding: '7px 16px', cursor: 'pointer' }}>
                      Cancel
                    </button>
                    <button onClick={saveEdit} disabled={savingEdit}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'white', background: 'linear-gradient(135deg, #d44d36, #b83521)', border: 'none', borderRadius: 20, padding: '7px 18px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(193,62,42,0.3)' }}>
                      {savingEdit ? <span className="gold-spinner" style={{ width: 13, height: 13, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : null}
                      {savingEdit ? 'Saving…' : 'Save Changes'}
                    </button>
                  </>
                )}
              </div>

              {/* ── 2-column grid ── */}
              <div
                className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 md:gap-5"
                style={{ alignItems: 'start' }}
              >

                {/* ════ LEFT SIDEBAR ════ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Photos card */}
                  <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #f0ebe2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(193,62,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="5" width="18" height="14" rx="3" stroke="#c13e2a" strokeWidth="1.6"/>
                            <circle cx="12" cy="12" r="3.5" stroke="#c13e2a" strokeWidth="1.6"/>
                            <path d="M8.5 5l1-2h5l1 2" stroke="#c13e2a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                          Photos <span style={{ color: '#a89e92', fontWeight: 500 }}>({photos.length}/3)</span>
                        </span>
                      </div>
                      {photos.length < 3 && (
                        <button onClick={() => photoRef.current?.click()} disabled={addingPhoto}
                          style={{ fontSize: '0.72rem', fontWeight: 600, color: '#c13e2a', background: 'rgba(193,62,42,0.08)', border: '1px solid rgba(193,62,42,0.22)', borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
                          {addingPhoto ? 'Adding…' : '+ Add'}
                        </button>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px 14px' }}>
                      {/* Primary photo — tall portrait */}
                      {photos[0] ? (
                        <div className="relative group" style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
                          <img src={photos[0]} alt="" onClick={() => setLightboxSrc(photos[0])}
                            style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', cursor: 'pointer', display: 'block' }} />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          <button onClick={() => handleDeletePhoto(0)}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full text-white text-xs items-center justify-center leading-none hidden group-hover:flex"
                            style={{ background: 'rgba(139,42,42,0.9)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.3)' }}>×</button>
                        </div>
                      ) : (
                        <button onClick={() => photoRef.current?.click()} disabled={addingPhoto}
                          style={{ width: '100%', aspectRatio: '3/4', borderRadius: 12, cursor: 'pointer', border: '2px dashed #d6c9b0', background: 'rgba(214,201,176,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#a89e92', fontSize: '0.75rem', fontWeight: 500 }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#a89e92" strokeWidth="1.8" strokeLinecap="round"/></svg>
                          Add Photo
                        </button>
                      )}
                      {/* Secondary photos row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[1, 2].map(i => (
                          photos[i] ? (
                            <div key={i} className="relative group" style={{ borderRadius: 10, overflow: 'hidden' }}>
                              <img src={photos[i]} alt="" onClick={() => setLightboxSrc(photos[i])}
                                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', cursor: 'pointer', display: 'block' }} />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
                              <button onClick={() => handleDeletePhoto(i)}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full text-white text-xs items-center justify-center leading-none hidden group-hover:flex"
                                style={{ background: 'rgba(139,42,42,0.9)', backdropFilter: 'blur(4px)' }}>×</button>
                            </div>
                          ) : (
                            <button key={i} onClick={() => photoRef.current?.click()} disabled={addingPhoto}
                              style={{ aspectRatio: '1', borderRadius: 10, cursor: 'pointer', border: '2px dashed #d6c9b0', background: 'rgba(214,201,176,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a89e92' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#a89e92" strokeWidth="2" strokeLinecap="round"/></svg>
                            </button>
                          )
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Scores summary card */}
                  <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #f0ebe2', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(193,62,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" stroke="#c13e2a" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Compatibility</span>
                    </div>
                    <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {[
                        { label: 'Overall Score', value: overall, display: overall !== null ? `${overall}%` : '—', color: '#c13e2a', max: 100 },
                        { label: 'Kundli (Guna)', value: prospect.gunaScore ?? null, display: prospect.gunaScore != null ? `${prospect.gunaScore}/36` : '—', color: prospect.gunaScore != null && prospect.gunaScore < 18 ? '#8B2A2A' : '#4A3728', max: 36, lowMatch: prospect.gunaScore != null && prospect.gunaScore < 18 },
                        { label: 'Compatibility', value: prospect.compatScore ?? null, display: prospect.compatScore != null ? `${prospect.compatScore}%` : '—', color: '#2D6B4F', max: 100 },
                      ].map(({ label, value, display, color, max, lowMatch }: { label: string; value: number | null; display: string; color: string; max: number; lowMatch?: boolean }) => (
                        <div key={label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.78rem', color: '#6b5e4d', fontWeight: 500 }}>{label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {lowMatch && (
                                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8B2A2A', background: 'rgba(139,42,42,0.1)', border: '1px solid rgba(139,42,42,0.25)', borderRadius: 20, padding: '1px 7px', letterSpacing: '0.03em' }}>
                                  Doesn't Match
                                </span>
                              )}
                              <span style={{ fontSize: '0.9rem', fontWeight: 800, color, fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)' }}>{display}</span>
                            </div>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: '#f0ebe2', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 3,
                              background: `linear-gradient(90deg, ${color}, ${color}99)`,
                              width: value != null ? `${(value / max) * 100}%` : '0%',
                              transition: 'width 0.6s ease',
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick contact card */}
                  {(editing || prospect.phone) && (
                    <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Contact</span>
                      {editing && editForm ? (
                        <input type="tel" value={editForm.phone} placeholder="Contact number"
                          onChange={e => setEdit('phone', e.target.value)}
                          style={{ width: '100%', border: '1.5px solid #d6c9b0', borderRadius: 10, padding: '8px 10px', fontSize: '0.85rem', color: '#1a1410', background: 'white', outline: 'none' }} />
                      ) : (
                        <a href={`tel:${prospect.phone}`}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'linear-gradient(135deg, #c13e2a, #8B2A2A)', color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5 19.79 19.79 0 01.01 4.82 2 2 0 012 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.91a16 16 0 006.72 6.72l1.28-1.28a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {prospect.phone}
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* ════ RIGHT MAIN AREA ════ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Personal */}
                  <SectionCard icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#c13e2a" strokeWidth="1.6"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#c13e2a" strokeWidth="1.6" strokeLinecap="round"/></svg>} title="Personal" cols={3}>
                    {editing && editForm ? (
                      <>
                        <EditChip label="Age" type="number" value={editForm.age} onChange={v => setEdit('age', v)} />
                        <EditChip label="City" value={editForm.city} onChange={v => setEdit('city', v)} />
                        <EditChip label="Height" value={editForm.height} onChange={v => setEdit('height', v)} placeholder={`5'6"`} />
                        <EditPills label="Diet" options={['Pure Veg', 'Jain', 'Eggetarian', 'Non-Veg']} value={editForm.diet} onChange={v => setEdit('diet', v)} />
                        <EditPills label="Source" options={SOURCE_OPTIONS} value={editForm.source} onChange={v => setEdit('source', v)} />
                        <DetailChip label="Added" value={prospect.addedDate} />
                      </>
                    ) : (
                      <>
                        <DetailChip label="Age" value={prospect.age} />
                        <DetailChip label="City" value={prospect.city} />
                        <DetailChip label="Height" value={prospect.height} />
                        <DetailChip label="Diet" value={prospect.diet} />
                        <DetailChip label="Source" value={prospect.source} />
                        <DetailChip label="Added" value={prospect.addedDate} />
                      </>
                    )}
                  </SectionCard>

                  {/* Professional */}
                  {(editing || prospect.education || prospect.profession || prospect.income) && (
                    <SectionCard icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" stroke="#c13e2a" strokeWidth="1.6" strokeLinejoin="round"/><path d="M9 22V12h6v10" stroke="#c13e2a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>} title="Professional" cols={3}>
                      {editing && editForm ? (
                        <>
                          <EditChip label="Education" value={editForm.education} onChange={v => setEdit('education', v)} placeholder="e.g. B.Tech, MBA" />
                          <EditChip label="Profession" value={editForm.profession} onChange={v => setEdit('profession', v)} />
                          <EditPills label="Income" options={['< 5 LPA', '5-10', '10-20', '20-35', '35-50', '50+']} value={editForm.income} onChange={v => setEdit('income', v)} />
                          <EditChip label="Property" value={editForm.property} onChange={v => setEdit('property', v)} />
                        </>
                      ) : (
                        <>
                          <DetailChip label="Education" value={prospect.education} />
                          <DetailChip label="Profession" value={prospect.profession} />
                          <DetailChip label="Income" value={prospect.income} />
                          <DetailChip label="Property" value={prospect.property} />
                        </>
                      )}
                    </SectionCard>
                  )}

                  {/* Astrological + Family side-by-side on wide screens */}
                  <div className="grid grid-cols-1 min-[1100px]:grid-cols-2 gap-4">
                    {(editing || prospect.rashi || prospect.nakshatra !== undefined || prospect.manglik || prospect.gotra || prospect.dobDate) && (
                      <SectionCard icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" stroke="#c13e2a" strokeWidth="1.5" strokeLinejoin="round"/></svg>} title="Astrological" cols={2}>
                        {editing && editForm ? (
                          <>
                            <EditNakshatra value={editForm.nakshatra} onChange={v => setEdit('nakshatra', v)} />
                            <EditChip label="Rashi" value={editForm.rashi} onChange={v => setEdit('rashi', v)} />
                            <EditPills label="Manglik" options={['Yes', 'No', 'Partial', "Don't Know"]} value={editForm.manglik} onChange={v => setEdit('manglik', v)} />
                            <EditChip label="Gotra" value={editForm.gotra} onChange={v => setEdit('gotra', v)} />
                            <EditChip label="DOB" type="date" value={editForm.dobDate} onChange={v => setEdit('dobDate', v)} />
                            <EditChip label="Birth Time" type="time" value={editForm.dobTime} onChange={v => setEdit('dobTime', v)} />
                            <EditChip label="Birth Place" value={editForm.dobPlace} onChange={v => setEdit('dobPlace', v)} />
                            <div style={{ gridColumn: '1 / -1' }}>
                              <button type="button" onClick={recalcEditKundli}
                                style={{ width: '100%', fontSize: '0.76rem', fontWeight: 700, color: '#b8892b', background: 'rgba(184,137,43,0.08)', border: '1px solid rgba(184,137,43,0.35)', borderRadius: 10, padding: '8px', cursor: 'pointer' }}>
                                ✨ Recalculate Nakshatra from birth details
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <DetailChip label="Rashi" value={prospect.rashi} />
                            <DetailChip label="Nakshatra" value={prospect.nakshatra !== undefined ? NAKSHATRAS[prospect.nakshatra] : null} />
                            <DetailChip label="Manglik" value={prospect.manglik} />
                            <DetailChip label="Gotra" value={prospect.gotra} />
                            <DetailChip label="DOB" value={prospect.dobDate} />
                            <DetailChip label="Birth Time" value={prospect.dobTime} />
                            <DetailChip label="Birth Place" value={prospect.dobPlace} />
                          </>
                        )}
                      </SectionCard>
                    )}
                    {(editing || prospect.familyType || prospect.fatherOcc || prospect.motherOcc || prospect.siblings) && (
                      <SectionCard icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#c13e2a" strokeWidth="1.6" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="#c13e2a" strokeWidth="1.6"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#c13e2a" strokeWidth="1.6" strokeLinecap="round"/></svg>} title="Family Background" cols={2}>
                        {editing && editForm ? (
                          <>
                            <EditPills label="Family Type" options={['Joint', 'Nuclear']} value={editForm.familyType} onChange={v => setEdit('familyType', v)} />
                            <EditChip label="Father's Occ." value={editForm.fatherOcc} onChange={v => setEdit('fatherOcc', v)} />
                            <EditChip label="Mother's Occ." value={editForm.motherOcc} onChange={v => setEdit('motherOcc', v)} />
                            <EditChip label="Siblings" value={editForm.siblings} onChange={v => setEdit('siblings', v)} />
                          </>
                        ) : (
                          <>
                            <DetailChip label="Family Type" value={prospect.familyType} />
                            <DetailChip label="Father's Occ." value={prospect.fatherOcc} />
                            <DetailChip label="Mother's Occ." value={prospect.motherOcc} />
                            <DetailChip label="Siblings" value={prospect.siblings} />
                          </>
                        )}
                      </SectionCard>
                    )}
                  </div>

                  {/* Hobbies & Interests */}
                  {(editing || (prospect.hobbies && prospect.hobbies.length > 0)) && (
                    <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #f0ebe2', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(193,62,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="#c13e2a" strokeWidth="1.6" strokeLinejoin="round"/></svg>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Hobbies & Interests</span>
                      </div>
                      <div style={{ padding: '12px 14px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {editing && editForm ? (
                          <EditHobbies selected={editForm.hobbies} onToggle={toggleEditHobby} />
                        ) : (
                          prospect.hobbies!.map(h => (
                            <span key={h} style={{ background: '#faf8f5', border: '1px solid #ede8df', borderRadius: 20, padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600, color: '#1a1410' }}>
                              {h}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* First Impression */}
                  {(editing || prospect.firstImpression) && (
                    <div style={{ background: 'linear-gradient(135deg, #fff8f3 0%, #fff3ed 100%)', borderRadius: 18, border: '1px solid rgba(193,62,42,0.18)', boxShadow: '0 2px 14px rgba(193,62,42,0.07)', padding: '16px 18px 18px', position: 'relative', overflow: 'hidden' }}>
                      <div aria-hidden style={{ position: 'absolute', top: -8, left: 10, fontFamily: 'Georgia, serif', fontSize: '5rem', lineHeight: 1, color: 'rgba(193,62,42,0.12)', fontWeight: 900, userSelect: 'none' }}>&#8220;</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(193,62,42,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="#c13e2a" strokeWidth="1.6" strokeLinejoin="round"/></svg>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>First Impression</span>
                      </div>
                      {editing && editForm ? (
                        <textarea value={editForm.firstImpression} placeholder="Your initial thoughts…" rows={3}
                          onChange={e => setEdit('firstImpression', e.target.value)}
                          style={{ width: '100%', border: '1.5px solid #d6c9b0', borderRadius: 10, padding: '8px 10px', fontSize: '0.85rem', color: '#1a1410', background: 'white', outline: 'none', resize: 'vertical', position: 'relative', zIndex: 1 }} />
                      ) : (
                        <p style={{ fontSize: '0.88rem', lineHeight: 1.65, color: '#1a1410', fontStyle: 'italic', position: 'relative', zIndex: 1, margin: 0 }}>
                          {prospect.firstImpression}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #f0ebe2', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(193,62,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#c13e2a" strokeWidth="1.6" strokeLinejoin="round"/>
                          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#c13e2a" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Notes</span>
                      {notes.length > 0 && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'white', background: '#c13e2a', borderRadius: 20, padding: '1px 7px' }}>{notes.length}</span>
                      )}
                    </div>
                    {/* Compose */}
                    <div style={{ padding: '12px 14px', borderBottom: notes.length > 0 ? '1px solid #f0ebe2' : 'none' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #c13e2a, #8B2A2A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)' }}>
                          {(profile?.name?.[0] ?? 'U').toUpperCase()}
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <input type="text" placeholder="Write a note…" value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                            style={{ width: '100%', border: '1.5px solid #e8dece', borderRadius: 24, padding: '9px 44px 9px 14px', outline: 'none', background: '#faf8f5', fontFamily: 'inherit', fontSize: '0.85rem', color: '#1a1410', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                            onFocus={e => { e.currentTarget.style.borderColor = '#c13e2a'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(193,62,42,0.1)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#e8dece'; e.currentTarget.style.boxShadow = 'none'; }}
                          />
                          <button onClick={handleAddNote} disabled={addingNote || !noteText.trim()}
                            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', background: noteText.trim() ? '#c13e2a' : '#e8dece', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.18s' }}>
                            <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M4 10h12M11 5l5 5-5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Bubbles */}
                    {notes.length > 0 ? (
                      <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {notes.map(n => (
                          <div key={n.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #c13e2a, #8B2A2A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)', marginTop: 2 }}>
                              {(profile?.name?.[0] ?? 'U').toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ background: '#faf8f5', borderRadius: '4px 14px 14px 14px', border: '1px solid #ede8df', padding: '9px 13px' }}>
                                <p style={{ fontSize: '0.85rem', color: '#1a1410', margin: 0, lineHeight: 1.55 }}>{n.text}</p>
                              </div>
                              <p style={{ fontSize: '0.65rem', color: '#a89e92', marginTop: 4, marginLeft: 4 }}>{n.date}{n.time ? ` · ${n.time}` : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>📝</div>
                        <p style={{ fontSize: '0.82rem', color: '#a89e92', margin: 0 }}>No notes yet — add your first one above</p>
                      </div>
                    )}
                  </div>
                </div>{/* end right column */}
              </div>{/* end overview-grid */}
            </>
          );
        })()}

        {/* ── NON-OVERVIEW TABS ── */}
        {activeTab !== 'overview' && (
        <>

        {/* ── CONVERSATIONS TAB ── */}
        {activeTab === 'conversations' && (
          <ConversationTimeline
            conversations={conversations}
            onAdd={handleAddConversation}
            onUpdate={handleUpdateConversation}
            onDelete={handleDeleteConversation}
          />
        )}

        {/* ── FLAGS TAB ── */}
        {activeTab === 'flags' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── The Balance: live green-vs-red verdict ── */}
            {(() => {
              const g = greenFlags.length, r = redFlags.length, tot = g + r;
              const gp = tot ? (g / tot) * 100 : 50;
              const ratio = tot ? g / tot : 0.5;
              let verdict: string, vColor: string, vEmoji: string, vSub: string;
              let vFlag: 'green' | 'red' | null = null;
              if (tot === 0) {
                verdict = 'Nothing flagged yet'; vColor = '#a08b6e'; vEmoji = '🕊️';
                vSub = 'Tap the good & watch-out signs below as you notice them.';
              } else if (ratio >= 0.7) {
                verdict = 'Looking promising'; vColor = '#2D6B4F'; vEmoji = ''; vFlag = 'green';
                vSub = 'The greens clearly outweigh the reds so far.';
              } else if (ratio >= 0.55) {
                verdict = 'Leaning positive'; vColor = '#3F8A5C'; vEmoji = ''; vFlag = 'green';
                vSub = 'More good signs than concerns — keep observing.';
              } else if (ratio >= 0.45) {
                verdict = 'Mixed signals'; vColor = '#D98A1E'; vEmoji = '⚖️';
                vSub = 'Fairly balanced. Weigh which flags matter most to you.';
              } else if (ratio >= 0.3) {
                verdict = 'Proceed with caution'; vColor = '#C4622A'; vEmoji = ''; vFlag = 'red';
                vSub = 'The concerns are starting to outweigh the positives.';
              } else {
                verdict = 'Serious concerns'; vColor = '#8B2A2A'; vEmoji = ''; vFlag = 'red';
                vSub = 'Red flags dominate — think carefully before moving ahead.';
              }
              return (
                <div style={{ background: 'white', borderRadius: 18, border: '1px solid #eee4d4', boxShadow: '0 2px 14px rgba(38,16,8,0.05)', padding: '15px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                        {vFlag ? <FlagIcon color={vFlag === 'green' ? FLAG_GREEN : FLAG_RED} size={22} /> : <span style={{ fontSize: '1.2rem' }}>{vEmoji}</span>}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)', fontSize: '1.05rem', fontWeight: 700, color: '#241209', lineHeight: 1.15 }}>{verdict}</div>
                        <div style={{ fontSize: '0.72rem', color: '#a08b6e', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vSub}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontWeight: 800, color: '#2D6B4F' }}><FlagIcon color={FLAG_GREEN} size={13} />{g}</span>
                      <span style={{ width: 1, height: 14, background: '#eadfce' }} />
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontWeight: 800, color: '#8B2A2A' }}><FlagIcon color={FLAG_RED} size={13} />{r}</span>
                    </div>
                  </div>

                  {/* Tug-of-war bar */}
                  <div style={{ marginTop: 12, position: 'relative' }}>
                    <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: '#efe7da' }}>
                      <div style={{ width: `${gp}%`, background: tot ? 'linear-gradient(90deg, #2D6B4F, #3F8A5C)' : 'transparent', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
                      <div style={{ flex: 1, background: tot ? 'linear-gradient(90deg, #A83636, #8B2A2A)' : 'transparent', transition: 'all 0.6s' }} />
                    </div>
                    {tot > 0 && (
                      <div style={{ position: 'absolute', top: '50%', left: `${gp}%`, transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: '50%', background: 'white', border: `2.5px solid ${vColor}`, boxShadow: '0 1px 4px rgba(0,0,0,0.18)', transition: 'left 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── Green & Red pickers, side by side ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'stretch' }}>
              {([
                {
                  type: 'green' as const, title: 'Good Signs', accent: '#2D6B4F',
                  cats: [
                    { label: 'Communication', emoji: '🗣️', flags: ['Respectful in conversation', 'Good listener — asks questions back', 'Honest and transparent', 'Mature way of handling disagreements', 'Consistent behavior — no mixed signals'] },
                    { label: 'Values & Character', emoji: '🌟', flags: ['Respects your opinions even when disagreeing', 'Supportive of your career/ambitions', 'Good sense of humor', 'Makes effort to know your family'] },
                    { label: 'Family & Lifestyle', emoji: '🏡', flags: ['Family is warm and welcoming', 'Speaks well about their family', 'Has hobbies and interests beyond work'] },
                    { label: 'Responsibility', emoji: '💼', flags: ['Clear about career goals', 'Financially responsible', 'Punctual — calls/meets on time'] },
                  ],
                },
                {
                  type: 'red' as const, title: 'Watch-Outs', accent: '#8B2A2A',
                  cats: [
                    { label: 'Communication', emoji: '💬', flags: ['Rude or dismissive in conversation', 'Avoids answering direct questions', 'Talks only about themselves', 'Inconsistent — says one thing, does another'] },
                    { label: 'Respect & Attitude', emoji: '⚠️', flags: ['Disrespectful about your career/education', 'Controlling behavior — tells you what to do', 'Pressuring for quick decision', 'Disrespectful to waitstaff/service people'] },
                    { label: 'Family & Lifestyle', emoji: '🏚️', flags: ['Family is demanding or rude', "Bad-mouths their own family", 'Very different lifestyle expectations', 'Drinks/smokes but hid it initially'] },
                    { label: 'Trust & Honesty', emoji: '🔍', flags: ['Unclear about finances / suspicious', 'Still seems attached to an ex', 'Lies or exaggerates about themselves'] },
                  ],
                },
              ]).map(panel => {
                const rgb = panel.type === 'green' ? '45,107,79' : '139,42,42';
                return (
                  <div key={panel.type} style={{ background: 'white', borderRadius: 20, border: `1px solid rgba(${rgb},0.22)`, boxShadow: `0 4px 18px rgba(${rgb},0.06)`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '14px 16px', borderBottom: `1px solid rgba(${rgb},0.12)`, display: 'flex', alignItems: 'center', gap: 10, background: `rgba(${rgb},0.04)` }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: `rgba(${rgb},0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FlagIcon color={panel.accent} size={17} /></div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)', fontSize: '1rem', fontWeight: 700, color: panel.accent, lineHeight: 1.1 }}>{panel.title}</div>
                        <div style={{ fontSize: '0.66rem', color: '#a08b6e', marginTop: 1 }}>Tap what you&apos;ve noticed</div>
                      </div>
                    </div>
                    <div style={{ padding: '14px 16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {panel.cats.map(cat => (
                        <div key={cat.label}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
                            <span style={{ width: 3, height: 12, borderRadius: 2, background: panel.accent, opacity: 0.55 }} />
                            <span style={{ fontSize: '0.78rem' }}>{cat.emoji}</span>
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: panel.accent, textTransform: 'uppercase', letterSpacing: '0.09em', opacity: 0.9 }}>{cat.label}</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                            {cat.flags.map(f => {
                              const already = alreadyFlaggedTexts.has(f);
                              return (
                                <button key={f} type="button" onClick={() => !already && handleAddFlag(panel.type, f)} disabled={already}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 999,
                                    border: `1.5px solid ${already ? panel.accent : `rgba(${rgb},0.28)`}`,
                                    background: already ? panel.accent : 'white',
                                    color: already ? 'white' : panel.accent, fontSize: '0.76rem', fontWeight: already ? 700 : 500,
                                    cursor: already ? 'default' : 'pointer', transition: 'all 0.15s', lineHeight: 1.25,
                                  }}
                                  onMouseEnter={e => { if (!already) { e.currentTarget.style.background = `rgba(${rgb},0.09)`; e.currentTarget.style.borderColor = panel.accent; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                  onMouseLeave={e => { if (!already) { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = `rgba(${rgb},0.28)`; e.currentTarget.style.transform = 'none'; } }}
                                >
                                  <span style={{ fontSize: '0.7rem', opacity: already ? 1 : 0.6, fontWeight: 800 }}>{already ? '✓' : '+'}</span>{f}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom flag */}
            <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #f0ebe2', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(193,62,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#c13e2a" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Custom Flag</span>
              </div>
              <div style={{ padding: '12px 14px 14px' }}>
                {(() => {
                  const active = customFlagType ?? 'green';
                  const accent = active === 'green' ? '#2D6B4F' : '#8B2A2A';
                  return (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* compact green/red segmented toggle */}
                      <div style={{ display: 'inline-flex', padding: 3, gap: 3, borderRadius: 11, background: '#f4ede2', flexShrink: 0 }}>
                        {(['green', 'red'] as const).map(type => {
                          const on = active === type;
                          const c = type === 'green' ? '#2D6B4F' : '#8B2A2A';
                          return (
                            <button key={type} type="button" onClick={() => setCustomFlagType(type)} title={type === 'green' ? 'Green flag' : 'Red flag'}
                              style={{
                                width: 38, height: 34, borderRadius: 9, border: 'none', cursor: 'pointer',
                                background: on ? 'white' : 'transparent',
                                boxShadow: on ? `0 1px 4px rgba(0,0,0,0.1)` : 'none',
                                opacity: on ? 1 : 0.45, transition: 'all 0.15s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                              <FlagIcon color={c} size={16} />
                            </button>
                          );
                        })}
                      </div>
                      <input
                        type="text" value={customFlagText} onChange={e => setCustomFlagText(e.target.value)}
                        onKeyDown={async e => { if (e.key === 'Enter' && customFlagText.trim()) { await handleAddFlag(active, customFlagText.trim(), true); setCustomFlagText(''); } }}
                        placeholder={`Add your own ${active === 'green' ? 'green' : 'red'} flag…`}
                        style={{ flex: 1, minWidth: 160, borderRadius: 12, border: '1.5px solid #e8dece', padding: '10px 14px', background: '#faf8f5', fontFamily: 'inherit', fontSize: '0.85rem', color: '#1a1410', outline: 'none', transition: 'border-color 0.15s' }}
                        onFocus={e => { e.currentTarget.style.borderColor = accent; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#e8dece'; }}
                      />
                      <button
                        onClick={async () => { if (!customFlagText.trim()) return; await handleAddFlag(active, customFlagText.trim(), true); setCustomFlagText(''); }}
                        disabled={!customFlagText.trim()}
                        style={{ padding: '10px 20px', borderRadius: 12, border: 'none', cursor: customFlagText.trim() ? 'pointer' : 'not-allowed', background: customFlagText.trim() ? accent : '#e8dece', color: customFlagText.trim() ? 'white' : '#a89e92', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, transition: 'all 0.15s' }}
                      >Add</button>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Flags list */}
            {flags.length > 0 && (
              <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #f0ebe2', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(193,62,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="#c13e2a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><line x1="4" y1="22" x2="4" y2="15" stroke="#c13e2a" strokeWidth="1.6" strokeLinecap="round"/></svg>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Your Flags</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'white', background: '#c13e2a', borderRadius: 20, padding: '1px 7px', marginLeft: 2 }}>{flags.length}</span>
                </div>
                <div style={{ padding: '10px 14px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                  {[...flags].sort((a, b) => (a.type === b.type ? 0 : a.type === 'green' ? -1 : 1)).map(f => (
                    <div key={f.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 12,
                      background: f.type === 'green' ? 'rgba(45,107,79,0.06)' : 'rgba(139,42,42,0.05)',
                      border: `1px solid ${f.type === 'green' ? 'rgba(45,107,79,0.2)' : 'rgba(139,42,42,0.18)'}`,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FlagIcon color={f.type === 'green' ? FLAG_GREEN : FLAG_RED} size={15} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: f.type === 'green' ? '#2D6B4F' : '#8B2A2A' }}>{f.text}</span>
                          {f.isCustom && <span style={{ fontSize: '0.65rem', color: '#a89e92', background: '#f0ebe2', borderRadius: 20, padding: '1px 7px' }}>custom</span>}
                        </div>
                        <p style={{ fontSize: '0.65rem', color: '#a89e92', margin: '3px 0 0 0' }}>{f.date}</p>
                      </div>
                      <button onClick={() => handleDeleteFlag(f.id, f.type)}
                        style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #e8dece', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#a89e92', fontSize: '0.9rem', lineHeight: 1, flexShrink: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FAMILY TAB ── */}
        {activeTab === 'family' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Hero Score Summary Card ── */}
            {familySC?.average ? (
              <div style={{
                background: 'linear-gradient(135deg, #1a0f0a 0%, #3a1a10 50%, #2a1208 100%)',
                borderRadius: 22,
                padding: '24px 22px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(193,62,42,0.25)',
              }}>
                {/* Decorative circles */}
                <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(193,62,42,0.12)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(193,62,42,0.08)', pointerEvents: 'none' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative' }}>
                  {/* Ring gauge */}
                  <div style={{ position: 'relative', flexShrink: 0, width: 90, height: 90 }}>
                    <svg width="90" height="90" viewBox="0 0 90 90">
                      <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8"/>
                      <circle cx="45" cy="45" r="38" fill="none"
                        stroke="url(#familyGrad)" strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 38}`}
                        strokeDashoffset={`${2 * Math.PI * 38 * (1 - familySC.average / 5)}`}
                        transform="rotate(-90 45 45)"
                        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
                      />
                      <defs>
                        <linearGradient id="familyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f56565"/>
                          <stop offset="100%" stopColor="#c13e2a"/>
                        </linearGradient>
                      </defs>
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', lineHeight: 1, fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)' }}>{familySC.average}</span>
                      <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.05em' }}>/ 5.0</span>
                    </div>
                  </div>

                  {/* Score details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'rgba(193,62,42,0.9)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 4 }}>Overall Family Score</div>
                    <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
                      {[1,2,3,4,5].map(s => (
                        <svg key={s} width="18" height="18" viewBox="0 0 24 24"
                          fill={s <= Math.round(familySC.average) ? '#f56565' : 'none'}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                            stroke={s <= Math.round(familySC.average) ? '#f56565' : 'rgba(255,255,255,0.2)'}
                            strokeWidth={s <= Math.round(familySC.average) ? 0 : 1.5}
                            strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ))}
                    </div>
                    {/* Mini dimension bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {FAMILY_SCORECARD_DIMENSIONS.slice(0, 4).map(dim => {
                        const v = familySC.scores[dim.key as FamilyScorecardKey] ?? 0;
                        return (
                          <div key={dim.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.45)', width: 80, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dim.label}</span>
                            <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 2, width: `${(v / 5) * 100}%`, background: v >= 4 ? '#3db87a' : v >= 3 ? '#e0b852' : '#e05252', transition: 'width 0.6s ease' }}/>
                            </div>
                            <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', width: 10, textAlign: 'right' }}>{v || '–'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty state prompt */
              <div style={{
                background: 'linear-gradient(135deg, #fff8f5, #fff3ee)',
                borderRadius: 22,
                padding: '28px 24px',
                textAlign: 'center',
                border: '2px dashed rgba(193,62,42,0.2)',
              }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(193,62,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#c13e2a" strokeWidth="1.6" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="#c13e2a" strokeWidth="1.6"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#c13e2a" strokeWidth="1.6" strokeLinecap="round"/></svg>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1410', marginBottom: 6 }}>Rate Their Family</div>
                <div style={{ fontSize: '0.75rem', color: '#a89e92', lineHeight: 1.5 }}>Share your experience with their family across 8 key dimensions to get an overall compatibility score.</div>
              </div>
            )}

            {/* ── Rating Dimensions Card ── */}
            <div style={{
              background: 'white',
              borderRadius: 22,
              border: '1px solid #eee6d8',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}>
              {/* Card Header */}
              <div style={{
                padding: '16px 20px 14px',
                borderBottom: '1px solid #f5ede0',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'linear-gradient(to right, #fff8f5, white)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: 'linear-gradient(135deg, #c13e2a, #8B2A2A)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(193,62,42,0.3)',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="white" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1410', letterSpacing: '-0.01em' }}>Rate Their Family</div>
                  <div style={{ fontSize: '0.65rem', color: '#a89e92', fontWeight: 500 }}>Tap stars to rate each dimension</div>
                </div>
                {Object.values(familyScores).filter(v => v && v > 0).length > 0 && (
                  <div style={{
                    marginLeft: 'auto',
                    background: 'rgba(193,62,42,0.08)',
                    border: '1px solid rgba(193,62,42,0.2)',
                    borderRadius: 20,
                    padding: '3px 10px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#c13e2a',
                  }}>
                    {Object.values(familyScores).filter(v => v && v > 0).length}/{FAMILY_SCORECARD_DIMENSIONS.length} rated
                  </div>
                )}
              </div>

              {/* Dimension Grid */}
              <div style={{ padding: '14px 16px 6px' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FAMILY_SCORECARD_DIMENSIONS.map(dim => {
                    const score = familyScores[dim.key as FamilyScorecardKey] ?? 0;
                    const tint = score >= 4 ? '61,184,122' : score === 3 ? '224,184,82' : '224,82,82';
                    const dimIcons: Record<string, string> = {
                      responseTime: '⏱',
                      respectfulness: '🤝',
                      transparency: '💎',
                      valuesAlignment: '🧿',
                      financialCompat: '💰',
                      openness: '🗣',
                      commStyle: '💬',
                      respectForFamily: '🏡',
                    };
                    return (
                      <div
                        key={dim.key}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                          padding: '10px 12px', borderRadius: 12,
                          border: `1px solid ${score > 0 ? `rgba(${tint},0.3)` : '#f0e9dd'}`,
                          background: score > 0 ? `rgba(${tint},0.05)` : '#faf8f5',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                            background: score > 0 ? `rgba(${tint},0.12)` : 'white',
                            border: `1px solid ${score > 0 ? `rgba(${tint},0.25)` : '#ede8df'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
                          }}>
                            {dimIcons[dim.key] ?? '⭐'}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1a1410', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dim.label}</div>
                            <div style={{ fontSize: '0.58rem', color: '#a89e92', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {dim.low} → {dim.high}
                            </div>
                          </div>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <StarRating
                            value={score}
                            onChange={v => setFamilyScores(prev => ({ ...prev, [dim.key]: v }))}
                            size="sm"
                            color="#c13e2a"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Save Button */}
              <div style={{ padding: '16px 20px 20px' }}>
                <button
                  onClick={handleSaveFamily}
                  disabled={savingFamily}
                  style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: 14,
                    border: 'none',
                    cursor: savingFamily ? 'not-allowed' : 'pointer',
                    background: savingFamily
                      ? '#e8dece'
                      : 'linear-gradient(135deg, #c13e2a 0%, #8B2A2A 100%)',
                    color: savingFamily ? '#a89e92' : 'white',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    letterSpacing: '0.02em',
                    boxShadow: savingFamily ? 'none' : '0 6px 20px rgba(193,62,42,0.35)',
                    transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {savingFamily ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="#a89e92" strokeWidth="2" strokeLinecap="round"/></svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17 21 17 13 7 13 7 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="7 3 7 8 15 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Save Family Score
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MEETING TAB — locked state before a meeting is fixed ── */}
        {activeTab === 'meeting' && !isMeetingStage && (
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #eee4d4', boxShadow: '0 4px 20px rgba(38,16,8,0.05)', padding: '38px 24px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(193,62,42,0.08)', border: '1px solid rgba(193,62,42,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="3" stroke="#c13e2a" strokeWidth="1.6"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#c13e2a" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </div>
            <p style={{ fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)', fontSize: '1.05rem', fontWeight: 700, color: '#241209', margin: '0 0 6px' }}>No meeting yet</p>
            <p style={{ fontSize: '0.82rem', color: '#a08b6e', margin: '0 auto 18px', maxWidth: 380, lineHeight: 1.55 }}>
              Once a meeting is fixed with {prospect.name.split(' ')[0]}, this tab holds your prep questions, and after you meet — your feedback and ratings.
            </p>
            <button
              onClick={() => changeStage('meeting_fixed')}
              style={{ padding: '11px 22px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #c13e2a, #8B2A2A)', color: 'white', fontWeight: 800, fontSize: '0.84rem', boxShadow: '0 5px 16px rgba(193,62,42,0.3)' }}
            >
              Meeting Fixed — Start Prep
            </button>
          </div>
        )}

        {/* ── MEETING TAB ── */}
        {activeTab === 'meeting' && isMeetingStage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Meeting Fixed: pre-meeting prep ── */}
            {prospect.stage === 'meeting_fixed' && (
              <>
                {/* Date / location summary */}
                {(meetingLocal.plannedDate || meetingLocal.location) && (
                  <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', padding: '16px 18px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {meetingLocal.plannedDate && (
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Date</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1410' }}>{meetingLocal.plannedDate}</div>
                      </div>
                    )}
                    {meetingLocal.location && (
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Location</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1410' }}>{meetingLocal.location}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Questions to ask */}
                {(() => {
                  const allQ = [...(MEETING_QUESTIONS as readonly string[]), ...(meetingLocal.customQuestions ?? [])];
                  const askedCount = allQ.filter(q => meetingLocal.questionsAsked.includes(q)).length;
                  const total = allQ.length;
                  const pct = total ? Math.round((askedCount / total) * 100) : 0;
                  const R = 22, C = 2 * Math.PI * R;
                  return (
                <div style={{ background: 'white', borderRadius: 22, border: '1px solid #e8dece', boxShadow: '0 4px 24px rgba(38,16,8,0.06)', overflow: 'hidden' }}>
                  {/* Header with progress ring */}
                  <div style={{ padding: '18px 20px', borderBottom: '1px solid #f0ebe2', display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(120deg, #fff8f5, #fdfbf7)' }}>
                    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                      <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="26" cy="26" r={R} fill="none" stroke="#f0e6d8" strokeWidth="5" />
                        <circle cx="26" cy="26" r={R} fill="none" stroke="#c13e2a" strokeWidth="5" strokeLinecap="round"
                          strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
                      </svg>
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#c13e2a' }}>{pct}%</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)', fontSize: '1.08rem', fontWeight: 700, color: '#241209', lineHeight: 1.2 }}>Questions to Ask</div>
                      <div style={{ fontSize: '0.78rem', color: '#a08b6e', marginTop: 3 }}>
                        <span style={{ color: '#c13e2a', fontWeight: 700 }}>{askedCount}</span> of {total} covered — tap a card once you&apos;ve asked it
                      </div>
                    </div>
                  </div>

                  {/* Responsive card grid */}
                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                    {allQ.map(q => {
                      const selected = meetingLocal.questionsAsked.includes(q);
                      const t = QUESTION_TOPICS[topicOf(q)];
                      return (
                        <button key={q} type="button" onClick={() => toggleMeetingItem(q, 'questionsAsked')}
                          style={{
                            position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 14px 14px 16px', borderRadius: 16,
                            textAlign: 'left', cursor: 'pointer', width: '100%', overflow: 'hidden',
                            background: selected ? `linear-gradient(135deg, ${t.color}0d, #ffffff)` : '#faf8f5',
                            border: `1.5px solid ${selected ? t.color + '66' : '#ede8df'}`,
                            boxShadow: selected ? `0 4px 14px ${t.color}22` : 'none',
                            transition: 'all 0.18s ease',
                          }}
                          onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = t.color + '55'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                          onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = '#ede8df'; e.currentTarget.style.background = '#faf8f5'; e.currentTarget.style.transform = 'none'; } }}
                        >
                          {/* accent spine */}
                          <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: t.color, opacity: selected ? 1 : 0.4 }} />
                          {/* top row: topic chip + check */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: t.color + '14', color: t.color, fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              <span style={{ fontSize: '0.72rem' }}>{t.emoji}</span>{t.label}
                            </span>
                            <span style={{
                              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                              border: `2px solid ${selected ? t.color : '#d6c9b0'}`,
                              background: selected ? t.color : 'white', color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900,
                              transition: 'all 0.18s',
                            }}>{selected && '✓'}</span>
                          </div>
                          <span style={{ fontSize: '0.9rem', color: '#241209', fontWeight: selected ? 600 : 500, lineHeight: 1.4 }}>{q}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Add custom question */}
                  <div style={{ padding: '4px 16px 18px', display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={customQuestionText}
                      onChange={e => setCustomQuestionText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && customQuestionText.trim()) {
                          const q = customQuestionText.trim();
                          setMeetingLocal(m => ({
                            ...m,
                            customQuestions: [...(m.customQuestions ?? []), q],
                            questionsAsked: [...m.questionsAsked, q],
                          }));
                          setCustomQuestionText('');
                        }
                      }}
                      placeholder="✍️  Add your own question…"
                      style={{ flex: 1, borderRadius: 14, border: '1.5px solid #e8dece', padding: '12px 16px', background: '#faf8f5', fontFamily: 'inherit', fontSize: '0.86rem', color: '#1a1410', outline: 'none', transition: 'border-color 0.15s' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#c13e2a'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#e8dece'; }}
                    />
                    <button
                      type="button"
                      disabled={!customQuestionText.trim()}
                      onClick={() => {
                        const q = customQuestionText.trim();
                        if (!q) return;
                        setMeetingLocal(m => ({
                          ...m,
                          customQuestions: [...(m.customQuestions ?? []), q],
                          questionsAsked: [...m.questionsAsked, q],
                        }));
                        setCustomQuestionText('');
                      }}
                      style={{ padding: '12px 22px', borderRadius: 14, border: 'none', cursor: customQuestionText.trim() ? 'pointer' : 'not-allowed', background: customQuestionText.trim() ? 'linear-gradient(135deg, #c13e2a, #8B2A2A)' : '#e8dece', color: customQuestionText.trim() ? 'white' : '#a89e92', fontWeight: 700, fontSize: '0.86rem', flexShrink: 0, transition: 'all 0.15s' }}
                    >Add</button>
                  </div>
                </div>
                  );
                })()}
              </>
            )}

            {/* ── Met: post-meeting feedback ── */}
            {prospect.stage === 'met' && (
              <>
                {/* ── Meeting selector ── */}
                <div style={{
                  background: 'white',
                  borderRadius: 22,
                  border: '1px solid #eee6d8',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid #f5ede0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to right, #fff8f5, white)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #c13e2a, #8B2A2A)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(193,62,42,0.3)' }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="white" strokeWidth="1.6"/><path d="M16 2v4M8 2v4M3 10h18" stroke="white" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1410' }}>Meeting Feedback</div>
                        <div style={{ fontSize: '0.62rem', color: '#a89e92', marginTop: 1 }}>{savedMeetings.filter(m => m.savedAt).length} completed · {savedMeetings.length} total</div>
                      </div>
                    </div>
                    <button type="button" onClick={addMeeting}
                      style={{
                        fontSize: '0.72rem', fontWeight: 700, color: '#c13e2a',
                        background: 'rgba(193,62,42,0.07)', border: '1px solid rgba(193,62,42,0.22)',
                        borderRadius: 20, padding: '6px 14px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                        transition: 'all 0.15s',
                      }}>
                      <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Add
                    </button>
                  </div>

                  {/* Meeting tabs */}
                  <div style={{ padding: '12px 18px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(savedMeetings.length === 0 ? [{ meetingNumber: 1 }] : savedMeetings).map((m, i) => {
                      const isActive = activeMeetingIdx === i;
                      const isDone = !!(savedMeetings[i]?.savedAt);
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <button type="button" onClick={() => setActiveMeetingIdx(i)}
                            style={{
                              padding: '7px 14px', borderRadius: savedMeetings.length > 1 ? '20px 0 0 20px' : 20, cursor: 'pointer',
                              border: `1.5px solid ${isActive ? '#c13e2a' : '#e8dece'}`,
                              borderRight: savedMeetings.length > 1 ? 'none' : undefined,
                              background: isActive ? '#c13e2a' : 'white',
                              color: isActive ? 'white' : '#6b5e4d',
                              fontWeight: isActive ? 800 : 500,
                              fontSize: '0.78rem',
                              transition: 'all 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                              display: 'flex', alignItems: 'center', gap: 5,
                              boxShadow: isActive ? '0 4px 12px rgba(193,62,42,0.3)' : 'none',
                            }}>
                            {MEETING_ORDINALS[i] ?? `${i + 1}th`}
                            {isDone && <span style={{ fontSize: '0.65rem', background: isActive ? 'rgba(255,255,255,0.3)' : '#3db87a', color: 'white', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>}
                          </button>
                          {savedMeetings.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Remove ${MEETING_ORDINALS[i] ?? `${i + 1}th`} meeting?`)) deleteMeeting(i);
                              }}
                              title="Delete meeting"
                              style={{
                                padding: '7px 8px', borderRadius: '0 20px 20px 0', cursor: 'pointer',
                                border: `1.5px solid ${isActive ? '#c13e2a' : '#e8dece'}`,
                                background: isActive ? 'rgba(255,255,255,0.15)' : '#fff5f5',
                                color: isActive ? 'white' : '#c13e2a',
                                fontSize: '0.7rem', lineHeight: 1,
                                transition: 'all 0.15s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >✕</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Feedback form ── */}
                <div style={{ background: 'white', borderRadius: 22, border: '1px solid #eee6d8', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{
                    padding: '16px 20px 14px',
                    borderBottom: '1px solid #f5ede0',
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'linear-gradient(to right, #fff8f5, white)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 12,
                      background: 'linear-gradient(135deg, #c13e2a, #8B2A2A)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(193,62,42,0.3)',
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="none"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1410' }}>
                        {MEETING_ORDINALS[activeMeetingIdx] ?? `${activeMeetingIdx + 1}th`} Meeting — Feedback
                      </div>
                      <div style={{ fontSize: '0.63rem', color: '#a89e92', fontWeight: 500 }}>Rate each dimension honestly</div>
                    </div>
                    {/* Completion badge */}
                    {(() => {
                      const rated = POST_MEETING_DIMENSIONS.filter(d => (activeMeeting[d.key as MeetingDimensionKey] ?? 0) > 0).length;
                      return rated > 0 ? (
                        <div style={{ marginLeft: 'auto', background: 'rgba(193,62,42,0.08)', border: '1px solid rgba(193,62,42,0.2)', borderRadius: 20, padding: '3px 10px', fontSize: '0.63rem', fontWeight: 700, color: '#c13e2a' }}>
                          {rated}/{POST_MEETING_DIMENSIONS.length} rated
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Gut Feeling — top of form */}
                  <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #f5ede0', background: 'linear-gradient(to bottom, #faf8f5, white)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(193,62,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(193,62,42,0.15)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="#c13e2a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1a1410' }}>Gut Feeling</div>
                        <div style={{ fontSize: '0.6rem', color: '#a89e92' }}>Trust your instincts</div>
                      </div>
                    </div>
                    <EmojiPicker
                      options={GUT_FEELING_OPTIONS}
                      value={activeMeeting.gutFeeling ?? ''}
                      onChange={v => updateActiveMeeting({ gutFeeling: v })}
                    />
                  </div>

                  {/* Dimension rows — compact 2-up ledger */}
                  <div style={{ padding: '6px 14px 10px' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8">
                      {POST_MEETING_DIMENSIONS.map(({ label, key, low, high }) => {
                        const score = activeMeeting[key as MeetingDimensionKey] ?? 0;
                        const tone = score >= 4 ? '61,184,122' : score === 3 ? '224,184,82' : '224,82,82';
                        const dimEmojis: Record<string, string> = {
                          appearanceMatch: '👤', convQuality: '💬', connectionFelt: '✨',
                          familyImpression: '🏡', financialStability: '💰', socialSkills: '🤝',
                          friendLifestyle: '🌐', familyValues: '🧿', emotionalMaturity: '🧠',
                          communicationStyle: '📢',
                        };
                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 4px', borderBottom: '1px solid #f5ede0' }}>
                            {/* Icon */}
                            <div style={{
                              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                              background: score > 0 ? `rgba(${tone},0.1)` : '#f9f5f0',
                              border: score > 0 ? `1px solid rgba(${tone},0.2)` : '1px solid #ede8df',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.95rem', transition: 'background 0.2s, border 0.2s',
                            }}>
                              {dimEmojis[key] ?? '⭐'}
                            </div>
                            {/* Label + hint */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1a1410', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
                              <div style={{ fontSize: '0.58rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ color: '#c8a07a' }}>{low}</span>
                                <span style={{ color: '#d6c9b0' }}> → </span>
                                <span style={{ color: '#2D6B4F' }}>{high}</span>
                              </div>
                            </div>
                            {/* Stars */}
                            <div style={{ flexShrink: 0 }}>
                              <StarRating
                                value={score}
                                onChange={v => updateActiveMeeting({ [key]: v })}
                                size="md"
                                color="#c13e2a"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Meeting Notes */}
                  <div style={{ padding: '0 20px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(106,95,82,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(106,95,82,0.15)' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#6b5e4d" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" stroke="#6b5e4d" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><line x1="16" y1="13" x2="8" y2="13" stroke="#6b5e4d" strokeWidth="1.6" strokeLinecap="round"/><line x1="16" y1="17" x2="8" y2="17" stroke="#6b5e4d" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1a1410' }}>Meeting Notes</div>
                    </div>
                    <textarea
                      value={activeMeeting.notes ?? ''}
                      onChange={e => updateActiveMeeting({ notes: e.target.value })}
                      placeholder="How did this meeting go? Any memorable moments, concerns, or observations…"
                      rows={3}
                      className="resize-none"
                      style={{
                        width: '100%', borderRadius: 14, border: '1.5px solid #e8dece',
                        padding: '12px 16px', background: '#faf8f5',
                        fontFamily: 'inherit', fontSize: '0.85rem', color: '#1a1410',
                        outline: 'none', lineHeight: 1.6, boxSizing: 'border-box',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e => (e.target.style.borderColor = '#c13e2a')}
                      onBlur={e => (e.target.style.borderColor = '#e8dece')}
                    />
                  </div>

                  {/* Save Button */}
                  <div style={{ padding: '0 20px 20px' }}>
                    <button onClick={handleSaveMeetingPost} disabled={savingMeeting}
                      style={{
                        width: '100%', padding: '15px', borderRadius: 14, border: 'none',
                        cursor: savingMeeting ? 'not-allowed' : 'pointer',
                        background: savingMeeting ? '#e8dece' : 'linear-gradient(135deg, #c13e2a 0%, #8B2A2A 100%)',
                        color: savingMeeting ? '#a89e92' : 'white',
                        fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.02em',
                        boxShadow: savingMeeting ? 'none' : '0 6px 20px rgba(193,62,42,0.35)',
                        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}>
                      {savingMeeting ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="#a89e92" strokeWidth="2" strokeLinecap="round"/></svg>
                          Saving…
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17 21 17 13 7 13 7 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="7 3 7 8 15 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Save {MEETING_ORDINALS[activeMeetingIdx] ?? `${activeMeetingIdx + 1}th`} Meeting
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* History & comparison */}
                {savedMeetings.filter(m => m.savedAt).length >= 2 && (() => {
                  const saved = savedMeetings.filter(m => m.savedAt);
                  const first = saved[0];
                  const latest = saved[saved.length - 1];
                  type Imp = { label: string; from: number; to: number; delta: number };
                  const improvements: Imp[] = POST_MEETING_DIMENSIONS
                    .map(d => {
                      const k = d.key as MeetingDimensionKey;
                      const a = first[k] as number | undefined;
                      const b = latest[k] as number | undefined;
                      if (!a || !b || a === b) return null;
                      return { label: d.label as string, from: a, to: b, delta: b - a };
                    })
                    .filter((x): x is Imp => x !== null)
                    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                    .slice(0, 4);

                  return (
                    <>
                      {/* Meeting History */}
                      <div style={{ background: 'white', borderRadius: 22, border: '1px solid #eee6d8', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid #f5ede0', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(to right, #fff8f5, white)' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #4A3728, #2a1e14)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(74,55,40,0.3)' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1410' }}>Meeting History</div>
                            <div style={{ fontSize: '0.63rem', color: '#a89e92' }}>{saved.length} meetings completed</div>
                          </div>
                        </div>
                        <div style={{ padding: '8px 0' }}>
                          {saved.map((m, i) => {
                            const avg = meetingAvg(m);
                            const barColor = avg && avg >= 4 ? '#3db87a' : avg && avg >= 3 ? '#e0b852' : '#e05252';
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: i < saved.length - 1 ? '1px solid #f5ede0' : 'none' }}>
                                {/* Ordinal badge */}
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #f5ede0, #ede8df)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#c13e2a' }}>{MEETING_ORDINALS[i] ?? `${i + 1}th`}</span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#1a1410', marginBottom: 6 }}>
                                    {MEETING_ORDINALS[i] ?? `${i + 1}th`} Meeting
                                  </div>
                                  {avg !== null && (
                                    <div style={{ height: 5, borderRadius: 3, background: '#f0ebe2', overflow: 'hidden' }}>
                                      <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${barColor}bb, ${barColor})`, width: `${(avg / 5) * 100}%`, transition: 'width 0.6s ease' }} />
                                    </div>
                                  )}
                                </div>
                                {avg !== null && (
                                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: 900, color: barColor, fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)' }}>{avg}</span>
                                    <span style={{ fontSize: '0.6rem', color: '#a89e92', fontWeight: 500 }}> /5</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Improvements */}
                      {improvements.length > 0 && (
                        <div style={{ background: 'white', borderRadius: 22, border: '1px solid #eee6d8', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                          <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid #f5ede0', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(to right, #f5fff9, white)' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #2D6B4F, #1a4a32)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(45,107,79,0.3)' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M23 6l-9.5 9.5-5-5L1 18" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 6h6v6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1410' }}>Changes Since 1st Meeting</div>
                              <div style={{ fontSize: '0.63rem', color: '#a89e92' }}>Top shifts in your experience</div>
                            </div>
                          </div>
                          <div style={{ padding: '8px 0' }}>
                            {improvements.map(({ label, from, to, delta }, i) => (
                              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < improvements.length - 1 ? '1px solid #f5ede0' : 'none' }}>
                                {/* Delta badge */}
                                <div style={{
                                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                  background: delta > 0 ? 'rgba(45,107,79,0.1)' : 'rgba(193,62,42,0.1)',
                                  border: `1px solid ${delta > 0 ? 'rgba(45,107,79,0.25)' : 'rgba(193,62,42,0.2)'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.8rem', fontWeight: 900,
                                  color: delta > 0 ? '#2D6B4F' : '#c13e2a',
                                }}>
                                  {delta > 0 ? `+${delta}` : delta}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#1a1410', marginBottom: 3 }}>{label}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: '0.7rem', color: '#a89e92', fontWeight: 500 }}>{from} → {to}</span>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: delta > 0 ? 'rgba(45,107,79,0.1)' : 'rgba(193,62,42,0.08)', color: delta > 0 ? '#2D6B4F' : '#c13e2a', border: `1px solid ${delta > 0 ? 'rgba(45,107,79,0.2)' : 'rgba(193,62,42,0.15)'}` }}>
                                      {delta > 0 ? '↑ Improved' : '↓ Declined'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* ── KUNDLI TAB ── */}
        {activeTab === 'kundli' && !hasKundliData && (
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #eee4d4', boxShadow: '0 4px 20px rgba(38,16,8,0.05)', padding: '38px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>🔯</div>
            <p style={{ fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)', fontSize: '1.05rem', fontWeight: 700, color: '#241209', margin: '0 0 6px' }}>Kundli not calculated yet</p>
            <p style={{ fontSize: '0.82rem', color: '#a08b6e', margin: '0 auto 18px', maxWidth: 380, lineHeight: 1.55 }}>
              Add {prospect.name.split(' ')[0]}&apos;s birth details (date, time and place) or pick a Nakshatra to unlock the full Kundli Milan report.
            </p>
            <button
              onClick={() => { setActiveTab('overview'); startEdit(); }}
              style={{ padding: '11px 22px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #c13e2a, #8B2A2A)', color: 'white', fontWeight: 800, fontSize: '0.84rem', boxShadow: '0 5px 16px rgba(193,62,42,0.3)' }}
            >
              Add Birth Details
            </button>
          </div>
        )}
        {activeTab === 'kundli' && hasKundliData && (
          <div>
            {profile && profile.nakshatra >= 0 ? (
              <KundliReport
                userNakshatra={profile.nakshatra}
                prospectNakshatra={prospect.nakshatra!}
                userRashi={profile.rashiIndex}
                prospectRashi={prospect.rashiIndex}
                userProfile={profile}
                prospectName={prospect.name}
                prospectDob={prospect.dobDate}
                prospectBirthTime={prospect.dobTime}
                prospectBirthPlace={prospect.dobPlace}
              />
            ) : (
              <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>🔯</div>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Kundli Milan</p>
                <p style={{ fontSize: '0.85rem', color: '#6b5e4d', marginBottom: 16, lineHeight: 1.5 }}>Add your Nakshatra in your profile to see the full Kundli Milan report.</p>
                <button onClick={() => router.push('/profile')}
                  style={{ padding: '11px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #c13e2a, #8B2A2A)', color: 'white', fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 4px 14px rgba(193,62,42,0.3)' }}>
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── DECISION TAB ── */}
        {activeTab === 'decision' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {isDecisionStage && (
              <div style={{
                background: 'white', borderRadius: 18, border: `1.5px solid ${DECISION_INFO[prospect.stage].border}`,
                boxShadow: '0 2px 14px rgba(0,0,0,0.05)', padding: '18px 18px 20px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                  background: DECISION_INFO[prospect.stage].bg,
                  border: `2px solid ${DECISION_INFO[prospect.stage].border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', color: DECISION_INFO[prospect.stage].color,
                }}>
                  {DECISION_INFO[prospect.stage].icon}
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: DECISION_INFO[prospect.stage].color, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                    Current Decision
                  </p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a1410', margin: '3px 0 0', fontFamily: 'var(--font-fraunces, Fraunces, serif)' }}>
                    {DECISION_INFO[prospect.stage].label}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b5e4d', margin: '2px 0 0' }}>
                    You can change it anytime below.
                  </p>
                </div>
              </div>
            )}

            <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #f0ebe2' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  {isDecisionStage
                    ? 'Change Decision'
                    : prospect.stage === 'met'
                    ? "You've met. What's your decision?"
                    : 'Ready to decide? You can decide at any stage.'}
                </span>
              </div>
              <div style={{ padding: '16px 16px 18px', display: 'flex', gap: 10 }}>
                {[
                  { stage: 'interested' as const, label: 'Interested', icon: '✓', desc: 'Moving forward' },
                  { stage: 'on_hold' as const, label: 'On Hold', icon: '⏸', desc: 'Need more time' },
                  { stage: 'rejected' as const, label: 'Reject', icon: '✕', desc: 'Not the right fit' },
                ].map(({ stage, label, icon, desc }) => {
                  const info = DECISION_INFO[stage];
                  const isActive = prospect.stage === stage;
                  return (
                    <button key={stage} onClick={() => changeStage(stage)}
                      style={{
                        flex: 1, padding: '16px 8px', borderRadius: 16,
                        border: `2px solid ${isActive ? info.color : info.border}`,
                        background: isActive ? info.bg : 'white',
                        color: info.color,
                        cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        boxShadow: isActive ? `0 0 0 3px ${info.bg}` : 'none',
                      }}>
                      <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{icon}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{label}</span>
                      <span style={{ fontSize: '0.65rem', color: '#a89e92', fontWeight: 400 }}>{desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        </>
        )}

      </div>
    </div>
  );
}
