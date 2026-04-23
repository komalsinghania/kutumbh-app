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

type Tab = 'overview' | 'conversations' | 'flags' | 'family' | 'meeting' | 'kundli';

const MEETING_ORDINALS = ['1st', '2nd', '3rd', '4th', '5th'];

function meetingAvg(r: MeetingRecord): number | null {
  const vals = POST_MEETING_DIMENSIONS
    .map(d => r[d.key as MeetingDimensionKey] as number | undefined)
    .filter((v): v is number => v !== undefined && v > 0);
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

const JOURNEY_STAGES: ProspectStage[] = [
  'new', 'photo_exchanged', 'kundli_sent', 'kundli_matched',
  'call_done', 'family_call', 'meeting_fixed', 'met', 'interested',
  'on_hold', 'rejected',
];

const JOURNEY_LABELS: Record<ProspectStage, string> = {
  new: 'New', photo_exchanged: 'Photo', kundli_sent: 'Kundli',
  kundli_matched: 'Match', call_done: 'Call', family_call: 'Family',
  meeting_fixed: 'Meet', met: 'Met', interested: 'Yes',
  on_hold: 'Hold', rejected: 'End',
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
    if (STAGE_PROMPT_CONFIG[stage]) setPendingStage(stage);
    if (stage === 'call_done') setActiveTab('conversations');
    if (stage === 'family_call') setActiveTab('family');
    if (stage === 'meeting_fixed' || stage === 'met') setActiveTab('meeting');
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F9F6F0' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="logo text-4xl">कुटुम्भ</div>
          <div className="gold-spinner" />
        </div>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F9F6F0' }}>
        <div className="text-center">
          <p style={{ color: '#9A8A75' }}>Prospect not found.</p>
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
    ...(hasKundliData ? [{ id: 'kundli' as Tab, label: 'Kundli' }] : []),
  ];

  const currentIdx = JOURNEY_STAGES.indexOf(prospect.stage);
  const isTerminal = prospect.stage === 'on_hold' || prospect.stage === 'rejected';

  const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="flex justify-between py-2.5" style={{ borderBottom: '1px solid #F5EFE8' }}>
        <span className="text-sm font-semibold" style={{ color: '#C4A265', minWidth: '40%' }}>{label}</span>
        <span className="text-sm font-medium text-right" style={{ color: '#1C1612', maxWidth: '58%' }}>{String(value)}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-6" style={{ background: '#F9F6F0', overflowY: 'auto' }}>
      {/* Lightbox */}
      {lightboxSrc && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" className="max-w-full max-h-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          <button className="absolute top-5 right-5 text-white text-3xl leading-none" onClick={() => setLightboxSrc(null)}>×</button>
        </div>
      )}

      {/* Stage Prompt Modal */}
      {pendingStage && (
        <StagePromptModal
          stage={pendingStage}
          onConfirm={handleStagePromptConfirm}
          onDismiss={() => setPendingStage(null)}
        />
      )}

      {/* Compact dark header */}
      <div style={{ background: 'linear-gradient(170deg, #241C14, #1C1612)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* Nav row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, padding: '0 12px' }}>
          <button
            onClick={() => router.back()}
            style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(249,246,240,0.8)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '50%' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={handleDelete}
            style={{ fontSize: '0.7rem', fontWeight: 500, color: 'rgba(250,190,190,0.75)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
          >
            Delete
          </button>
        </div>

        {/* Profile row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px 16px' }}>
          {photos[0] ? (
            <img
              src={photos[0]} alt=""
              onClick={() => setLightboxSrc(photos[0])}
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #C4A265', cursor: 'pointer' }}
            />
          ) : (
            <div style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #C4A265', background: 'rgba(196,162,101,0.15)',
              color: '#C4A265', fontFamily: 'var(--font-playfair, Playfair Display, Georgia, serif)',
              fontSize: '1.25rem', fontWeight: 600,
            }}>
              {prospect.name[0]}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontFamily: 'var(--font-playfair, Playfair Display, Georgia, serif)',
              color: '#F9F6F0', fontSize: '1.25rem', fontWeight: 700,
              lineHeight: 1.2, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {prospect.name}
            </h1>
            <p style={{ color: 'rgba(249,246,240,0.6)', fontSize: '0.72rem', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {[prospect.age && `${prospect.age} yrs`, prospect.city, prospect.source].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </div>

      {/* Score cards — on light background, fully visible */}
      <div style={{ padding: '12px 16px 4px', background: '#F9F6F0', maxWidth: 672, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Overall', value: overall !== null ? `${overall}%` : '—', color: '#C4A265', topColor: '#C4A265' },
            { label: 'Kundli', value: prospect.gunaScore !== null && prospect.gunaScore !== undefined ? `${prospect.gunaScore}/36` : '—', color: '#1C1612', topColor: '#4A3728' },
            { label: 'Compat.', value: prospect.compatScore !== null && prospect.compatScore !== undefined ? `${prospect.compatScore}%` : '—', color: '#2D6B4F', topColor: '#2D6B4F' },
          ].map(({ label, value, color, topColor }) => (
            <div key={label} style={{
              background: 'white',
              borderRadius: 12,
              border: '1px solid #E8DFD3',
              borderTop: `3px solid ${topColor}`,
              padding: '10px 6px',
              textAlign: 'center',
              boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
            }}>
              <div style={{
                fontFamily: 'var(--font-playfair, Playfair Display, Georgia, serif)',
                color,
                fontSize: '1.6rem',
                fontWeight: 700,
                lineHeight: 1,
              }}>
                {value}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#9A8A75', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Journey tracker — 2-row */}
      <div style={{ maxWidth: 672, margin: '0 auto', padding: '6px 16px 8px' }}>
        <div className="card" style={{ padding: '12px 10px 10px' }}>
          {[JOURNEY_STAGES.slice(0, 6), JOURNEY_STAGES.slice(6)].map((rowStages, rowIdx) => {
            const startIdx = rowIdx * 6;
            const n = rowStages.length;
            const localCurrent = currentIdx - startIdx;
            const goldFraction = localCurrent < 0 ? 0 : localCurrent >= n - 1 ? 1 : localCurrent / (n - 1);

            return (
              <div key={rowIdx} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', marginTop: rowIdx > 0 ? 10 : 0, paddingBottom: 4 }}>
                {/* Grey track */}
                <div style={{ position: 'absolute', top: 9, left: `${(0.5 / n) * 100}%`, right: `${(0.5 / n) * 100}%`, height: 2, background: '#E8DFD3', borderRadius: 1, zIndex: 0 }} />
                {/* Gold progress */}
                {goldFraction > 0 && (
                  <div style={{ position: 'absolute', top: 9, left: `${(0.5 / n) * 100}%`, width: `${goldFraction * (1 - 1 / n) * 100}%`, height: 2, background: '#C4A265', borderRadius: 1, zIndex: 0 }} />
                )}
                {rowStages.map((stage, idx) => {
                  const globalIdx = startIdx + idx;
                  const isDone = currentIdx > globalIdx;
                  const isCurrent = currentIdx === globalIdx;
                  return (
                    <div key={stage} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22 }}>
                        {isCurrent && (
                          <span className="stage-pulse-ring" style={{
                            position: 'absolute', inset: 0, borderRadius: '50%',
                            background: 'rgba(196,162,101,0.35)',
                          }} />
                        )}
                        <button
                          onClick={() => changeStage(stage)}
                          aria-label={JOURNEY_LABELS[stage]}
                          style={{
                            width: isCurrent ? 18 : 14,
                            height: isCurrent ? 18 : 14,
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, position: 'relative', zIndex: 1,
                            transition: 'width 0.15s, height 0.15s',
                            ...(isDone
                              ? { background: '#C4A265', border: 'none' }
                              : isCurrent
                              ? { background: 'white', border: '2.5px solid #C4A265' }
                              : { background: 'white', border: '2px solid #D5CEC5' }
                            ),
                          }}
                        >
                          {isDone && (
                            <svg width="7" height="5" viewBox="0 0 8 6" fill="none">
                              <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {isCurrent && (
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C4A265' }} />
                          )}
                        </button>
                      </div>
                      <span style={{
                        fontSize: 9,
                        color: isDone ? '#C4A265' : isCurrent ? '#1C1612' : '#B8B0A8',
                        fontWeight: isCurrent ? 700 : isDone ? 500 : 400,
                        marginTop: 3,
                        textAlign: 'center',
                        lineHeight: 1.1,
                        letterSpacing: '-0.01em',
                      }}>
                        {stage === 'met' && meetingCount > 1 ? `Met(${meetingCount})` : JOURNEY_LABELS[stage]}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {isTerminal && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F0EDE8', display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => changeStage('interested')} style={{ fontSize: '0.7rem', fontWeight: 600, color: '#C4A265', background: 'none', border: '1px solid #C4A265', borderRadius: 20, padding: '3px 10px', cursor: 'pointer' }}>
                ↺ Reopen
              </button>
              <span style={{ fontSize: '0.7rem', color: '#9A8A75' }}>Move back to active tracking</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-white" style={{ borderBottom: '1px solid #E8E0D2' }}>
        <div className="flex overflow-x-auto scrollbar-none px-2 max-w-2xl mx-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="shrink-0 px-4 py-3 text-sm border-b-2 transition-colors"
              style={{
                borderColor: activeTab === t.id ? '#C4A265' : 'transparent',
                color: activeTab === t.id ? '#1C1612' : '#9A8A75',
                fontWeight: activeTab === t.id ? 700 : 500,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <>
            {/* Photos strip */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="section-label">Photos ({photos.length}/3)</p>
                {photos.length < 3 && (
                  <>
                    <button onClick={() => photoRef.current?.click()} disabled={addingPhoto} className="text-xs font-semibold disabled:opacity-50" style={{ color: '#C4A265' }}>
                      {addingPhoto ? 'Adding…' : '+ Add Photo'}
                    </button>
                    <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={e => handleAddPhotos(e.target.files)} />
                  </>
                )}
              </div>
              {photos.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {photos.map((src, i) => (
                    <div key={i} className="relative shrink-0 group">
                      <img src={src} alt="" className="w-24 h-24 rounded-xl object-cover cursor-pointer" style={{ border: '1px solid #E8E0D2' }} onClick={() => setLightboxSrc(src)} />
                      <button onClick={() => handleDeletePhoto(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-white text-xs items-center justify-center leading-none hidden group-hover:flex" style={{ background: '#8B2A2A' }}>×</button>
                    </div>
                  ))}
                </div>
              ) : (
                <button onClick={() => photoRef.current?.click()} disabled={addingPhoto} className="w-full rounded-xl py-6 text-sm transition-colors disabled:opacity-50" style={{ border: '2px dashed #E8E0D2', color: '#9A8A75' }}>
                  {addingPhoto ? 'Compressing image…' : '📷 Add photos'}
                </button>
              )}
            </div>

            {/* Details */}
            <div className="card p-5">
              <p className="section-label mb-2">Details</p>
              <DetailRow label="Age" value={prospect.age} />
              <DetailRow label="City" value={prospect.city} />
              <DetailRow label="Height" value={prospect.height} />
              <DetailRow label="Education" value={prospect.education} />
              <DetailRow label="Profession" value={prospect.profession} />
              <DetailRow label="Income" value={prospect.income} />
              <DetailRow label="Family Type" value={prospect.familyType} />
              <DetailRow label="Diet" value={prospect.diet} />
              <DetailRow label="Manglik" value={prospect.manglik} />
              <DetailRow label="Gotra" value={prospect.gotra} />
              <DetailRow label="Rashi" value={prospect.rashi} />
              <DetailRow label="Nakshatra" value={prospect.nakshatra !== undefined ? NAKSHATRAS[prospect.nakshatra] : null} />
              <DetailRow label="DOB" value={prospect.dobDate} />
              <DetailRow label="Birth Time" value={prospect.dobTime} />
              <DetailRow label="Birth Place" value={prospect.dobPlace} />
              <DetailRow label="Father's Occ." value={prospect.fatherOcc} />
              <DetailRow label="Mother's Occ." value={prospect.motherOcc} />
              <DetailRow label="Siblings" value={prospect.siblings} />
              <DetailRow label="Property" value={prospect.property} />
              <DetailRow label="Phone" value={prospect.phone} />
              <DetailRow label="Source" value={prospect.source} />
              <DetailRow label="Added" value={prospect.addedDate} />
            </div>

            {/* First impression */}
            {prospect.firstImpression && (
              <div className="card p-5">
                <p className="section-label mb-2">First Impression</p>
                <p className="text-sm leading-relaxed" style={{ color: '#1C1612' }}>{prospect.firstImpression}</p>
              </div>
            )}

            {/* Notes */}
            <div className="card p-5">
              <p className="section-label mb-3">Notes ({notes.length})</p>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Add a note…"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                  className="flex-1"
                />
                <button onClick={handleAddNote} disabled={addingNote || !noteText.trim()} className="btn-primary disabled:opacity-40" style={{ borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>Add</button>
              </div>
              <div className="space-y-3">
                {notes.map(n => (
                  <div key={n.id} className="pl-3" style={{ borderLeft: '3px solid #C4A265' }}>
                    <p className="text-sm" style={{ color: '#1C1612' }}>{n.text}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#9A8A75' }}>{n.date} {n.time}</p>
                  </div>
                ))}
                {notes.length === 0 && <p className="text-sm text-center py-4" style={{ color: '#9A8A75' }}>No notes yet</p>}
              </div>
            </div>
          </>
        )}

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
          <div className="space-y-4">
            {flags.length > 0 && (
              <div className="card p-4 flex gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: '#2D6B4F' }} />
                  <span className="text-sm font-semibold" style={{ color: '#2D6B4F' }}>{greenFlags.length} Green</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: '#8B2A2A' }} />
                  <span className="text-sm font-semibold" style={{ color: '#8B2A2A' }}>{redFlags.length} Red</span>
                </div>
              </div>
            )}

            <div className="card p-4" style={{ background: '#F0FAF4' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#2D6B4F' }}>💚 Add Green Flag</p>
              <div className="flex flex-wrap gap-2">
                {GREEN_FLAGS.map(f => {
                  const already = alreadyFlaggedTexts.has(f);
                  return (
                    <button key={f} type="button" onClick={() => !already && handleAddFlag('green', f)} disabled={already}
                      className="px-2.5 py-1 rounded-full border text-xs font-medium transition-all"
                      style={already
                        ? { background: 'rgba(45,107,79,0.12)', color: '#2D6B4F', borderColor: 'rgba(45,107,79,0.3)', opacity: 0.7 }
                        : { background: 'white', color: '#2D6B4F', borderColor: 'rgba(45,107,79,0.4)' }}>
                      {already ? '✓ ' : ''}{f}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card p-4" style={{ background: '#FAF0F2' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#8B2A2A' }}>🚩 Add Red Flag</p>
              <div className="flex flex-wrap gap-2">
                {RED_FLAGS.map(f => {
                  const already = alreadyFlaggedTexts.has(f);
                  return (
                    <button key={f} type="button" onClick={() => !already && handleAddFlag('red', f)} disabled={already}
                      className="px-2.5 py-1 rounded-full border text-xs font-medium transition-all"
                      style={already
                        ? { background: 'rgba(139,42,42,0.1)', color: '#8B2A2A', borderColor: 'rgba(139,42,42,0.3)', opacity: 0.7 }
                        : { background: 'white', color: '#8B2A2A', borderColor: 'rgba(139,42,42,0.4)' }}>
                      {already ? '✓ ' : ''}{f}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card p-4">
              <p className="section-label mb-3">Custom Flag</p>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setCustomFlagType('green')} className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                  style={customFlagType === 'green'
                    ? { background: '#2D6B4F', color: 'white', borderColor: '#2D6B4F' }
                    : { background: 'white', color: '#2D6B4F', borderColor: 'rgba(45,107,79,0.4)' }}>💚 Green</button>
                <button onClick={() => setCustomFlagType('red')} className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                  style={customFlagType === 'red'
                    ? { background: '#8B2A2A', color: 'white', borderColor: '#8B2A2A' }
                    : { background: 'white', color: '#8B2A2A', borderColor: 'rgba(139,42,42,0.4)' }}>🚩 Red</button>
              </div>
              {customFlagType && (
                <div className="flex gap-2">
                  <input type="text" value={customFlagText} onChange={e => setCustomFlagText(e.target.value)} placeholder="Describe the flag…" className="flex-1" />
                  <button
                    onClick={async () => { if (!customFlagText.trim()) return; await handleAddFlag(customFlagType, customFlagText.trim(), true); setCustomFlagText(''); setCustomFlagType(null); }}
                    className="btn-primary disabled:opacity-40"
                    style={{ borderRadius: '0.75rem', padding: '0.75rem 1rem' }}
                    disabled={!customFlagText.trim()}
                  >Add</button>
                </div>
              )}
            </div>

            {flags.length > 0 && (
              <div className="space-y-2">
                {flags.map(f => (
                  <div key={f.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{
                    background: f.type === 'green' ? '#F0FAF4' : '#FAF0F2',
                    border: `1px solid ${f.type === 'green' ? 'rgba(45,107,79,0.25)' : 'rgba(139,42,42,0.2)'}`,
                  }}>
                    <div>
                      <span className="text-sm font-medium" style={{ color: f.type === 'green' ? '#2D6B4F' : '#8B2A2A' }}>{f.type === 'green' ? '💚 ' : '🚩 '}{f.text}</span>
                      {f.isCustom && <span className="text-xs ml-2" style={{ color: '#9A8A75' }}>(custom)</span>}
                      <p className="text-xs mt-0.5" style={{ color: '#9A8A75' }}>{f.date}</p>
                    </div>
                    <button onClick={() => handleDeleteFlag(f.id, f.type)} className="text-lg leading-none ml-3" style={{ color: '#D4C9BC' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── FAMILY TAB ── */}
        {activeTab === 'family' && (
          <div className="space-y-4">
            {familySC?.average && (
              <div className="glass-card p-4 text-center">
                <div
                  className="font-bold leading-none"
                  style={{ fontFamily: 'var(--font-playfair, Playfair Display, Georgia, serif)', color: '#C4A265', fontSize: '3rem' }}
                >
                  {familySC.average}
                </div>
                <div className="text-sm mt-1" style={{ color: '#9A8A75' }}>Overall Family Score / 5</div>
                <div className="mt-2 flex justify-center">
                  <StarRating value={Math.round(familySC.average)} size="lg" color="#C4A265" />
                </div>
              </div>
            )}

            <div className="card p-5 space-y-5">
              <p className="section-label">Rate Their Family</p>
              {FAMILY_SCORECARD_DIMENSIONS.map(dim => (
                <div key={dim.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: '#1C1612' }}>{dim.label}</span>
                    <StarRating
                      value={familyScores[dim.key as FamilyScorecardKey] ?? 0}
                      onChange={v => setFamilyScores(prev => ({ ...prev, [dim.key]: v }))}
                      size="md"
                      color="#C4A265"
                    />
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: '#9A8A75' }}>
                    <span>{dim.low}</span>
                    <span>{dim.high}</span>
                  </div>
                </div>
              ))}
              <button onClick={handleSaveFamily} disabled={savingFamily} className="btn-primary w-full disabled:opacity-50">
                {savingFamily ? 'Saving…' : 'Save Family Score'}
              </button>
            </div>
          </div>
        )}

        {/* ── MEETING TAB ── */}
        {activeTab === 'meeting' && isMeetingStage && (
          <div className="space-y-4">

            {/* ── Meeting Fixed: pre-meeting prep ── */}
            {prospect.stage === 'meeting_fixed' && (
              <>
                {(meetingLocal.plannedDate || meetingLocal.location) && (
                  <div className="glass-card p-4 flex gap-6 flex-wrap">
                    {meetingLocal.plannedDate && (
                      <div>
                        <p className="section-label mb-0.5">Date</p>
                        <p className="text-sm font-medium" style={{ color: '#1C1612' }}>{meetingLocal.plannedDate}</p>
                      </div>
                    )}
                    {meetingLocal.location && (
                      <div>
                        <p className="section-label mb-0.5">Location</p>
                        <p className="text-sm font-medium" style={{ color: '#1C1612' }}>{meetingLocal.location}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="card p-5">
                  <p className="section-label mb-3">Pre-Meeting Checklist</p>
                  <div className="space-y-2">
                    {PRE_MEETING_CHECKLIST.map(item => {
                      const checked = meetingLocal.checkedItems.includes(item);
                      return (
                        <button key={item} type="button" onClick={() => toggleMeetingItem(item, 'checkedItems')}
                          className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                          style={{ background: checked ? '#F0FAF4' : 'white', border: `1px solid ${checked ? 'rgba(45,107,79,0.25)' : '#E8E0D2'}` }}>
                          <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-xs"
                            style={checked ? { background: '#2D6B4F', borderColor: '#2D6B4F', color: 'white' } : { borderColor: '#D4C9BC' }}>
                            {checked && '✓'}
                          </span>
                          <span className="text-sm font-medium" style={{ color: checked ? '#2D6B4F' : '#1C1612', textDecoration: checked ? 'line-through' : 'none' }}>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="card p-5">
                  <p className="section-label mb-1">Questions to Ask</p>
                  <p className="text-xs mb-3" style={{ color: '#9A8A75' }}>Uncheck questions not relevant for this person</p>
                  <div className="space-y-2">
                    {[...(MEETING_QUESTIONS as readonly string[]), ...(meetingLocal.customQuestions ?? [])].map(q => {
                      const selected = meetingLocal.questionsAsked.includes(q);
                      return (
                        <button key={q} type="button" onClick={() => toggleMeetingItem(q, 'questionsAsked')}
                          className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                          style={{ background: selected ? 'rgba(196,162,101,0.06)' : 'white', border: `1px solid ${selected ? 'rgba(196,162,101,0.3)' : '#E8E0D2'}` }}>
                          <span className="w-5 h-5 rounded shrink-0 mt-0.5 flex items-center justify-center border-2 text-xs"
                            style={selected ? { background: '#C4A265', borderColor: '#C4A265', color: '#1C1612' } : { borderColor: '#D4C9BC' }}>
                            {selected && '✓'}
                          </span>
                          <span className="text-sm flex-1" style={{ color: '#1C1612', fontWeight: selected ? 500 : 400 }}>{q}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Add custom question */}
                  <div className="flex gap-2 mt-3">
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
                      placeholder="Type a custom question…"
                      className="flex-1"
                      style={{ borderColor: '#C4A265' }}
                    />
                    <button
                      type="button"
                      className="btn-primary disabled:opacity-40"
                      style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem' }}
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
                    >
                      Add
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Met: post-meeting feedback (multi-meeting) ── */}
            {prospect.stage === 'met' && (
              <>
                {/* Meeting selector pills */}
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="section-label">Meeting</p>
                    <button
                      type="button"
                      onClick={addMeeting}
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ background: 'rgba(196,162,101,0.12)', color: '#C4A265', border: '1px solid rgba(196,162,101,0.3)' }}
                    >
                      + Add Meeting
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(savedMeetings.length === 0 ? [{ meetingNumber: 1 }] : savedMeetings).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveMeetingIdx(i)}
                        className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                        style={activeMeetingIdx === i
                          ? { background: '#C4A265', color: '#1C1612', borderColor: '#C4A265' }
                          : { background: 'white', color: '#6A5D4E', borderColor: '#E8E0D2' }}
                      >
                        {MEETING_ORDINALS[i] ?? `${i + 1}th`} Meeting
                        {savedMeetings[i]?.savedAt ? ' ✓' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active meeting rating form */}
                <div className="card p-5 space-y-5">
                  <p className="section-label">
                    {MEETING_ORDINALS[activeMeetingIdx] ?? `${activeMeetingIdx + 1}th`} Meeting — Feedback
                  </p>
                  {POST_MEETING_DIMENSIONS.map(({ label, key, low, high }) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium" style={{ color: '#1C1612' }}>{label}</span>
                        <StarRating
                          value={activeMeeting[key as MeetingDimensionKey] ?? 0}
                          onChange={v => updateActiveMeeting({ [key]: v })}
                          size="md"
                          color="#C4A265"
                        />
                      </div>
                      <div className="flex justify-between text-xs" style={{ color: '#9A8A75' }}>
                        <span>{low}</span><span>{high}</span>
                      </div>
                    </div>
                  ))}
                  <div>
                    <p className="section-label mb-2">Gut Feeling</p>
                    <EmojiPicker
                      options={GUT_FEELING_OPTIONS}
                      value={activeMeeting.gutFeeling ?? ''}
                      onChange={v => updateActiveMeeting({ gutFeeling: v })}
                    />
                  </div>
                  <div>
                    <label className="section-label block mb-1">Meeting Notes</label>
                    <textarea
                      value={activeMeeting.notes ?? ''}
                      onChange={e => updateActiveMeeting({ notes: e.target.value })}
                      placeholder="How did this meeting go?"
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                  <button onClick={handleSaveMeetingPost} disabled={savingMeeting} className="btn-primary w-full disabled:opacity-50">
                    {savingMeeting ? 'Saving…' : `Save ${MEETING_ORDINALS[activeMeetingIdx] ?? `${activeMeetingIdx + 1}th`} Meeting`}
                  </button>
                </div>

                {/* Meeting history & comparison (2+ saved meetings) */}
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
                      <div className="card p-4">
                        <p className="section-label mb-3">Meeting History</p>
                        <div className="space-y-2">
                          {saved.map((m, i) => {
                            const avg = meetingAvg(m);
                            return (
                              <div key={i} className="flex items-center justify-between py-1.5" style={{ borderBottom: i < saved.length - 1 ? '1px solid #F5EFE8' : 'none' }}>
                                <span className="text-sm font-medium" style={{ color: '#1C1612' }}>
                                  {MEETING_ORDINALS[i] ?? `${i + 1}th`} Meeting
                                </span>
                                <span className="text-sm font-semibold" style={{ color: '#C4A265' }}>
                                  {avg !== null ? `${avg} / 5 avg` : 'No ratings yet'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {improvements.length > 0 && (
                        <div className="card p-4">
                          <p className="section-label mb-3">Changes Since 1st Meeting</p>
                          <div className="space-y-2">
                            {improvements.map(({ label, from, to, delta }) => (
                              <div key={label} className="flex items-center justify-between">
                                <span className="text-sm" style={{ color: '#6A5D4E' }}>{label}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs" style={{ color: '#9A8A75' }}>{from}→{to}</span>
                                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                                    style={delta > 0
                                      ? { background: '#F0FAF4', color: '#2D6B4F' }
                                      : { background: '#FAF0F2', color: '#8B2A2A' }}>
                                    {delta > 0 ? `+${delta}` : delta} {delta > 0 ? '↑' : '↓'}
                                  </span>
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
              <div className="card p-5 text-center">
                <p className="section-label mb-2">Kundli Milan</p>
                <p className="text-sm" style={{ color: '#9A8A75' }}>Add your Nakshatra in your profile to see the full Kundli Milan report.</p>
                <button onClick={() => router.push('/profile')} className="btn-primary mt-4" style={{ fontSize: '0.875rem', padding: '0.75rem 1.5rem' }}>Edit Profile</button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
