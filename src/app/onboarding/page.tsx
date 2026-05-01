'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { saveUserProfile } from '@/lib/firestore';
import {
  NAKSHATRAS, DEALBREAKERS, DEALBREAKER_CATEGORIES,
  Gender, Diet, Manglik, Education, Income, IncomePref, FamilyType,
  ExtractedBiodata,
} from '@/types';
import { calculateKundli } from '@/lib/kundli';
import CitySearch from '@/components/CitySearch';
import { getCityByName } from '@/lib/indian-cities';
import toast from 'react-hot-toast';
import { Logo } from '@/components/Logo';

function PillGroup({ options, value, onSelect }: {
  options: string[]; value: string; onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${value === opt ? 'pill-active' : ''}`}
          style={value !== opt ? { background: 'white', color: '#c13e2a', borderColor: 'rgba(193,62,42,0.35)' } : {}}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', gender: '' as Gender, age: '', city: '', education: '' as Education,
    profession: '', income: '' as Income, diet: '' as Diet, manglik: '' as Manglik,
    nakshatra: -1, rashiIndex: -1, dobDate: '', dobTime: '', dobPlace: '',
    prefAgeMin: '', prefAgeMax: '', prefCities: '',
    prefIncome: '' as IncomePref, prefFamily: '' as FamilyType, dealbreakers: [] as string[],
  });
  const [birthManualMode, setBirthManualMode] = useState(false);
  const [birthCalcDone, setBirthCalcDone] = useState(false);
  const [customDealbreakerText, setCustomDealbreakerText] = useState('');
  const [showCustomDealbreakerInput, setShowCustomDealbreakerInput] = useState(false);
  const [showPasteText, setShowPasteText] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  const toggleDealbreaker = (d: string) => setForm(f => ({
    ...f,
    dealbreakers: f.dealbreakers.includes(d)
      ? f.dealbreakers.filter(x => x !== d)
      : [...f.dealbreakers, d],
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
    if (!city) { toast('City not found in our database — enter nakshatra manually.', { icon: 'ℹ️' }); setBirthManualMode(true); return false; }
    try {
      const result = calculateKundli({ date: dobDate, time: dobTime, lat: city.lat, lng: city.lng, tzOffset: city.tz });
      setForm(f => ({ ...f, nakshatra: result.nakshatra, rashiIndex: result.rashi }));
      setBirthCalcDone(true);
      toast.success(`Nakshatra calculated: ${result.nakshatraName} (${result.rashiName})`);
      return true;
    } catch {
      toast.error('Could not calculate — please enter nakshatra manually.');
      setBirthManualMode(true);
      return false;
    }
  };

  const tryCalcKundli = () => {
    if (!form.dobDate || !form.dobTime || !form.dobPlace) return;
    calcKundliFromValues(form.dobDate, form.dobTime, form.dobPlace);
  };

  const canContinue = () => {
    switch (step) {
      case 0: return true;
      case 1: return form.name.trim().length > 0;
      case 2: return !!form.gender;
      case 3: return Number(form.age) > 0;
      case 4: return form.city.trim().length > 0;
      case 5: return !!form.education;
      case 6: return form.profession.trim().length > 0;
      case 7: return !!form.income;
      case 8: return !!form.diet;
      case 9: return !!form.manglik;
      case 10: return form.nakshatra >= 0;
      case 11: return Number(form.prefAgeMin) > 0;
      case 12: return Number(form.prefAgeMax) > 0;
      case 13: return true;
      case 14: return !!form.prefIncome;
      case 15: return !!form.prefFamily;
      case 16: return true;
      default: return false;
    }
  };

  const goNext = () => { if (canContinue()) setStep(s => s + 1); };

  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') goNext();
  };

  const applyExtracted = (d: ExtractedBiodata) => {
    const nakshatraIdx = d.nakshatra
      ? NAKSHATRAS.findIndex(n => n.toLowerCase() === d.nakshatra!.toLowerCase())
      : -1;
    const newDobDate = d.dobDate || '';
    const newDobTime = d.dobTime || '';
    const newDobPlace = d.dobPlace || '';
    const computedAge = !d.age && newDobDate ? ageFromDob(newDobDate) : null;
    setForm(f => ({
      ...f,
      name: d.name || f.name,
      age: d.age ? String(d.age) : computedAge ? String(computedAge) : f.age,
      gender: (d.gender as Gender) || f.gender,
      city: d.city || f.city,
      education: (d.education as Education) || f.education,
      profession: d.profession || f.profession,
      income: (d.income as Income) || f.income,
      diet: (d.diet as Diet) || f.diet,
      manglik: (d.manglik as Manglik) || f.manglik,
      nakshatra: nakshatraIdx >= 0 ? nakshatraIdx : f.nakshatra,
      dobDate: newDobDate || f.dobDate,
      dobTime: newDobTime || f.dobTime,
      dobPlace: newDobPlace || f.dobPlace,
    }));
    const extracted: string[] = [];
    if (d.name) extracted.push('Name');
    if (d.age || computedAge) extracted.push('Age');
    if (d.gender) extracted.push('Gender');
    if (d.city) extracted.push('City');
    if (d.dobDate) extracted.push('DOB');
    if (d.dobTime) extracted.push('Birth Time');
    if (d.dobPlace) extracted.push('Birth Place');
    if (d.manglik) extracted.push('Manglik');
    if (d.diet) extracted.push('Diet');
    if (d.education) extracted.push('Education');
    if (d.income) extracted.push('Income');
    toast.success(`Extracted: ${extracted.join(', ')}`, { duration: 5000 });
    if (newDobDate && newDobTime && newDobPlace && nakshatraIdx < 0) {
      setTimeout(() => calcKundliFromValues(newDobDate, newDobTime, newDobPlace), 300);
    }
    setStep(1);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setExtractError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/extract-biodata', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Server error ${res.status}`);
      applyExtracted(json.data);
    } catch (err: any) {
      setExtractError(err?.message || 'Unknown error');
      if (fileRef.current) fileRef.current.value = '';
    } finally {
      setUploading(false);
    }
  };

  const handleExtractFromText = async () => {
    if (!pasteText.trim()) return;
    setUploading(true);
    setExtractError(null);
    setShowPasteText(false);
    try {
      const res = await fetch('/api/extract-biodata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Server error ${res.status}`);
      applyExtracted(json.data);
    } catch (err: any) {
      setExtractError(err?.message || 'Unknown error');
      setShowPasteText(true);
    } finally {
      setUploading(false);
      setPasteText('');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveUserProfile(user.uid, {
        name: form.name,
        gender: form.gender,
        age: Number(form.age),
        city: form.city,
        education: form.education,
        profession: form.profession,
        income: form.income,
        diet: form.diet,
        manglik: form.manglik,
        nakshatra: form.nakshatra,
        rashiIndex: form.rashiIndex >= 0 ? form.rashiIndex : undefined,
        dobDate: form.dobDate || undefined,
        dobTime: form.dobTime || undefined,
        dobPlace: form.dobPlace || undefined,
        prefAgeMin: Number(form.prefAgeMin),
        prefAgeMax: Number(form.prefAgeMax),
        prefCities: form.prefCities.split(',').map(c => c.trim()).filter(Boolean),
        prefIncome: form.prefIncome,
        prefFamily: form.prefFamily,
        dealbreakers: form.dealbreakers,
      });
      await refreshProfile();
      router.replace('/dashboard');
    } catch {
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const progress = step === 0 ? 0 : Math.round((step / 16) * 100);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f5ede0',  }}>
      {step > 0 && (
        <div className="w-full h-0.5" style={{ background: '#d6c9b0' }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #c13e2a, #c13e2a)' }}
          />
        </div>
      )}
      {step > 0 && (
        <div className="text-right px-5 pt-2 text-xs font-semibold" style={{ color: '#c13e2a' }}>
          {step} / 16
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm">
          <Logo className="text-4xl text-center mb-6" />

          {/* Step 0: Upload biodata */}
          {step === 0 && (
            <div className="text-center space-y-5">
              <h2 style={{ fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)', color: '#1a1410' }} className="text-2xl font-semibold">
                Upload your Biodata
              </h2>
              <p className="text-sm" style={{ color: '#6b5e4d' }}>
                Upload biodata as PDF, Word doc, or photo
              </p>
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
              <button
                className="btn-primary w-full"
                onClick={() => { setShowPasteText(false); fileRef.current?.click(); }}
                disabled={uploading}
              >
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
                onClick={() => { setExtractError(null); setStep(1); }}>
                Skip — Fill Manually
              </button>
            </div>
          )}

          {/* Step 1: Name */}
          {step === 1 && (
            <StepWrapper title="What's your name?">
              <input
                type="text"
                placeholder="Full name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                onKeyDown={handleEnter}
                autoFocus
              />
            </StepWrapper>
          )}

          {/* Step 2: Gender */}
          {step === 2 && (
            <StepWrapper title="Your gender">
              <PillGroup options={['Female', 'Male']} value={form.gender} onSelect={v => set('gender', v)} />
            </StepWrapper>
          )}

          {/* Step 3: Age */}
          {step === 3 && (
            <StepWrapper title="How old are you?">
              <input
                type="number"
                placeholder="Age"
                value={form.age}
                onChange={e => set('age', e.target.value)}
                onKeyDown={handleEnter}
                min={18}
                max={60}
                autoFocus
              />
            </StepWrapper>
          )}

          {/* Step 4: City */}
          {step === 4 && (
            <StepWrapper title="Which city do you live in?">
              <input
                type="text"
                placeholder="City"
                value={form.city}
                onChange={e => set('city', e.target.value)}
                onKeyDown={handleEnter}
                autoFocus
              />
            </StepWrapper>
          )}

          {/* Step 5: Education */}
          {step === 5 && (
            <StepWrapper title="Your education">
              <PillGroup
                options={['Graduate', 'Post Graduate', 'CA-CS-CMA', 'MBA', 'Engineer', 'Doctor', 'PhD', 'Other']}
                value={form.education}
                onSelect={v => set('education', v)}
              />
            </StepWrapper>
          )}

          {/* Step 6: Profession */}
          {step === 6 && (
            <StepWrapper title="What do you do?">
              <input
                type="text"
                placeholder="Profession"
                value={form.profession}
                onChange={e => set('profession', e.target.value)}
                onKeyDown={handleEnter}
                autoFocus
              />
            </StepWrapper>
          )}

          {/* Step 7: Income */}
          {step === 7 && (
            <StepWrapper title="Your annual income">
              <PillGroup
                options={['< 5 LPA', '5-10', '10-20', '20-35', '35-50', '50+']}
                value={form.income}
                onSelect={v => set('income', v)}
              />
            </StepWrapper>
          )}

          {/* Step 8: Diet */}
          {step === 8 && (
            <StepWrapper title="Your diet preference">
              <PillGroup
                options={['Pure Veg', 'Jain', 'Eggetarian', 'Non-Veg']}
                value={form.diet}
                onSelect={v => set('diet', v)}
              />
            </StepWrapper>
          )}

          {/* Step 9: Manglik */}
          {step === 9 && (
            <StepWrapper title="Are you Manglik?">
              <PillGroup
                options={['Yes', 'No', 'Partial', "Don't Know"]}
                value={form.manglik}
                onSelect={v => set('manglik', v)}
              />
            </StepWrapper>
          )}

          {/* Step 10: Birth details → auto-calculate nakshatra */}
          {step === 10 && (
            <StepWrapper title="Your Birth Details">
              <p className="text-sm text-gray-500 mt-1 mb-4">We'll calculate your Nakshatra automatically.</p>
              {!birthManualMode ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={form.dobDate}
                      onChange={e => {
                        const dob = e.target.value;
                        const computed = ageFromDob(dob);
                        setForm(f => ({ ...f, dobDate: dob, age: computed ? String(computed) : f.age }));
                        setBirthCalcDone(false);
                      }}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Time of Birth (IST)</label>
                    <input
                      type="time"
                      value={form.dobTime}
                      onChange={e => { set('dobTime', e.target.value); setBirthCalcDone(false); }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Place of Birth</label>
                    <CitySearch
                      value={form.dobPlace}
                      onChange={(name, data) => {
                        set('dobPlace', name);
                        setBirthCalcDone(false);
                      }}
                      placeholder="Search birth city…"
                    />
                  </div>
                  {form.dobDate && form.dobTime && form.dobPlace && !birthCalcDone && (
                    <button
                      type="button"
                      onClick={tryCalcKundli}
                      className="btn-primary w-full mt-2"
                    >
                      ✨ Calculate Nakshatra
                    </button>
                  )}
                  {birthCalcDone && form.nakshatra >= 0 && (
                    <div className="rounded-xl p-3 text-center" style={{ background: '#F0FAF4', border: '1px solid rgba(45,107,79,0.25)' }}>
                      <p className="font-semibold text-sm" style={{ color: '#2D6B4F' }}>{NAKSHATRAS[form.nakshatra]}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#2D6B4F' }}>Nakshatra calculated from birth data</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setBirthManualMode(true)}
                    className="text-xs underline mt-1 block text-center w-full"
                    style={{ color: '#6b5e4d' }}
                  >
                    I know my Nakshatra — enter manually
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {NAKSHATRAS.map((n, i) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => set('nakshatra', i)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${form.nakshatra === i ? 'pill-active' : ''}`}
                        style={form.nakshatra !== i ? { background: 'white', color: '#c13e2a', borderColor: 'rgba(193,62,42,0.35)' } : {}}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBirthManualMode(false)}
                    className="text-xs underline mt-3 block"
                    style={{ color: '#6b5e4d' }}
                  >
                    ← Calculate from birth date instead
                  </button>
                </div>
              )}
            </StepWrapper>
          )}

          {/* Step 11: Min preferred age */}
          {step === 11 && (
            <StepWrapper title="Minimum preferred age of partner">
              <input
                type="number"
                placeholder="e.g. 25"
                value={form.prefAgeMin}
                onChange={e => set('prefAgeMin', e.target.value)}
                onKeyDown={handleEnter}
                min={18}
                max={60}
                autoFocus
              />
            </StepWrapper>
          )}

          {/* Step 12: Max preferred age */}
          {step === 12 && (
            <StepWrapper title="Maximum preferred age of partner">
              <input
                type="number"
                placeholder="e.g. 32"
                value={form.prefAgeMax}
                onChange={e => set('prefAgeMax', e.target.value)}
                onKeyDown={handleEnter}
                min={18}
                max={65}
                autoFocus
              />
            </StepWrapper>
          )}

          {/* Step 13: Preferred cities */}
          {step === 13 && (
            <StepWrapper title="Preferred cities for partner">
              <input
                type="text"
                placeholder="Mumbai, Delhi, Pune (comma separated)"
                value={form.prefCities}
                onChange={e => set('prefCities', e.target.value)}
                onKeyDown={handleEnter}
                autoFocus
              />
              <p className="text-gray-400 text-xs mt-2">Leave blank for no preference</p>
            </StepWrapper>
          )}

          {/* Step 14: Min income preference */}
          {step === 14 && (
            <StepWrapper title="Minimum income preference">
              <PillGroup
                options={['No Preference', '5+', '10+', '20+', '35+', '50+']}
                value={form.prefIncome}
                onSelect={v => set('prefIncome', v)}
              />
            </StepWrapper>
          )}

          {/* Step 15: Family type preference */}
          {step === 15 && (
            <StepWrapper title="Preferred family type">
              <PillGroup
                options={['Joint', 'Nuclear', 'No Preference']}
                value={form.prefFamily}
                onSelect={v => set('prefFamily', v)}
              />
            </StepWrapper>
          )}

          {/* Step 16: Non-negotiables */}
          {step === 16 && (
            <StepWrapper title="Your non-negotiables">
              <p className="text-sm mt-1 mb-4" style={{ color: '#6b5e4d' }}>Select all that apply</p>
              <div className="space-y-4">
                {DEALBREAKER_CATEGORIES.map(cat => (
                  <div key={cat.label}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#c13e2a' }}>{cat.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {cat.items.map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDealbreaker(d)}
                          className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                          style={form.dealbreakers.includes(d)
                            ? { background: '#c13e2a', color: 'white', borderColor: '#c13e2a' }
                            : { background: 'white', color: '#6b5e4d', borderColor: '#d6c9b0' }}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {/* Custom non-negotiables */}
                {form.dealbreakers.filter(d => !(DEALBREAKERS as readonly string[]).includes(d)).length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#c13e2a' }}>Custom</p>
                    <div className="flex flex-wrap gap-2">
                      {form.dealbreakers.filter(d => !(DEALBREAKERS as readonly string[]).includes(d)).map(d => (
                        <span key={d} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: '#c13e2a', color: 'white', border: '1px solid #c13e2a' }}>
                          {d}
                          <button type="button" onClick={() => toggleDealbreaker(d)} style={{ marginLeft: 2, fontWeight: 700, lineHeight: 1 }}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCustomDealbreakerInput(v => !v)}
                    className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                    style={{ background: showCustomDealbreakerInput ? '#c13e2a' : 'white', color: showCustomDealbreakerInput ? 'white' : '#c13e2a', borderColor: '#c13e2a' }}
                  >
                    + Other
                  </button>
                </div>
              </div>
              {showCustomDealbreakerInput && (
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={customDealbreakerText}
                    onChange={e => setCustomDealbreakerText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && customDealbreakerText.trim()) {
                        toggleDealbreaker(customDealbreakerText.trim());
                        setCustomDealbreakerText('');
                        setShowCustomDealbreakerInput(false);
                      }
                    }}
                    placeholder="Type your dealbreaker…"
                    className="flex-1"
                    style={{ borderColor: '#c13e2a' }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem' }}
                    disabled={!customDealbreakerText.trim()}
                    onClick={() => {
                      if (!customDealbreakerText.trim()) return;
                      toggleDealbreaker(customDealbreakerText.trim());
                      setCustomDealbreakerText('');
                      setShowCustomDealbreakerInput(false);
                    }}
                  >
                    Add
                  </button>
                </div>
              )}
            </StepWrapper>
          )}

          {/* Navigation */}
          {step > 0 && (
            <>
              <div className="flex gap-3 mt-8">
                <button
                  className="btn-secondary flex-1"
                  onClick={() => setStep(s => s - 1)}
                >
                  Back
                </button>
                {step < 16 ? (
                  <button
                    className="btn-primary flex-1 disabled:opacity-40"
                    disabled={!canContinue()}
                    onClick={goNext}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    className="btn-primary flex-1 disabled:opacity-40"
                    disabled={saving}
                    onClick={handleSave}
                  >
                    {saving ? 'Saving…' : 'Done ✓'}
                  </button>
                )}
              </div>
              {step < 16 && (
                <button
                  type="button"
                  className="w-full text-center mt-3 text-xs underline"
                  style={{ color: '#d6c9b0', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => setStep(s => s + 1)}
                >
                  Skip
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StepWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)', color: '#1a1410', fontSize: '1.6rem', lineHeight: 1.25 }} className="font-bold mb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}
