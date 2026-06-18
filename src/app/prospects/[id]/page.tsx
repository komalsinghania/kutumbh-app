'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  getProspect, updateProspect, subscribeToNotes, addNote, deleteProspect,
  subscribeToConversations, addConversation, deleteConversation,
  subscribeToFlags, addFlag, deleteFlag,
  subscribeFamilyScorecard, saveFamilyScorecard,
  subscribeMeetingData, saveMeetingData,
  logStageChange,
} from '@/lib/firestore';
import { compressImage } from '@/lib/compress-image';
import { calculateOverallScore } from '@/lib/scoring';
import {
  Prospect, Note, ProspectStage, STAGE_LABELS, NAKSHATRAS,
  ConversationLog, Flag, FamilyScorecard, FamilyScorecardKey,
  FAMILY_SCORECARD_DIMENSIONS, MeetingData, MeetingRecord, MeetingDimensionKey,
  POST_MEETING_DIMENSIONS,
  GREEN_FLAGS, RED_FLAGS,
  PRE_MEETING_CHECKLIST, MEETING_QUESTIONS, GUT_FEELING_OPTIONS,
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
  kundli_matched: 'Match', call_done: 'Call', family_call: 'Family',
  meeting_fixed: 'Meet', met: 'Met', interested: 'Interested',
  on_hold: 'On Hold', rejected: 'Rejected',
};

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

  const [pendingStage, setPendingStage] = useState<ProspectStage | null>(null);

  const [customFlagType, setCustomFlagType] = useState<'green' | 'red' | null>(null);
  const [customFlagText, setCustomFlagText] = useState('');

  const [familyScores, setFamilyScores] = useState<Partial<Record<FamilyScorecardKey, number>>>({});
  const [savingFamily, setSavingFamily] = useState(false);

  const [meetingLocal, setMeetingLocal] = useState<MeetingData>({ checkedItems: [], questionsAsked: [...MEETING_QUESTIONS] });
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [customQuestionText, setCustomQuestionText] = useState('');
  const [activeMeetingIdx, setActiveMeetingIdx] = useState(0);

  const photoRef = useRef<HTMLInputElement>(null);

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
          setMeetingLocal({ ...m, questionsAsked: m.questionsAsked.length > 0 ? m.questionsAsked : [...MEETING_QUESTIONS] });
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
    toast.success('Stage updated');
    if (stage === 'call_done') setActiveTab('conversations');
    if (stage === 'meeting_fixed' || stage === 'met') setActiveTab('meeting');
    if (stage === 'interested' || stage === 'on_hold' || stage === 'rejected') setActiveTab('decision');
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
    toast.success('Conversation logged!');
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
    toast.success(`${type === 'green' ? '💚' : '🚩'} Flag added`);
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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'conversations', label: `Calls (${conversations.length})` },
    { id: 'flags', label: `Flags (${flags.length})` },
    { id: 'family', label: 'Family' },
    ...(isMeetingStage ? [{ id: 'meeting' as Tab, label: 'Meeting' }] : []),
    ...((prospect.stage === 'met' || DECISION_STAGES.includes(prospect.stage)) ? [{ id: 'decision' as Tab, label: DECISION_STAGES.includes(prospect.stage) ? `Decision ✓` : 'Decision' }] : []),
    ...(hasKundliData ? [{ id: 'kundli' as Tab, label: 'Kundli' }] : []),
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

      {/* ── Immersive Hero Header ── */}
      <div style={{
        background: 'linear-gradient(160deg, #c13e2a 0%, #8B2A2A 60%, #5C1A1A 100%)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative mandala-inspired background circles */}
        <div aria-hidden style={{
          position: 'absolute', top: -60, right: -60, width: 220, height: 220,
          borderRadius: '50%', border: '1px solid rgba(255,255,255,0.07)', pointerEvents: 'none',
        }} />
        <div aria-hidden style={{
          position: 'absolute', top: -30, right: -30, width: 140, height: 140,
          borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)', pointerEvents: 'none',
        }} />
        <div aria-hidden style={{
          position: 'absolute', bottom: 40, left: -50, width: 180, height: 180,
          borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)', pointerEvents: 'none',
        }} />

        {/* Nav row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, padding: '0 14px', position: 'relative', zIndex: 1 }}>
          <button
            onClick={() => router.back()}
            style={{
              width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', borderRadius: '50%',
              transition: 'background 0.18s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={handleDelete}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)',
              background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer',
              borderRadius: 20, padding: '6px 14px',
              transition: 'background 0.18s',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M6.5 7v5M9.5 7v5M3 4l.867 9.143A1 1 0 004.86 14h6.28a1 1 0 00.994-.857L13 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Delete
          </button>
        </div>

        {/* Profile hero content */}
        <div style={{ padding: '8px 20px 0', position: 'relative', zIndex: 1, maxWidth: 1440, margin: '0 auto' }}>
          {/* Avatar + name side by side */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {photos[0] ? (
                <img
                  src={photos[0]} alt=""
                  onClick={() => setLightboxSrc(photos[0])}
                  style={{
                    width: 88, height: 88, borderRadius: '50%', objectFit: 'cover',
                    border: '3px solid #ffffff', cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                  }}
                />
              ) : (
                <div style={{
                  width: 88, height: 88, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '3px solid rgba(255,255,255,0.5)',
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
                  color: '#ffffff', fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)',
                  fontSize: '2rem', fontWeight: 700,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                }}>
                  {prospect.name[0]}
                </div>
              )}
              {/* Add photo badge */}
              {photos.length < 3 && (
                <button
                  onClick={() => photoRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: 2, right: 2,
                    width: 24, height: 24, borderRadius: '50%',
                    background: '#ffffff', border: '2px solid #c13e2a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                  title="Add photo"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2.5v7M2.5 6h7" stroke="#c13e2a" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Name + subtitle */}
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
              <h1 style={{
                fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)',
                color: '#ffffff', fontSize: '1.65rem', fontWeight: 700,
                lineHeight: 1.15, margin: 0,
                textShadow: '0 1px 8px rgba(0,0,0,0.25)',
              }}>
                {prospect.name}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', marginTop: 6 }}>
                {[
                  prospect.age && `${prospect.age} yrs`,
                  prospect.city,
                  prospect.profession,
                  prospect.source,
                ].filter(Boolean).map((item, i) => (
                  <span key={i} style={{
                    fontSize: '0.72rem', color: 'rgba(255,255,255,0.82)',
                    background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                    padding: '2px 8px', borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.18)',
                    fontWeight: 500,
                  }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Photo strip thumbnails (2nd and 3rd photos) */}
          {photos.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              {photos.slice(1).map((src, i) => (
                <img
                  key={i} src={src} alt=""
                  onClick={() => setLightboxSrc(src)}
                  style={{
                    width: 42, height: 42, borderRadius: 10, objectFit: 'cover',
                    border: '2px solid rgba(255,255,255,0.4)', cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Score chips — floating strip at bottom of hero */}
        <div style={{ padding: '16px 20px 0', maxWidth: 1440, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              {
                label: 'Overall Score',
                value: overall !== null ? `${overall}%` : '—',
                icon: '◎',
                bg: 'rgba(255,255,255,0.18)',
                valueBg: 'rgba(255,255,255,0.92)',
                valueColor: '#c13e2a',
              },
              {
                label: 'Kundli',
                value: prospect.gunaScore !== null && prospect.gunaScore !== undefined ? `${prospect.gunaScore}/36` : '—',
                icon: '✦',
                bg: 'rgba(255,255,255,0.12)',
                valueBg: prospect.gunaScore != null && prospect.gunaScore < 18 ? 'rgba(139,42,42,0.18)' : 'rgba(255,255,255,0.92)',
                valueColor: prospect.gunaScore != null && prospect.gunaScore < 18 ? '#8B2A2A' : '#4A3728',
                warning: prospect.gunaScore != null && prospect.gunaScore < 18 ? "Doesn't Match" : null,
              },
              {
                label: 'Compat.',
                value: prospect.compatScore !== null && prospect.compatScore !== undefined ? `${prospect.compatScore}%` : '—',
                icon: '♡',
                bg: 'rgba(255,255,255,0.12)',
                valueBg: 'rgba(255,255,255,0.92)',
                valueColor: '#2D6B4F',
              },
            ].map(({ label, value, icon, bg, valueBg, valueColor, warning }: { label: string; value: string; icon: string; bg: string; valueBg: string; valueColor: string; warning?: string | null }) => (
              <div key={label} className="hero-score-chip" style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: bg, backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 14, padding: '10px 6px 10px',
                gap: 2,
              }}>
                <div style={{
                  fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)',
                  background: valueBg, color: valueColor,
                  fontSize: '1.25rem', fontWeight: 800,
                  lineHeight: 1, padding: '3px 10px', borderRadius: 8,
                  minWidth: 52, textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                }}>
                  {value}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}>
                  {label}
                </div>
                {warning && (
                  <div style={{ fontSize: '0.56rem', fontWeight: 700, color: '#ff9999', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 1 }}>
                    {warning}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Curved bottom edge */}
        <div style={{ height: 24, marginTop: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', bottom: 0, left: '-5%', right: '-5%', height: 48,
            background: '#f5ede0', borderRadius: '50% 50% 0 0 / 48px 48px 0 0',
          }} />
        </div>
      </div>

      {/* ── Journey Tracker — scrollable pill rail ── */}
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '4px 16px 10px' }}>
        <div style={{
          background: 'white', borderRadius: 18,
          border: '1px solid #e8dece',
          boxShadow: '0 2px 14px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}>
          {/* Header — title + current stage badge */}
          <div style={{
            padding: '10px 14px 8px',
            borderBottom: '1px solid #f0ebe2',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
              Journey Progress
            </span>
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, color: '#c13e2a',
              background: 'rgba(193,62,42,0.08)', padding: '3px 12px',
              borderRadius: 20, border: '1px solid rgba(193,62,42,0.22)',
            }}>
              {JOURNEY_LABELS[prospect.stage]}
            </span>
          </div>

          {/* Scrollable stage pills */}
          <div className="scrollbar-none" style={{ overflowX: 'auto', padding: '12px 14px 14px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content' }}>
              {([...JOURNEY_STAGES, 'decision'] as string[]).map((stage, idx) => {
                const isDecisionPill = stage === 'decision';
                const isDone = currentIdx > idx;
                const isCurrent = currentIdx === idx;
                const isDecisionActive = isDecisionPill && (isDecisionStage || activeTab === 'decision');
                const decisionInfo = isDecisionPill && isDecisionStage ? DECISION_INFO[prospect.stage] : null;
                const decisionActiveColor = decisionInfo?.color ?? '#c13e2a';
                const decisionActiveBg = decisionInfo?.bg ?? 'rgba(193,62,42,0.07)';
                const decisionActiveBorder = decisionInfo?.border ?? 'rgba(193,62,42,0.3)';
                return (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      onClick={() => !isDecisionPill ? changeStage(stage as ProspectStage) : setActiveTab('decision')}
                      aria-label={isDecisionPill ? 'Decision' : JOURNEY_LABELS[stage]}
                      style={{
                        display: 'flex', alignItems: 'center', gap: isDone ? 5 : 4,
                        padding: (isCurrent || isDecisionActive) ? '7px 14px' : isDone ? '5px 11px' : '5px 11px',
                        borderRadius: 24,
                        border: isDecisionActive
                          ? `2px solid ${decisionActiveBorder}`
                          : isCurrent
                          ? '2px solid #c13e2a'
                          : isDone
                          ? 'none'
                          : '1.5px solid #e0d8cc',
                        background: isDecisionActive
                          ? decisionActiveBg
                          : isCurrent
                          ? 'rgba(193,62,42,0.07)'
                          : isDone
                          ? '#c13e2a'
                          : '#faf8f5',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap',
                        position: 'relative',
                        boxShadow: isDecisionActive
                          ? `0 0 0 3px ${decisionActiveBg}`
                          : isCurrent ? '0 0 0 3px rgba(193,62,42,0.12)' : isDone ? '0 1px 4px rgba(193,62,42,0.2)' : 'none',
                      }}
                    >
                      {/* Status icon */}
                      {isDecisionPill && isDecisionStage ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: decisionActiveColor, flexShrink: 0 }}>{decisionInfo!.icon}</span>
                      ) : isDecisionPill && activeTab === 'decision' ? (
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                          background: '#c13e2a',
                          boxShadow: '0 0 0 2px rgba(193,62,42,0.25)',
                        }} />
                      ) : isDone ? (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" style={{ flexShrink: 0 }}>
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : isCurrent ? (
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                          background: '#c13e2a',
                          boxShadow: '0 0 0 2px rgba(193,62,42,0.25)',
                        }} />
                      ) : (
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                          background: '#d6c9b0',
                        }} />
                      )}
                      {/* Label */}
                      <span style={{
                        fontSize: (isCurrent || isDecisionActive) ? '0.75rem' : '0.7rem',
                        fontWeight: (isCurrent || isDecisionActive) ? 700 : isDone ? 500 : 400,
                        color: isDecisionActive ? decisionActiveColor : isDone ? 'rgba(255,255,255,0.95)' : isCurrent ? '#c13e2a' : '#a89e92',
                      }}>
                        {isDecisionPill
                          ? (isDecisionStage ? decisionInfo!.label : 'Decision')
                          : (stage === 'met' && meetingCount > 1 ? `Met (${meetingCount})` : JOURNEY_LABELS[stage])}
                      </span>
                    </button>

                    {/* Connector */}
                    {idx < JOURNEY_STAGES.length && (
                      <div style={{
                        width: 14, height: 2, flexShrink: 0,
                        background: idx < currentIdx ? '#c13e2a' : '#e8dece',
                        borderRadius: 2, margin: '0 1px',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Prev / Next stage navigation ── */}
          <div style={{ padding: '10px 14px 12px', borderTop: '1px solid #f0ebe2', display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* Prev button */}
            <button
              disabled={currentIdx === 0}
              onClick={() => currentIdx > 0 && changeStage(JOURNEY_STAGES[currentIdx - 1])}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 12, border: '1.5px solid',
                borderColor: currentIdx === 0 ? '#ede8df' : 'rgba(193,62,42,0.3)',
                background: currentIdx === 0 ? '#faf8f5' : 'rgba(193,62,42,0.06)',
                color: currentIdx === 0 ? '#d6c9b0' : '#c13e2a',
                fontWeight: 600, fontSize: '0.78rem', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.18s', flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {currentIdx > 0 ? <span>{JOURNEY_LABELS[JOURNEY_STAGES[currentIdx - 1]]}</span> : <span>Start</span>}
            </button>

            {/* Step counter */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a89e92', letterSpacing: '0.06em' }}>
                STEP {currentIdx + 1} OF {JOURNEY_STAGES.length + 1}
              </span>
              {/* Mini progress bar */}
              <div style={{ height: 3, width: '100%', maxWidth: 100, borderRadius: 2, background: '#ede8df', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: 'linear-gradient(90deg, #c13e2a, #8B2A2A)',
                  width: `${((currentIdx + 1) / (JOURNEY_STAGES.length + 1)) * 100}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>

            {/* Next button / Decision action */}
            {isDecisionStage ? (
              prospect.stage === 'interested' ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 12,
                  border: '1.5px solid rgba(45,107,79,0.3)',
                  background: 'rgba(45,107,79,0.08)',
                  color: '#2D6B4F', fontWeight: 700, fontSize: '0.75rem',
                  flexShrink: 0,
                }}>
                  ✓ Decided
                </div>
              ) : (
                <button
                  onClick={() => changeStage('met')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #c13e2a, #8B2A2A)',
                    color: 'white', fontWeight: 700, fontSize: '0.78rem',
                    cursor: 'pointer', boxShadow: '0 3px 10px rgba(193,62,42,0.3)',
                    transition: 'all 0.18s', flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8h10M8 4l4 4-4 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Reopen
                </button>
              )
            ) : (
              <button
                disabled={currentIdx === JOURNEY_STAGES.length - 1}
                onClick={() => {
                  if (currentIdx < JOURNEY_STAGES.length - 1) {
                    changeStage(JOURNEY_STAGES[currentIdx + 1] as ProspectStage);
                  } else {
                    setActiveTab('decision');
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #c13e2a, #8B2A2A)',
                  color: 'white',
                  fontWeight: 700, fontSize: '0.78rem',
                  cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(193,62,42,0.3)',
                  transition: 'all 0.18s', flexShrink: 0,
                }}
              >
                {currentIdx < JOURNEY_STAGES.length - 1
                  ? <span>{JOURNEY_LABELS[JOURNEY_STAGES[currentIdx + 1]]}</span>
                  : <span>Decide →</span>}
                {currentIdx < JOURNEY_STAGES.length - 1 && (
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <path d="M8 5L13 10L8 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs — floating pill bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#f5ede0',
        borderBottom: '1px solid #e8dece',
        paddingBottom: 12,
      }}>
        <div className="scrollbar-none" style={{
          overflowX: 'auto',
          padding: '10px 16px 0',
          maxWidth: 1440, margin: '0 auto',
        }}>
          <div style={{ display: 'flex', gap: 7, minWidth: 'max-content' }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '7px 18px',
                  borderRadius: 24,
                  fontSize: '0.78rem',
                  fontWeight: activeTab === t.id ? 700 : 500,
                  border: activeTab === t.id ? 'none' : '1.5px solid #d6c9b0',
                  background: activeTab === t.id ? '#c13e2a' : 'white',
                  color: activeTab === t.id ? '#ffffff' : '#6b5e4d',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: activeTab === t.id
                    ? '0 3px 12px rgba(193,62,42,0.32)'
                    : '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '16px 20px 0' }}>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (() => {
          const DetailChip = ({ label, value }: { label: string; value?: string | number | null }) => {
            if (!value && value !== 0) return null;
            return (
              <div style={{ background: '#faf8f5', borderRadius: 10, border: '1px solid #ede8df', padding: '8px 12px' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                  {label}
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a1410', lineHeight: 1.3 }}>
                  {String(value)}
                </div>
              </div>
            );
          };

          const SectionCard = ({ icon, title, cols = 2, children }: { icon: React.ReactNode; title: string; cols?: number; children: React.ReactNode }) => (
            <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #f0ebe2', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(193,62,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {icon}
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  {title}
                </span>
              </div>
              <div style={{ padding: '12px 14px 14px', display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
                {children}
              </div>
            </div>
          );

          return (
            <>
              {/* Hidden file input */}
              <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={e => handleAddPhotos(e.target.files)} />

              {/* ── 2-column grid ── */}
              <div className="overview-grid">

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
                  {(prospect.phone) && (
                    <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Contact</span>
                      <a href={`tel:${prospect.phone}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'linear-gradient(135deg, #c13e2a, #8B2A2A)', color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5 19.79 19.79 0 01.01 4.82 2 2 0 012 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.91a16 16 0 006.72 6.72l1.28-1.28a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {prospect.phone}
                      </a>
                    </div>
                  )}
                </div>

                {/* ════ RIGHT MAIN AREA ════ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Personal */}
                  <SectionCard icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#c13e2a" strokeWidth="1.6"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#c13e2a" strokeWidth="1.6" strokeLinecap="round"/></svg>} title="Personal" cols={3}>
                    <DetailChip label="Age" value={prospect.age} />
                    <DetailChip label="City" value={prospect.city} />
                    <DetailChip label="Height" value={prospect.height} />
                    <DetailChip label="Diet" value={prospect.diet} />
                    <DetailChip label="Source" value={prospect.source} />
                    <DetailChip label="Added" value={prospect.addedDate} />
                  </SectionCard>

                  {/* Professional */}
                  {(prospect.education || prospect.profession || prospect.income) && (
                    <SectionCard icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" stroke="#c13e2a" strokeWidth="1.6" strokeLinejoin="round"/><path d="M9 22V12h6v10" stroke="#c13e2a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>} title="Professional" cols={3}>
                      <DetailChip label="Education" value={prospect.education} />
                      <DetailChip label="Profession" value={prospect.profession} />
                      <DetailChip label="Income" value={prospect.income} />
                      <DetailChip label="Property" value={prospect.property} />
                    </SectionCard>
                  )}

                  {/* Astrological + Family side-by-side on wide screens */}
                  <div className="astro-family-grid">
                    {(prospect.rashi || prospect.nakshatra !== undefined || prospect.manglik || prospect.gotra || prospect.dobDate) && (
                      <SectionCard icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" stroke="#c13e2a" strokeWidth="1.5" strokeLinejoin="round"/></svg>} title="Astrological" cols={2}>
                        <DetailChip label="Rashi" value={prospect.rashi} />
                        <DetailChip label="Nakshatra" value={prospect.nakshatra !== undefined ? NAKSHATRAS[prospect.nakshatra] : null} />
                        <DetailChip label="Manglik" value={prospect.manglik} />
                        <DetailChip label="Gotra" value={prospect.gotra} />
                        <DetailChip label="DOB" value={prospect.dobDate} />
                        <DetailChip label="Birth Time" value={prospect.dobTime} />
                        <DetailChip label="Birth Place" value={prospect.dobPlace} />
                      </SectionCard>
                    )}
                    {(prospect.familyType || prospect.fatherOcc || prospect.motherOcc || prospect.siblings) && (
                      <SectionCard icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#c13e2a" strokeWidth="1.6" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="#c13e2a" strokeWidth="1.6"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#c13e2a" strokeWidth="1.6" strokeLinecap="round"/></svg>} title="Family Background" cols={2}>
                        <DetailChip label="Family Type" value={prospect.familyType} />
                        <DetailChip label="Father's Occ." value={prospect.fatherOcc} />
                        <DetailChip label="Mother's Occ." value={prospect.motherOcc} />
                        <DetailChip label="Siblings" value={prospect.siblings} />
                      </SectionCard>
                    )}
                  </div>

                  {/* Hobbies & Interests */}
                  {prospect.hobbies && prospect.hobbies.length > 0 && (
                    <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #f0ebe2', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(193,62,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="#c13e2a" strokeWidth="1.6" strokeLinejoin="round"/></svg>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Hobbies & Interests</span>
                      </div>
                      <div style={{ padding: '12px 14px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {prospect.hobbies.map(h => (
                          <span key={h} style={{ background: '#faf8f5', border: '1px solid #ede8df', borderRadius: 20, padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600, color: '#1a1410' }}>
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* First Impression */}
                  {prospect.firstImpression && (
                    <div style={{ background: 'linear-gradient(135deg, #fff8f3 0%, #fff3ed 100%)', borderRadius: 18, border: '1px solid rgba(193,62,42,0.18)', boxShadow: '0 2px 14px rgba(193,62,42,0.07)', padding: '16px 18px 18px', position: 'relative', overflow: 'hidden' }}>
                      <div aria-hidden style={{ position: 'absolute', top: -8, left: 10, fontFamily: 'Georgia, serif', fontSize: '5rem', lineHeight: 1, color: 'rgba(193,62,42,0.12)', fontWeight: 900, userSelect: 'none' }}>&#8220;</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(193,62,42,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="#c13e2a" strokeWidth="1.6" strokeLinejoin="round"/></svg>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>First Impression</span>
                      </div>
                      <p style={{ fontSize: '0.88rem', lineHeight: 1.65, color: '#1a1410', fontStyle: 'italic', position: 'relative', zIndex: 1, margin: 0 }}>
                        {prospect.firstImpression}
                      </p>
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
            onDelete={handleDeleteConversation}
          />
        )}

        {/* ── FLAGS TAB ── */}
        {activeTab === 'flags' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Summary bar */}
            {flags.length > 0 && (
              <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', padding: '14px 18px', display: 'flex', gap: 0, overflow: 'hidden' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingRight: 16, borderRight: '1px solid #f0ebe2' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: '#2D6B4F', fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)', lineHeight: 1 }}>{greenFlags.length}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2D6B4F', textTransform: 'uppercase', letterSpacing: '0.08em' }}>💚 Green Flags</span>
                  <div style={{ height: 4, width: '60%', borderRadius: 2, background: 'rgba(45,107,79,0.2)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: flags.length ? `${(greenFlags.length / flags.length) * 100}%` : '0%', background: '#2D6B4F', borderRadius: 2, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingLeft: 16 }}>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: '#8B2A2A', fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)', lineHeight: 1 }}>{redFlags.length}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8B2A2A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🚩 Red Flags</span>
                  <div style={{ height: 4, width: '60%', borderRadius: 2, background: 'rgba(139,42,42,0.2)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: flags.length ? `${(redFlags.length / flags.length) * 100}%` : '0%', background: '#8B2A2A', borderRadius: 2, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Green flags panel */}
            <div style={{ background: 'white', borderRadius: 18, border: '1px solid rgba(45,107,79,0.25)', boxShadow: '0 2px 14px rgba(45,107,79,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid rgba(45,107,79,0.15)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(45,107,79,0.04)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(45,107,79,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>💚</span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2D6B4F', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Add Green Flag</span>
              </div>
              <div style={{ padding: '12px 14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Communication', emoji: '🗣️', flags: ['Respectful in conversation', 'Good listener — asks questions back', 'Honest and transparent', 'Mature way of handling disagreements', 'Consistent behavior — no mixed signals'] },
                  { label: 'Values & Character', emoji: '🌟', flags: ['Respects your opinions even when disagreeing', 'Supportive of your career/ambitions', 'Good sense of humor', 'Makes effort to know your family'] },
                  { label: 'Family & Lifestyle', emoji: '🏡', flags: ['Family is warm and welcoming', 'Speaks well about their family', 'Has hobbies and interests beyond work'] },
                  { label: 'Responsibility', emoji: '💼', flags: ['Clear about career goals', 'Financially responsible', 'Punctual — calls/meets on time'] },
                ].map(cat => (
                  <div key={cat.label}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                      <span style={{ fontSize: '0.8rem' }}>{cat.emoji}</span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#2D6B4F', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85 }}>{cat.label}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {cat.flags.map(f => {
                        const already = alreadyFlaggedTexts.has(f);
                        return (
                          <button key={f} type="button" onClick={() => !already && handleAddFlag('green', f)} disabled={already}
                            style={{
                              padding: '5px 12px', borderRadius: 20,
                              border: `1px solid ${already ? 'rgba(45,107,79,0.4)' : 'rgba(45,107,79,0.3)'}`,
                              background: already ? 'rgba(45,107,79,0.12)' : 'white',
                              color: '#2D6B4F', fontSize: '0.73rem', fontWeight: already ? 700 : 500,
                              cursor: already ? 'default' : 'pointer', opacity: already ? 0.8 : 1,
                              transition: 'all 0.15s',
                            }}>
                            {already ? '✓ ' : ''}{f}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Red flags panel */}
            <div style={{ background: 'white', borderRadius: 18, border: '1px solid rgba(139,42,42,0.2)', boxShadow: '0 2px 14px rgba(139,42,42,0.04)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid rgba(139,42,42,0.12)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(139,42,42,0.03)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,42,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>🚩</span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8B2A2A', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Add Red Flag</span>
              </div>
              <div style={{ padding: '12px 14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Communication', emoji: '💬', flags: ['Rude or dismissive in conversation', 'Avoids answering direct questions', 'Talks only about themselves', 'Inconsistent — says one thing, does another'] },
                  { label: 'Respect & Attitude', emoji: '⚠️', flags: ['Disrespectful about your career/education', 'Controlling behavior — tells you what to do', 'Pressuring for quick decision', 'Disrespectful to waitstaff/service people'] },
                  { label: 'Family & Lifestyle', emoji: '🏚️', flags: ['Family is demanding or rude', "Bad-mouths their own family", 'Very different lifestyle expectations', 'Drinks/smokes but hid it initially'] },
                  { label: 'Trust & Honesty', emoji: '🔍', flags: ['Unclear about finances / suspicious', 'Still seems attached to an ex', 'Lies or exaggerates about themselves'] },
                ].map(cat => (
                  <div key={cat.label}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                      <span style={{ fontSize: '0.8rem' }}>{cat.emoji}</span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8B2A2A', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85 }}>{cat.label}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {cat.flags.map(f => {
                        const already = alreadyFlaggedTexts.has(f);
                        return (
                          <button key={f} type="button" onClick={() => !already && handleAddFlag('red', f)} disabled={already}
                            style={{
                              padding: '5px 12px', borderRadius: 20,
                              border: `1px solid ${already ? 'rgba(139,42,42,0.4)' : 'rgba(139,42,42,0.3)'}`,
                              background: already ? 'rgba(139,42,42,0.1)' : 'white',
                              color: '#8B2A2A', fontSize: '0.73rem', fontWeight: already ? 700 : 500,
                              cursor: already ? 'default' : 'pointer', opacity: already ? 0.8 : 1,
                              transition: 'all 0.15s',
                            }}>
                            {already ? '✓ ' : ''}{f}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
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
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {(['green', 'red'] as const).map(type => (
                    <button key={type} onClick={() => setCustomFlagType(type)}
                      style={{
                        flex: 1, padding: '9px 12px', borderRadius: 12, border: `1.5px solid ${customFlagType === type ? (type === 'green' ? '#2D6B4F' : '#8B2A2A') : '#e8dece'}`,
                        background: customFlagType === type ? (type === 'green' ? '#2D6B4F' : '#8B2A2A') : 'white',
                        color: customFlagType === type ? 'white' : (type === 'green' ? '#2D6B4F' : '#8B2A2A'),
                        fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                      {type === 'green' ? '💚 Green' : '🚩 Red'}
                    </button>
                  ))}
                </div>
                {customFlagType && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text" value={customFlagText} onChange={e => setCustomFlagText(e.target.value)}
                      placeholder={`Describe your ${customFlagType} flag…`}
                      style={{ flex: 1, borderRadius: 12, border: '1.5px solid #e8dece', padding: '10px 14px', background: '#faf8f5', fontFamily: 'inherit', fontSize: '0.85rem', color: '#1a1410', outline: 'none' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#c13e2a'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#e8dece'; }}
                    />
                    <button
                      onClick={async () => { if (!customFlagText.trim()) return; await handleAddFlag(customFlagType, customFlagText.trim(), true); setCustomFlagText(''); setCustomFlagType(null); }}
                      disabled={!customFlagText.trim()}
                      style={{ padding: '10px 18px', borderRadius: 12, border: 'none', cursor: customFlagText.trim() ? 'pointer' : 'not-allowed', background: customFlagText.trim() ? 'linear-gradient(135deg, #c13e2a, #8B2A2A)' : '#e8dece', color: customFlagText.trim() ? 'white' : '#a89e92', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}
                    >Add</button>
                  </div>
                )}
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
                <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {flags.map(f => (
                    <div key={f.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 12,
                      background: f.type === 'green' ? 'rgba(45,107,79,0.06)' : 'rgba(139,42,42,0.05)',
                      border: `1px solid ${f.type === 'green' ? 'rgba(45,107,79,0.2)' : 'rgba(139,42,42,0.18)'}`,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.9rem' }}>{f.type === 'green' ? '💚' : '🚩'}</span>
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

              {/* Dimension Rows */}
              <div style={{ padding: '6px 0' }}>
                {FAMILY_SCORECARD_DIMENSIONS.map((dim, idx) => {
                  const score = familyScores[dim.key as FamilyScorecardKey] ?? 0;
                  const barColor = score >= 4 ? '#3db87a' : score === 3 ? '#e0b852' : score >= 1 ? '#e05252' : '#ede8df';
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
                        padding: '14px 20px',
                        borderBottom: idx < FAMILY_SCORECARD_DIMENSIONS.length - 1 ? '1px solid #f5ede0' : 'none',
                        transition: 'background 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        {/* Left: icon + label */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                            background: score > 0 ? `rgba(${score >= 4 ? '61,184,122' : score === 3 ? '224,184,82' : '224,82,82'},0.1)` : '#f9f5f0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1rem',
                            transition: 'background 0.2s',
                            border: score > 0 ? `1px solid rgba(${score >= 4 ? '61,184,122' : score === 3 ? '224,184,82' : '224,82,82'},0.2)` : '1px solid #ede8df',
                          }}>
                            {dimIcons[dim.key] ?? '⭐'}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1a1410', marginBottom: 2 }}>{dim.label}</div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{ fontSize: '0.6rem', color: '#c8a07a' }}>{dim.low}</span>
                              <span style={{ fontSize: '0.55rem', color: '#d6c9b0' }}>→</span>
                              <span style={{ fontSize: '0.6rem', color: '#2D6B4F' }}>{dim.high}</span>
                            </div>
                          </div>
                        </div>
                        {/* Right: stars */}
                        <div style={{ flexShrink: 0 }}>
                          <StarRating
                            value={score}
                            onChange={v => setFamilyScores(prev => ({ ...prev, [dim.key]: v }))}
                            size="md"
                            color="#c13e2a"
                          />
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div style={{ marginTop: 10, height: 3, borderRadius: 2, background: '#f5ede0', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          borderRadius: 2,
                          background: score > 0 ? `linear-gradient(90deg, ${barColor}cc, ${barColor})` : 'transparent',
                          width: score > 0 ? `${(score / 5) * 100}%` : '0%',
                          transition: 'width 0.5s cubic-bezier(0.34,1.56,0.64,1), background 0.3s',
                        }}/>
                      </div>
                    </div>
                  );
                })}
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

                {/* Pre-meeting checklist */}
                <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #f0ebe2', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(45,107,79,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="#2D6B4F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="#2D6B4F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2D6B4F', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Pre-Meeting Checklist</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'white', background: '#2D6B4F', borderRadius: 20, padding: '1px 7px', marginLeft: 2 }}>
                      {meetingLocal.checkedItems.length}/{PRE_MEETING_CHECKLIST.length}
                    </span>
                  </div>
                  <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {PRE_MEETING_CHECKLIST.map(item => {
                      const checked = meetingLocal.checkedItems.includes(item);
                      return (
                        <button key={item} type="button" onClick={() => toggleMeetingItem(item, 'checkedItems')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, textAlign: 'left', cursor: 'pointer', width: '100%',
                            background: checked ? 'rgba(45,107,79,0.07)' : '#faf8f5',
                            border: `1px solid ${checked ? 'rgba(45,107,79,0.3)' : '#ede8df'}`,
                            transition: 'all 0.15s',
                          }}>
                          <span style={{
                            width: 20, height: 20, borderRadius: '50%', border: `2px solid ${checked ? '#2D6B4F' : '#d6c9b0'}`,
                            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem',
                            background: checked ? '#2D6B4F' : 'white', color: 'white', transition: 'all 0.15s',
                          }}>
                            {checked && '✓'}
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: checked ? '#2D6B4F' : '#1a1410', textDecoration: checked ? 'line-through' : 'none', flex: 1 }}>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Questions to ask */}
                <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8dece', boxShadow: '0 2px 14px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #f0ebe2', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(193,62,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#c13e2a" strokeWidth="1.6"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" stroke="#c13e2a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="#c13e2a" strokeWidth="2" strokeLinecap="round"/></svg>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c13e2a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Questions to Ask</span>
                  </div>
                  <div style={{ padding: '10px 14px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {[...(MEETING_QUESTIONS as readonly string[]), ...(meetingLocal.customQuestions ?? [])].map(q => {
                      const selected = meetingLocal.questionsAsked.includes(q);
                      return (
                        <button key={q} type="button" onClick={() => toggleMeetingItem(q, 'questionsAsked')}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 12, textAlign: 'left', cursor: 'pointer', width: '100%',
                            background: selected ? 'rgba(193,62,42,0.06)' : '#faf8f5',
                            border: `1px solid ${selected ? 'rgba(193,62,42,0.3)' : '#ede8df'}`,
                            transition: 'all 0.15s',
                          }}>
                          <span style={{
                            width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected ? '#c13e2a' : '#d6c9b0'}`,
                            flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem',
                            background: selected ? '#c13e2a' : 'white', color: 'white', transition: 'all 0.15s',
                          }}>
                            {selected && '✓'}
                          </span>
                          <span style={{ fontSize: '0.83rem', flex: 1, color: '#1a1410', fontWeight: selected ? 500 : 400, lineHeight: 1.45 }}>{q}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Add custom question */}
                  <div style={{ padding: '0 14px 14px', display: 'flex', gap: 8 }}>
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
                      placeholder="Add a custom question…"
                      style={{ flex: 1, borderRadius: 12, border: '1.5px solid #e8dece', padding: '10px 14px', background: '#faf8f5', fontFamily: 'inherit', fontSize: '0.83rem', color: '#1a1410', outline: 'none' }}
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
                      style={{ padding: '10px 18px', borderRadius: 12, border: 'none', cursor: customQuestionText.trim() ? 'pointer' : 'not-allowed', background: customQuestionText.trim() ? 'linear-gradient(135deg, #c13e2a, #8B2A2A)' : '#e8dece', color: customQuestionText.trim() ? 'white' : '#a89e92', fontWeight: 700, fontSize: '0.83rem', flexShrink: 0 }}
                    >Add</button>
                  </div>
                </div>
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
                        <button key={i} type="button" onClick={() => setActiveMeetingIdx(i)}
                          style={{
                            padding: '7px 16px', borderRadius: 20, cursor: 'pointer',
                            border: `1.5px solid ${isActive ? '#c13e2a' : '#e8dece'}`,
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

                  {/* Dimension rows */}
                  <div style={{ padding: '6px 0' }}>
                    {POST_MEETING_DIMENSIONS.map(({ label, key, low, high }, idx) => {
                      const score = activeMeeting[key as MeetingDimensionKey] ?? 0;
                      const barColor = score >= 4 ? '#3db87a' : score === 3 ? '#e0b852' : score >= 1 ? '#e05252' : '#ede8df';
                      const dimEmojis: Record<string, string> = {
                        appearanceMatch: '👤',
                        convQuality: '💬',
                        connectionFelt: '✨',
                        familyImpression: '🏡',
                        financialStability: '💰',
                        socialSkills: '🤝',
                        friendLifestyle: '🌐',
                        familyValues: '🧿',
                        emotionalMaturity: '🧠',
                        communicationStyle: '📢',
                      };
                      return (
                        <div key={key} style={{ padding: '14px 20px', borderBottom: idx < POST_MEETING_DIMENSIONS.length - 1 ? '1px solid #f5ede0' : 'none', transition: 'background 0.15s' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                            {/* Icon + label */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                                background: score > 0 ? `rgba(${score >= 4 ? '61,184,122' : score === 3 ? '224,184,82' : '224,82,82'},0.1)` : '#f9f5f0',
                                border: score > 0 ? `1px solid rgba(${score >= 4 ? '61,184,122' : score === 3 ? '224,184,82' : '224,82,82'},0.2)` : '1px solid #ede8df',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1rem', transition: 'background 0.2s, border 0.2s',
                              }}>
                                {dimEmojis[key] ?? '⭐'}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1a1410', marginBottom: 2 }}>{label}</div>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.6rem', color: '#c8a07a' }}>{low}</span>
                                  <span style={{ fontSize: '0.55rem', color: '#d6c9b0' }}>→</span>
                                  <span style={{ fontSize: '0.6rem', color: '#2D6B4F' }}>{high}</span>
                                </div>
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
                          {/* Progress bar */}
                          <div style={{ marginTop: 10, height: 3, borderRadius: 2, background: '#f5ede0', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 2,
                              background: score > 0 ? `linear-gradient(90deg, ${barColor}cc, ${barColor})` : 'transparent',
                              width: score > 0 ? `${(score / 5) * 100}%` : '0%',
                              transition: 'width 0.5s cubic-bezier(0.34,1.56,0.64,1), background 0.3s',
                            }}/>
                          </div>
                        </div>
                      );
                    })}
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
                  {isDecisionStage ? 'Change Decision' : "You've met. What's your decision?"}
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
