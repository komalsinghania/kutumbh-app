'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { saveUserProfile, recalcAllProspectScores, deleteAllUserData } from '@/lib/firestore';
import { NAKSHATRAS, DEALBREAKERS, DEALBREAKER_CATEGORIES, HOBBIES, Gender, Diet, Manglik, Education, Income, IncomePref, FamilyType } from '@/types';
import {
  deleteUser, reauthenticateWithPopup, reauthenticateWithCredential,
  EmailAuthProvider, GoogleAuthProvider,
} from 'firebase/auth';
import { track } from '@/lib/analytics';
import toast from 'react-hot-toast';

function PillSelect({ options, value, onSelect }: { options: string[]; value: string; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onSelect(opt)}
          className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${value === opt ? 'pill-active' : ''}`}
          style={value !== opt ? { background: 'white', color: '#c13e2a', borderColor: '#d6c9b0' } : {}}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#c13e2a' }}>{label}</label>
      {children}
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

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState('');

  // Account deletion
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const isPasswordUser = user?.providerData?.[0]?.providerId === 'password';

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (deleteConfirm.trim().toUpperCase() !== 'DELETE') {
      toast.error('Type DELETE to confirm.');
      return;
    }
    if (isPasswordUser && !deletePassword) {
      toast.error('Enter your password to confirm.');
      return;
    }
    setDeleting(true);
    try {
      // Re-verify identity (required by Firebase before deleting an account).
      const providerId = user.providerData?.[0]?.providerId;
      if (providerId === 'google.com') {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      } else if (providerId === 'password') {
        const cred = EmailAuthProvider.credential(user.email || '', deletePassword);
        await reauthenticateWithCredential(user, cred);
      }
      track('account_deleted');
      // Delete all Firestore data WHILE still authenticated, then the auth account.
      await deleteAllUserData(user.uid);
      await deleteUser(user);
      toast.success('Your account and all data have been deleted.');
      router.replace('/');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error('Incorrect password.');
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        toast.error('Verification was cancelled.');
      } else {
        toast.error('Could not delete account. Please try again.');
      }
      setDeleting(false);
    }
  };

  const [form, setForm] = useState({
    name: '', gender: '' as Gender, age: '', city: '', education: '' as Education,
    profession: '', income: '' as Income, diet: '' as Diet, manglik: '' as Manglik,
    nakshatra: -1, prefAgeMin: '', prefAgeMax: '', prefCities: '',
    prefIncome: '' as IncomePref, prefFamily: '' as FamilyType, dealbreakers: [] as string[],
    hobbies: [] as string[],
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
        hobbies: profile.hobbies || [],
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
  const toggleHobby = (h: string) => setForm(f => ({
    ...f,
    hobbies: f.hobbies.includes(h) ? f.hobbies.filter(x => x !== h) : [...f.hobbies, h],
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
        hobbies: form.hobbies.length > 0 ? form.hobbies : undefined,
      });
      // Preferences feed every prospect's compatibility/kundli score — recompute them all.
      const updated = await recalcAllProspectScores(user.uid);
      await refreshProfile();
      toast.success(updated > 0 ? `Profile updated · ${updated} match score${updated !== 1 ? 's' : ''} refreshed` : 'Profile updated!');
      router.back();
    } catch {
      toast.error('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#f5ede0' }}>
      <div className="suite-header px-4 flex items-center gap-3 sticky top-0 z-10" style={{ height: 56 }}>
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full" style={{ color: '#ffffff' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)', color: '#ffffff', fontSize: '1.125rem' }} className="font-semibold">
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
                  style={form.nakshatra !== i ? { background: 'white', color: '#c13e2a', borderColor: '#d6c9b0' } : {}}>
                  {n}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Hobbies & Interests">
            <HobbyPicker options={HOBBIES} selected={form.hobbies} onToggle={toggleHobby} />
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
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#c13e2a' }}>{cat.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {cat.items.map(d => (
                      <button key={d} type="button" onClick={() => toggleDealbreaker(d)}
                        className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                        style={form.dealbreakers.includes(d)
                          ? { background: '#c13e2a', color: 'white', borderColor: '#c13e2a' }
                          : { background: 'white', color: '#6b5e4d', borderColor: '#d6c9b0' }}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
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
                <button type="button" onClick={() => setShowCustomInput(v => !v)}
                  className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                  style={{ background: showCustomInput ? '#c13e2a' : 'white', color: showCustomInput ? 'white' : '#c13e2a', borderColor: '#c13e2a' }}>
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
                    placeholder="Type your non-negotiable…" className="flex-1" style={{ borderColor: '#c13e2a' }} autoFocus />
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
          <button className="btn-primary w-full disabled:opacity-50" style={{ boxShadow: '0 4px 20px rgba(193,62,42,0.4)' }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* ── Danger Zone ── */}
        <div style={{
          marginTop: 28, borderRadius: 16, border: '1px solid rgba(139,42,42,0.3)',
          background: 'rgba(139,42,42,0.04)', padding: '18px 20px',
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B2A2A', marginBottom: 6 }}>
            Danger Zone
          </div>
          <p style={{ fontSize: '0.82rem', color: '#6b5e4d', lineHeight: 1.6, marginBottom: 14 }}>
            Permanently delete your account and <strong style={{ color: '#1a1410' }}>all</strong> your data — every prospect,
            note, conversation, rating, and your profile. This cannot be undone.
          </p>
          <button
            onClick={() => { setShowDelete(true); setDeleteConfirm(''); setDeletePassword(''); }}
            style={{
              background: 'white', color: '#8B2A2A', border: '1.5px solid rgba(139,42,42,0.4)',
              borderRadius: 10, padding: '10px 18px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Delete my account & data
          </button>
        </div>
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDelete && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(26,20,16,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={() => !deleting && setShowDelete(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 18, maxWidth: 440, width: '100%',
              padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.3rem', fontWeight: 700, color: '#8B2A2A', marginBottom: 8 }}>
              Delete your account?
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#6b5e4d', lineHeight: 1.6, marginBottom: 16 }}>
              This permanently erases your profile and every prospect, note, conversation, flag, and meeting.
              <strong style={{ color: '#1a1410' }}> There is no way to recover it.</strong>
            </p>

            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b5e4d', display: 'block', marginBottom: 6 }}>
              Type <span style={{ color: '#8B2A2A', fontWeight: 800 }}>DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              autoFocus
              style={{ marginBottom: isPasswordUser ? 12 : 18 }}
            />

            {isPasswordUser && (
              <>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b5e4d', display: 'block', marginBottom: 6 }}>
                  Confirm your password
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  placeholder="Your password"
                  style={{ marginBottom: 18 }}
                />
              </>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                style={{
                  flex: 1, background: 'white', color: '#6b5e4d', border: '1px solid #d6c9b0',
                  borderRadius: 10, padding: '11px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm.trim().toUpperCase() !== 'DELETE'}
                style={{
                  flex: 1, background: '#8B2A2A', color: 'white', border: 'none',
                  borderRadius: 10, padding: '11px', fontSize: '0.85rem', fontWeight: 700,
                  cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting || deleteConfirm.trim().toUpperCase() !== 'DELETE' ? 0.6 : 1,
                }}
              >
                {deleting ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
