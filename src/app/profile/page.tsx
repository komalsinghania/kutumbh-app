'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { saveUserProfile } from '@/lib/firestore';
import { NAKSHATRAS, DEALBREAKERS, DEALBREAKER_CATEGORIES, Gender, Diet, Manglik, Education, Income, IncomePref, FamilyType } from '@/types';
import toast from 'react-hot-toast';

function PillSelect({ options, value, onSelect }: { options: string[]; value: string; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onSelect(opt)}
          className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${value === opt ? 'pill-active' : ''}`}
          style={value !== opt ? { background: 'white', color: '#C4A265', borderColor: '#E8E0D2' } : {}}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#C4A265' }}>{label}</label>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState('');

  const [form, setForm] = useState({
    name: '', gender: '' as Gender, age: '', city: '', education: '' as Education,
    profession: '', income: '' as Income, diet: '' as Diet, manglik: '' as Manglik,
    nakshatra: -1, prefAgeMin: '', prefAgeMax: '', prefCities: '',
    prefIncome: '' as IncomePref, prefFamily: '' as FamilyType, dealbreakers: [] as string[],
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        gender: profile.gender || '' as Gender,
        age: profile.age ? String(profile.age) : '',
        city: profile.city || '',
        education: profile.education || '' as Education,
        profession: profile.profession || '',
        income: profile.income || '' as Income,
        diet: profile.diet || '' as Diet,
        manglik: profile.manglik || '' as Manglik,
        nakshatra: profile.nakshatra ?? -1,
        prefAgeMin: profile.prefAgeMin ? String(profile.prefAgeMin) : '',
        prefAgeMax: profile.prefAgeMax ? String(profile.prefAgeMax) : '',
        prefCities: profile.prefCities?.join(', ') || '',
        prefIncome: profile.prefIncome || '' as IncomePref,
        prefFamily: profile.prefFamily || '' as FamilyType,
        dealbreakers: profile.dealbreakers || [],
      });
    }
  }, [profile]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggleDealbreaker = (d: string) => setForm(f => ({
    ...f,
    dealbreakers: f.dealbreakers.includes(d)
      ? f.dealbreakers.filter(x => x !== d)
      : [...f.dealbreakers, d],
  }));

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
        prefAgeMin: Number(form.prefAgeMin),
        prefAgeMax: Number(form.prefAgeMax),
        prefCities: form.prefCities.split(',').map(c => c.trim()).filter(Boolean),
        prefIncome: form.prefIncome,
        prefFamily: form.prefFamily,
        dealbreakers: form.dealbreakers,
      });
      await refreshProfile();
      toast.success('Profile updated!');
      router.back();
    } catch {
      toast.error('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F9F6F0', overflowY: 'auto' }}>
      <div className="suite-header px-4 flex items-center gap-3 sticky top-0 z-10" style={{ height: 56 }}>
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full" style={{ color: 'rgba(249,246,240,0.8)' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontFamily: 'var(--font-playfair, Playfair Display, Georgia, serif)', color: '#F9F6F0', fontSize: '1.125rem' }} className="font-semibold">
          Edit Profile
        </h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
        <div className="card p-5 space-y-4">
          <h3 className="section-label">Your Details</h3>
          <Field label="Name"><input type="text" value={form.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Gender"><PillSelect options={['Female', 'Male']} value={form.gender} onSelect={v => set('gender', v)} /></Field>
          <Field label="Age"><input type="number" value={form.age} onChange={e => set('age', e.target.value)} /></Field>
          <Field label="City"><input type="text" value={form.city} onChange={e => set('city', e.target.value)} /></Field>
          <Field label="Education"><PillSelect options={['Graduate', 'Post Graduate', 'CA-CS-CMA', 'MBA', 'Engineer', 'Doctor', 'PhD', 'Other']} value={form.education} onSelect={v => set('education', v)} /></Field>
          <Field label="Profession"><input type="text" value={form.profession} onChange={e => set('profession', e.target.value)} /></Field>
          <Field label="Income"><PillSelect options={['< 5 LPA', '5-10', '10-20', '20-35', '35-50', '50+']} value={form.income} onSelect={v => set('income', v)} /></Field>
          <Field label="Diet"><PillSelect options={['Pure Veg', 'Jain', 'Eggetarian', 'Non-Veg']} value={form.diet} onSelect={v => set('diet', v)} /></Field>
          <Field label="Manglik"><PillSelect options={['Yes', 'No', 'Partial', "Don't Know"]} value={form.manglik} onSelect={v => set('manglik', v)} /></Field>
          <Field label="Nakshatra">
            <div className="flex flex-wrap gap-2">
              {NAKSHATRAS.map((n, i) => (
                <button key={n} type="button" onClick={() => set('nakshatra', i)}
                  className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${form.nakshatra === i ? 'pill-active' : ''}`}
                  style={form.nakshatra !== i ? { background: 'white', color: '#C4A265', borderColor: '#E8E0D2' } : {}}>
                  {n}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="card p-5 space-y-4">
          <h3 className="section-label">Preferences</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min Age Pref"><input type="number" value={form.prefAgeMin} onChange={e => set('prefAgeMin', e.target.value)} /></Field>
            <Field label="Max Age Pref"><input type="number" value={form.prefAgeMax} onChange={e => set('prefAgeMax', e.target.value)} /></Field>
          </div>
          <Field label="Preferred Cities"><input type="text" value={form.prefCities} onChange={e => set('prefCities', e.target.value)} placeholder="Mumbai, Delhi (comma separated)" /></Field>
          <Field label="Min Income Preference"><PillSelect options={['No Preference', '5+', '10+', '20+', '35+', '50+']} value={form.prefIncome} onSelect={v => set('prefIncome', v)} /></Field>
          <Field label="Family Type Preference"><PillSelect options={['Joint', 'Nuclear', 'No Preference']} value={form.prefFamily} onSelect={v => set('prefFamily', v)} /></Field>
          <Field label="Non-Negotiables">
            <div className="space-y-4 mt-1">
              {DEALBREAKER_CATEGORIES.map(cat => (
                <div key={cat.label}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#C4A265' }}>{cat.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {cat.items.map(d => (
                      <button key={d} type="button" onClick={() => toggleDealbreaker(d)}
                        className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                        style={form.dealbreakers.includes(d)
                          ? { background: '#8B1A2B', color: 'white', borderColor: '#8B1A2B' }
                          : { background: 'white', color: '#6B5D52', borderColor: '#E8DFD3' }}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {form.dealbreakers.filter(d => !(DEALBREAKERS as readonly string[]).includes(d)).length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#C4A265' }}>Custom</p>
                  <div className="flex flex-wrap gap-2">
                    {form.dealbreakers.filter(d => !(DEALBREAKERS as readonly string[]).includes(d)).map(d => (
                      <span key={d} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: '#8B1A2B', color: 'white', border: '1px solid #8B1A2B' }}>
                        {d}
                        <button type="button" onClick={() => toggleDealbreaker(d)} style={{ marginLeft: 2, fontWeight: 700, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" onClick={() => setShowCustomInput(v => !v)}
                  className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                  style={{ background: showCustomInput ? '#C4A265' : 'white', color: showCustomInput ? 'white' : '#C4A265', borderColor: '#C4A265' }}>
                  + Other
                </button>
              </div>
              {showCustomInput && (
                <div className="flex gap-2">
                  <input type="text" value={customText} onChange={e => setCustomText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && customText.trim()) {
                        toggleDealbreaker(customText.trim());
                        setCustomText(''); setShowCustomInput(false);
                      }
                    }}
                    placeholder="Type your non-negotiable…" className="flex-1" style={{ borderColor: '#C4A265' }} autoFocus />
                  <button type="button" className="btn-primary" style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem' }}
                    disabled={!customText.trim()}
                    onClick={() => {
                      if (!customText.trim()) return;
                      toggleDealbreaker(customText.trim());
                      setCustomText(''); setShowCustomInput(false);
                    }}>
                    Add
                  </button>
                </div>
              )}
            </div>
          </Field>
        </div>

        <div className="sticky bottom-6">
          <button className="btn-primary w-full disabled:opacity-50" style={{ boxShadow: '0 4px 20px rgba(139,105,20,0.4)' }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
