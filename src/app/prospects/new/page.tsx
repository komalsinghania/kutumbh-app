'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { addProspect } from '@/lib/firestore';
import { track } from '@/lib/analytics';
import { calculateGunaScore, calculateCompatScore } from '@/lib/scoring';
import { compressImage } from '@/lib/compress-image';
import {
  NAKSHATRAS, ProspectSource, ProspectStage, ExtractedBiodata, HOBBIES,
} from '@/types';
import { normalizeHobbies } from '@/lib/hobbies';
import { calculateKundli } from '@/lib/kundli';
import CitySearch from '@/components/CitySearch';
import { getCityByName } from '@/lib/indian-cities';
import toast from 'react-hot-toast';
import { Logo } from '@/components/Logo';

const SOURCES: ProspectSource[] = [
  'Matrimonial Website', 'Relative', 'Family Friend', 'Pandit ji', 'Community Event', 'Other',
];

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: error ? '#c13e2a' : '#c13e2a' }}>{label}</label>
      <div style={error ? { borderRadius: 12, outline: '2px solid #c13e2a', outlineOffset: 1 } : {}}>
        {children}
      </div>
      {error && <p className="text-xs mt-1 font-medium" style={{ color: '#c13e2a' }}>{error}</p>}
    </div>
  );
}

