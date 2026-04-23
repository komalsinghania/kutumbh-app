'use client';
import { useState } from 'react';
import { ProspectStage, STAGE_PROMPT_CONFIG, StagePromptData, STAGE_LABELS } from '@/types';
import PillGroup from './PillGroup';
import StarRating from './StarRating';

interface Props {
  stage: ProspectStage;
  onConfirm: (data: StagePromptData) => void;
  onDismiss: () => void;
}

export default function StagePromptModal({ stage, onConfirm, onDismiss }: Props) {
  const config = STAGE_PROMPT_CONFIG[stage];
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [rating1, setRating1] = useState(0);
  const [rating2, setRating2] = useState(0);
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');

  if (!config) { onDismiss(); return null; }

  const toggleTag = (t: string) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const canConfirm = !config.tagRequired || tags.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onDismiss}>
      <div
        className="w-full max-w-lg rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto"
        style={{ background: '#F9F6F0', borderTop: '3px solid #C4A265' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: '#E8DFD3' }} />
        <p className="section-label mb-1">{STAGE_LABELS[stage]}</p>
        <h3 style={{ fontFamily: 'var(--font-playfair, Playfair Display, Georgia, serif)', color: '#1C1612' }} className="text-xl font-bold mb-4">
          {config.title}
        </h3>

        {config.tagOptions && (
          <div className="mb-4">
            <PillGroup options={config.tagOptions} selected={tags} onToggle={toggleTag} multi={true} size="sm" />
          </div>
        )}

        {config.hasRating1 && (
          <div className="mb-4">
            <label className="section-label block mb-1">{config.hasRating1.label}</label>
            <StarRating value={rating1} onChange={setRating1} size="lg" color="#C4A265" />
          </div>
        )}

        {config.hasRating2 && (
          <div className="mb-4">
            <label className="section-label block mb-1">{config.hasRating2.label}</label>
            <StarRating value={rating2} onChange={setRating2} size="lg" color="#C4A265" />
          </div>
        )}

        {config.hasDate && (
          <div className="mb-4">
            <label className="section-label block mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        )}

        {config.hasLocation && (
          <div className="mb-4">
            <label className="section-label block mb-1">Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Venue / place" />
          </div>
        )}

        <div className="mb-5">
          <label className="section-label block mb-1">Add a note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Anything else worth noting…" rows={2} className="resize-none" />
        </div>

        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onDismiss}>Skip</button>
          <button
            className="btn-primary flex-1 disabled:opacity-40"
            disabled={!canConfirm}
            onClick={() => onConfirm({ tags, note: note || undefined, rating1: rating1 || undefined, rating2: rating2 || undefined, date: date || undefined, location: location || undefined })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