function PillSelect({ options, value, onSelect, error }: { options: string[]; value: string; onSelect: (v: string) => void; error?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2" style={error && !value ? { padding: 8, borderRadius: 12, background: 'rgba(193,62,42,0.04)', outline: '2px solid #c13e2a', outlineOffset: 1 } : {}}>
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onSelect(opt)}
          className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${value === opt ? 'pill-active' : ''}`}
          style={value !== opt ? { background: 'white', color: '#6b5e4d', borderColor: '#d6c9b0' } : {}}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function HobbyPicker({ options, selected, onToggle }: {
  options: readonly string[]; selected: string[]; onToggle: (v: string) => void;
}) {
  const [showInput, setShowInput] = useState(false);
  const [text, setText] = useState('');
  const custom = selected.filter(h => !(options as readonly string[]).includes(h));
  const add = () => {
    const v = text.trim();
    if (!v) return;
    if (!selected.includes(v)) onToggle(v);
    setText(''); setShowInput(false);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
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
          className="px-3 py-1.5 rounded-full text-xs" style={{ width: 130, borderColor: '#c13e2a' }} />
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

export default function NewProspectPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '', age: '', city: '', height: '', education: '', profession: '',
    income: '', familyType: '', diet: '', manglik: '', gotra: '', rashi: '',
    nakshatra: -1, rashiIndex: -1, dobDate: '', dobTime: '', dobPlace: '', fatherOcc: '',
    motherOcc: '', siblings: '', property: '', phone: '',
    hobbies: [] as string[],
    source: '' as ProspectSource | '',
    stage: 'new' as ProspectStage,
    firstImpression: '',
  });
  const [kundliManualMode, setKundliManualMode] = useState(false);
  const [kundliCalcDone, setKundliCalcDone] = useState(false);
  const [showPasteText, setShowPasteText] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [errors, setErrors] = useState<{ name?: string; source?: string }>({});
  const nameRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const toggleHobby = (h: string) => setForm(f => ({
    ...f,
    hobbies: f.hobbies.includes(h) ? f.hobbies.filter(x => x !== h) : [...f.hobbies, h],
  }));

  const ageFromDob = (dob: string): number | null => {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age > 0 ? age : null;
  };

  const calcKundliFromValues = (dobDate: string, dobTime: string, dobPlace: string) => {
    const city = getCityByName(dobPlace);
    if (!city) { toast('City not found in database — enter nakshatra manually.', { icon: 'ℹ️' }); setKundliManualMode(true); return false; }
    try {
      const result = calculateKundli({ date: dobDate, time: dobTime, lat: city.lat, lng: city.lng, tzOffset: city.tz });
      setForm(f => ({ ...f, nakshatra: result.nakshatra, rashiIndex: result.rashi, rashi: result.rashiName }));
      setKundliCalcDone(true);
      track('kundli_calculated', { context: 'new_prospect' });
      toast.success(`Nakshatra: ${result.nakshatraName} (${result.rashiName})`);
      return true;
    } catch {
      toast.error('Could not calculate nakshatra — enter manually.');
      setKundliManualMode(true);
      return false;
    }
  };

  const tryCalcKundliProspect = () => {
    if (!form.dobDate || !form.dobTime || !form.dobPlace) return;
    calcKundliFromValues(form.dobDate, form.dobTime, form.dobPlace);
  };

  const handlePhotoSelect = async (files: FileList | null) => {
    if (!files) return;
    const remaining = 3 - photos.length;
    if (remaining <= 0) { toast.error('Maximum 3 photos allowed.'); return; }
    const selected = Array.from(files).slice(0, remaining);
    setCompressing(true);
    try {
      const compressed = await Promise.all(selected.map(f => compressImage(f)));
      setPhotos(prev => [...prev, ...compressed]);
    } catch {
      toast.error('Failed to process image.');
    } finally {
      setCompressing(false);
      if (photoRef.current) photoRef.current.value = '';
    }
  };

  const applyExtracted = (d: ExtractedBiodata) => {
    const nakshatraIdx = d.nakshatra
      ? NAKSHATRAS.findIndex(n => n.toLowerCase() === d.nakshatra!.toLowerCase())
      : -1;
    const newDobDate = d.dobDate || '';
    const newDobTime = d.dobTime || '';
    const newDobPlace = d.dobPlace || '';
    const computedAge = !d.age && newDobDate ? ageFromDob(newDobDate) : null;
    const extractedHobbies = normalizeHobbies(d.hobbies);
    setForm(f => ({
      ...f,
      name: d.name || f.name,
      age: d.age ? String(d.age) : computedAge ? String(computedAge) : f.age,
      city: d.city || f.city,
      height: d.height || f.height,
      education: d.education || f.education,
      profession: d.profession || f.profession,
      income: d.income || f.income,
      familyType: d.familyType || f.familyType,
      diet: d.diet || f.diet,
      manglik: d.manglik || f.manglik,
      gotra: d.gotra || f.gotra,
      rashi: d.rashi || f.rashi,
      nakshatra: nakshatraIdx >= 0 ? nakshatraIdx : f.nakshatra,
      dobDate: newDobDate || f.dobDate,
      dobTime: newDobTime || f.dobTime,
      dobPlace: newDobPlace || f.dobPlace,
      fatherOcc: d.fatherOcc || f.fatherOcc,
      motherOcc: d.motherOcc || f.motherOcc,
      siblings: d.siblings || f.siblings,
      property: d.property || f.property,
      phone: d.phone || f.phone,
      hobbies: extractedHobbies.length > 0
        ? Array.from(new Set([...f.hobbies, ...extractedHobbies]))
        : f.hobbies,
    }));
    const extracted: string[] = [];
    if (d.name) extracted.push('Name');
    if (d.age || computedAge) extracted.push('Age');
    if (d.city) extracted.push('City');
    if (d.dobDate) extracted.push('DOB');
    if (d.dobTime) extracted.push('Birth Time');
    if (d.dobPlace) extracted.push('Birth Place');
    if (d.gotra) extracted.push('Gotra');
    if (d.rashi) extracted.push('Rashi');
    if (d.nakshatra) extracted.push('Nakshatra');
    if (d.manglik) extracted.push('Manglik');
    if (d.education) extracted.push('Education');
    if (d.profession) extracted.push('Profession');
    if (d.income) extracted.push('Income');
    if (d.phone) extracted.push('Phone');
    if (extractedHobbies.length > 0) extracted.push('Hobbies');
    toast.success(`Extracted: ${extracted.join(', ')}`, { duration: 5000 });
    setShowUpload(false);
    if (newDobDate && newDobTime && newDobPlace && nakshatraIdx < 0) {
      setTimeout(() => calcKundliFromValues(newDobDate, newDobTime, newDobPlace), 300);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setExtractError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = await user?.getIdToken();
      const res = await fetch('/api/extract-biodata', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Server error ${res.status}`);
      applyExtracted(json.data);
      track('biodata_extracted', { method: 'file' });
    } catch (err: any) {
      setExtractError(err?.message || 'Unknown error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleExtractFromText = async () => {
    if (!pasteText.trim()) return;
    setUploading(true);
    setExtractError(null);
    setShowPasteText(false);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/extract-biodata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text: pasteText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Server error ${res.status}`);
      applyExtracted(json.data);
      track('biodata_extracted', { method: 'text' });
    } catch (err: any) {
      setExtractError(err?.message || 'Unknown error');
      setShowPasteText(true);
    } finally {
      setUploading(false);
      setPasteText('');
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    const newErrors: { name?: string; source?: string } = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.source) newErrors.source = 'Please select a source';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.name) {
        nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (newErrors.source) {
        sourceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const gunaScore =
        profile.nakshatra >= 0 && form.nakshatra >= 0
          ? calculateGunaScore(
              profile.nakshatra, form.nakshatra,
              profile.rashiIndex, form.rashiIndex >= 0 ? form.rashiIndex : undefined,
            )
          : null;

      const prospectForCompat = {
        age: Number(form.age) || 0,
        city: form.city,
        diet: form.diet,
        familyType: form.familyType,
        manglik: form.manglik,
        education: form.education,
        income: form.income,
      };

      const compatScore = calculateCompatScore(profile, {
        ...prospectForCompat,
        id: '', name: form.name, profession: form.profession,
        source: form.source as ProspectSource,
        stage: form.stage,
        gunaScore: null, compatScore: null,
        addedDate: new Date().toLocaleDateString('en-IN'),
        createdAt: 0, updatedAt: 0,
      });

      const prospectId = await addProspect(user.uid, {
        name: form.name,
        age: Number(form.age) || 0,
        city: form.city,
        height: form.height,
        education: form.education,
        profession: form.profession,
        income: form.income,
        familyType: form.familyType,
        diet: form.diet,
        manglik: form.manglik,
        gotra: form.gotra,
        rashi: form.rashi,
        nakshatra: form.nakshatra >= 0 ? form.nakshatra : undefined,
        rashiIndex: form.rashiIndex >= 0 ? form.rashiIndex : undefined,
        dobDate: form.dobDate,
        dobTime: form.dobTime,
        dobPlace: form.dobPlace,
        fatherOcc: form.fatherOcc,
        motherOcc: form.motherOcc,
        siblings: form.siblings,
        property: form.property,
        phone: form.phone,
        hobbies: form.hobbies.length > 0 ? form.hobbies : undefined,
        source: form.source as ProspectSource,
        stage: form.stage,
        gunaScore,
        compatScore,
        firstImpression: form.firstImpression,
        photos: photos.length > 0 ? photos : undefined,
        addedDate: new Date().toLocaleDateString('en-IN'),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      track('prospect_added', {
        source: form.source,
        stage: form.stage,
        has_photo: photos.length > 0,
        has_kundli: form.nakshatra >= 0,
      });
      toast.success('Prospect added!');
      router.replace(`/prospects/${prospectId}`);
    } catch {
      toast.error('Failed to save prospect.');
    } finally {
      setSaving(false);
    }
  };

  if (showUpload) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: '#f5ede0' }}>
        <div className="w-full max-w-sm text-center space-y-5">
          <Logo className="text-4xl" />
          <h2 style={{ fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)', color: '#1a1410' }} className="text-2xl font-semibold">
            Add New Prospect
          </h2>
          <p className="text-sm" style={{ color: '#6b5e4d' }}>Upload biodata as PDF, Word doc, or photo</p>
          {extractError && (
            <div className="rounded-xl px-4 py-3 text-left" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <p className="text-xs font-bold mb-1" style={{ color: '#991B1B' }}>Extraction failed</p>
              <p className="text-xs leading-relaxed" style={{ color: '#7F1D1D', wordBreak: 'break-word' }}>{extractError}</p>
            </div>
          )}
          {/* Option 1: File upload */}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*"
            className="hidden"
            onChange={e => {
              setExtractError(null);
              const file = e.target.files?.[0];
              if (!file) return;
              const allowedTypes = [
                'application/pdf',
                'image/jpeg', 'image/png', 'image/webp',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              ];
              const allowedExt = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];
              const name = (file.name || '').toLowerCase();
              const extOk = allowedExt.some(ext => name.endsWith(ext));
              if (!allowedTypes.includes(file.type) && !extOk) {
                toast.error('Please upload a PDF, Word doc, or image (JPG, PNG, WEBP)');
                if (fileRef.current) fileRef.current.value = '';
                return;
              }
              handleUpload(file);
            }}
          />
          <button className="btn-primary w-full" onClick={() => { setShowPasteText(false); fileRef.current?.click(); }} disabled={uploading}>
            {uploading && !showPasteText ? (
              <span className="flex items-center justify-center gap-2">
                <span className="gold-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                Extracting…
              </span>
            ) : extractError ? 'Try Again' : 'Choose File (PDF, Word, or Image)'}
          </button>
          <p className="text-xs -mt-2" style={{ color: '#6b5e4d' }}>Accepts PDF, DOCX, JPG, PNG</p>
          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: '#d6c9b0' }} />
            <span className="text-xs font-medium" style={{ color: '#d6c9b0' }}>or</span>
            <div className="flex-1 h-px" style={{ background: '#d6c9b0' }} />
          </div>
          {/* Option 2: Paste text */}
          {!showPasteText ? (
            <button type="button" className="btn-secondary w-full" onClick={() => setShowPasteText(true)}>
              Paste Biodata Text
            </button>
          ) : (
            <div className="space-y-2 text-left">
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="Paste the full biodata text here…"
                rows={6}
                className="w-full rounded-xl border p-3 text-sm"
                style={{ borderColor: '#c13e2a', resize: 'vertical', background: 'white', color: '#1a1410' }}
                autoFocus
              />
              <div className="flex gap-2">
                <button type="button" className="btn-primary flex-1" onClick={handleExtractFromText}
                  disabled={!pasteText.trim() || uploading}>
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <span className="gold-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                      Extracting…
                    </span>
                  ) : 'Extract'}
                </button>
                <button type="button" className="btn-secondary px-5"
                  onClick={() => { setShowPasteText(false); setPasteText(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          <button type="button" className="text-sm" style={{ color: '#6b5e4d' }}
            onClick={() => { setExtractError(null); setShowUpload(false); }}>
            Skip — Fill Manually
          </button>
          <button className="text-sm underline" style={{ color: '#6b5e4d' }} onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#f5ede0' }}>
      <div className="suite-header px-4 flex items-center gap-3 sticky top-0 z-10" style={{ height: 56 }}>
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full" style={{ color: '#ffffff' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)', color: '#ffffff', fontSize: '1.125rem' }} className="font-semibold">
          Add Prospect
        </h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
        <div className="card p-5 space-y-4">
          <h3 className="section-label">Basic Info</h3>
          <div ref={nameRef}>
            <Field label="Full Name *" error={errors.name}>
              <input
                type="text"
                value={form.name}
                onChange={e => { set('name', e.target.value); if (errors.name) setErrors(v => ({ ...v, name: undefined })); }}
                placeholder="Name"
                style={errors.name ? { borderColor: '#c13e2a', background: 'rgba(193,62,42,0.04)' } : {}}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <input type="number" value={form.age} onChange={e => set('age', e.target.value)} placeholder="Age" />
            </Field>
            <Field label="Height">
              <input type="text" value={form.height} onChange={e => set('height', e.target.value)} placeholder="5'6&quot;" />
            </Field>
          </div>
          <Field label="City">
            <input type="text" value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" />
          </Field>
          <Field label="Education">
            <input type="text" value={form.education} onChange={e => set('education', e.target.value)} placeholder="e.g. B.Tech, MBA" />
          </Field>
          <Field label="Profession">
            <input type="text" value={form.profession} onChange={e => set('profession', e.target.value)} placeholder="Profession" />
          </Field>
          <Field label="Income">
            <PillSelect
              options={['< 5 LPA', '5-10', '10-20', '20-35', '35-50', '50+']}
              value={form.income}
              onSelect={v => set('income', v)}
            />
          </Field>
        </div>

        <div className="card p-5 space-y-4">
          <h3 className="section-label">Family & Background</h3>
          <Field label="Family Type">
            <PillSelect options={['Joint', 'Nuclear']} value={form.familyType} onSelect={v => set('familyType', v)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Father's Occupation">
              <input type="text" value={form.fatherOcc} onChange={e => set('fatherOcc', e.target.value)} placeholder="Father's Occ" />
            </Field>
            <Field label="Mother's Occupation">
              <input type="text" value={form.motherOcc} onChange={e => set('motherOcc', e.target.value)} placeholder="Mother's Occ" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Siblings">
              <input type="text" value={form.siblings} onChange={e => set('siblings', e.target.value)} placeholder="e.g. 1 brother" />
            </Field>
            <Field label="Property">
              <input type="text" value={form.property} onChange={e => set('property', e.target.value)} placeholder="e.g. Own house" />
            </Field>
          </div>
          <Field label="Phone">
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Contact number" />
          </Field>
        </div>

        <div className="card p-5 space-y-4">
          <h3 className="section-label">Hobbies & Interests</h3>
          <HobbyPicker options={HOBBIES} selected={form.hobbies} onToggle={toggleHobby} />
        </div>

        <div className="card p-5 space-y-4">
          <h3 className="section-label">Kundli Details</h3>
          <Field label="Diet">
            <PillSelect
              options={['Pure Veg', 'Jain', 'Eggetarian', 'Non-Veg']}
              value={form.diet}
              onSelect={v => set('diet', v)}
            />
          </Field>
          <Field label="Manglik">
            <PillSelect
              options={['Yes', 'No', 'Partial', "Don't Know"]}
              value={form.manglik}
              onSelect={v => set('manglik', v)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gotra">
              <input type="text" value={form.gotra} onChange={e => set('gotra', e.target.value)} placeholder="Gotra" />
            </Field>
            <Field label="Rashi">
              <input type="text" value={form.rashi} onChange={e => set('rashi', e.target.value)} placeholder="Rashi" />
            </Field>
          </div>
          <Field label="Date of Birth">
            <input type="date" value={form.dobDate} onChange={e => {
              const dob = e.target.value;
              const computed = ageFromDob(dob);
              setForm(f => ({ ...f, dobDate: dob, age: computed ? String(computed) : f.age }));
              setKundliCalcDone(false);
            }} max={new Date().toISOString().split('T')[0]} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Birth Time (IST)">
              <input type="time" value={form.dobTime} onChange={e => { set('dobTime', e.target.value); setKundliCalcDone(false); }} />
            </Field>
            <Field label="Birth Place">
              <CitySearch value={form.dobPlace} onChange={(name) => { set('dobPlace', name); setKundliCalcDone(false); }} placeholder="Birth city…" />
            </Field>
          </div>
          {form.dobDate && form.dobTime && form.dobPlace && !kundliCalcDone && (
            <button type="button" onClick={tryCalcKundliProspect} className="btn-primary w-full">
              ✨ Auto-calculate Nakshatra
            </button>
          )}
          {kundliCalcDone && form.nakshatra >= 0 && (
            <div className="rounded-xl p-3 text-center" style={{ background: '#F0FAF4', border: '1px solid rgba(45,107,79,0.25)' }}>
              <p className="font-semibold text-sm" style={{ color: '#2D6B4F' }}>{NAKSHATRAS[form.nakshatra]}</p>
              <p className="text-xs mt-0.5" style={{ color: '#2D6B4F' }}>Nakshatra calculated from birth data</p>
            </div>
          )}
          {!kundliCalcDone && (
            <div>
              <button
                type="button"
                onClick={() => setKundliManualMode(m => !m)}
                className="text-xs underline"
                style={{ color: '#6b5e4d' }}
              >
                {kundliManualMode ? 'Hide manual picker' : 'Enter Nakshatra manually'}
              </button>
              {kundliManualMode && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {NAKSHATRAS.map((n, i) => (
                    <button key={n} type="button" onClick={() => set('nakshatra', i)}
                      className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${form.nakshatra === i ? 'pill-active' : ''}`}
                      style={form.nakshatra !== i ? { background: 'white', color: '#c13e2a', borderColor: 'rgba(193,62,42,0.35)' } : {}}>
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Photos */}
        <div className="card p-5 space-y-3">
          <h3 className="section-label">Photos ({photos.length}/3)</h3>
          <div className="flex gap-3 flex-wrap">
            {photos.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="w-20 h-20 rounded-xl object-cover" style={{ border: '1px solid #d6c9b0' }} />
                <button
                  type="button"
                  onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center leading-none"
                  style={{ background: '#c13e2a' }}
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < 3 && (
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                disabled={compressing}
                className="w-20 h-20 rounded-xl flex flex-col items-center justify-center transition-colors disabled:opacity-50"
                style={{ border: '2px dashed #c13e2a', color: '#c13e2a', background: 'rgba(193,62,42,0.04)' }}
              >
                {compressing
                  ? <span className="gold-spinner" />
                  : <><span className="text-2xl leading-none">+</span><span className="text-xs mt-1">Photo</span></>
                }
              </button>
            )}
          </div>
          <input
            ref={photoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={e => handlePhotoSelect(e.target.files)}
          />
          <p className="text-xs" style={{ color: '#6b5e4d' }}>Images are compressed and stored securely. Max 3 photos.</p>
        </div>

        <div className="card p-5 space-y-4">
          <h3 className="section-label">Tracking</h3>
          <div ref={sourceRef}>
            <Field label="Source *" error={errors.source}>
              <PillSelect
                options={SOURCES}
                value={form.source}
                onSelect={v => { set('source', v); if (errors.source) setErrors(ev => ({ ...ev, source: undefined })); }}
                error={!!errors.source}
              />
            </Field>
          </div>
          <Field label="Stage">
            <select
              value={form.stage}
              onChange={e => set('stage', e.target.value)}
            >
              {(['new', 'photo_exchanged', 'kundli_sent', 'kundli_matched', 'call_done', 'family_call', 'meeting_fixed', 'met', 'interested', 'on_hold', 'rejected'] as ProspectStage[]).map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </Field>
          <Field label="First Impression">
            <textarea
              value={form.firstImpression}
              onChange={e => set('firstImpression', e.target.value)}
              placeholder="Your initial thoughts…"
              rows={3}
              className="resize-none"
            />
          </Field>
        </div>

        <div className="sticky bottom-6">
          <button
            className="btn-primary w-full disabled:opacity-50"
            style={{ boxShadow: '0 4px 20px rgba(193,62,42,0.4)' }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <span className="flex items-center justify-center gap-2"><span className="gold-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />Saving…</span> : 'Save Prospect'}
          </button>
        </div>
      </div>
    </div>
  );
}
