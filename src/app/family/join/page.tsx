'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Accepting an invitation.
//
// The person landing here has probably never used this app and was sent a link
// on WhatsApp by their daughter. So: say who invited them and what they'll be
// able to do BEFORE asking them to sign in, keep it to one button, and never
// let them fall into the seeker onboarding flow.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import AuthModal from '@/components/AuthModal';
import { Logo } from '@/components/Logo';
import { claimInvite, getInvite } from '@/lib/family-share';
import type { FamilyInvite } from '@/types/family';
import { FAMILY_COPY } from '@/lib/family-copy';
import { useFamilyLang, FamilyHeader, FamilyPage } from '@/components/family/FamilyShell';
import { track } from '@/lib/analytics';

type Bad = 'not_found' | 'expired' | 'claimed' | 'self';
type Step = 'intro' | 'auth' | 'name' | 'joining';

const CARD: React.CSSProperties = {
  background: 'white', borderRadius: 20, border: '1px solid #e8dece',
  boxShadow: '0 4px 20px rgba(0,0,0,0.06)', padding: '26px 22px',
};

const BIG_BUTTON: React.CSSProperties = {
  width: '100%', minHeight: 56, borderRadius: 14, border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg, #d44d36, #b83521)',
  color: 'white', fontSize: '1.05rem', fontWeight: 700,
  boxShadow: '0 6px 20px rgba(193,62,42,0.32)',
};

export default function FamilyJoinPage() {
  const router = useRouter();
  const [lang, setLang] = useFamilyLang();
  const t = FAMILY_COPY[lang];

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [invite, setInvite] = useState<FamilyInvite | null>(null);
  const [bad, setBad] = useState<Bad | null>(null);
  const [step, setStep] = useState<Step>('intro');
  const [name, setName] = useState('');

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setAuthReady(true); }), []);

  // Resolve the code. Re-runs when auth settles so "already claimed" can be
  // told apart from "claimed by you" (a re-visit should just let you through).
  useEffect(() => {
    if (!authReady) return;
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) { setBad('not_found'); return; }

    let cancelled = false;
    getInvite(code)
      .then(inv => {
        if (cancelled) return;
        if (!inv || inv.status === 'revoked') { setBad('not_found'); return; }
        if (inv.expiresAt <= Date.now()) { setBad('expired'); return; }
        if (user && inv.ownerUid === user.uid) { setBad('self'); return; }
        if (inv.status === 'claimed' && inv.claimedByUid !== user?.uid) { setBad('claimed'); return; }
        setBad(null);
        setInvite(inv);
      })
      .catch(err => {
        console.error('[family/join] getInvite failed', err);
        if (!cancelled) setBad('not_found');
      });
    return () => { cancelled = true; };
  }, [authReady, user]);

  // Signing in is the only thing that happens on the 'auth' step, so as soon as
  // it lands, move on rather than making them press Continue twice.
  useEffect(() => {
    if (step === 'auth' && user) {
      setName(n => n || user.displayName || '');
      setStep('name');
    }
  }, [step, user]);

  const proceed = () => {
    if (user) {
      setName(n => n || user.displayName || '');
      setStep('name');
    } else {
      setStep('auth');
    }
  };

  const finish = async () => {
    if (!invite || !user) return;
    setStep('joining');
    try {
      const result = await claimInvite(invite.code, user.uid, name.trim() || 'Family');
      if (!result.ok) {
        setBad(result.reason === 'not_found' ? 'not_found' : result.reason);
        return;
      }
      track('family_invite_claimed', { relation: invite.relationLabel });
      router.replace('/family');
    } catch (err) {
      console.error('[family/join] claim failed', err);
      setBad('not_found');
    }
  };

  const ownerFirstName = invite?.ownerName.split(' ')[0] ?? '';
  const loading = !authReady || (!invite && !bad);

  return (
    <>
      <FamilyHeader lang={lang} onLang={setLang} />
      <FamilyPage>
        {loading || step === 'joining' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '70px 0' }}>
            <div className="gold-spinner" style={{ width: 30, height: 30 }} />
            {step === 'joining' && <p style={{ color: '#6b5e4d' }}>{t.saving}</p>}
          </div>
        ) : bad ? (
          <div style={{ ...CARD, textAlign: 'center', marginTop: 24 }}>
            <div style={{ fontSize: '2.4rem', lineHeight: 1 }}>🙏</div>
            <h1 style={{
              fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.4rem',
              fontWeight: 700, color: '#1a1410', margin: '14px 0 8px', lineHeight: 1.3,
            }}>
              {bad === 'claimed' ? t.inviteClaimed : bad === 'self' ? t.inviteSelf : t.inviteExpired}
            </h1>
            {bad !== 'self' && (
              <p style={{ color: '#6b5e4d', lineHeight: 1.6, margin: 0 }}>
                {t.inviteExpiredHelp(ownerFirstName || undefined)}
              </p>
            )}
            <button onClick={() => router.replace('/')} style={{ ...BIG_BUTTON, marginTop: 20 }}>
              RokaMaybe
            </button>
          </div>
        ) : step === 'intro' ? (
          <div style={{ ...CARD, marginTop: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <Logo style={{ fontSize: '1.7rem' }} />
            </div>
            <h1 style={{
              fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.55rem',
              fontWeight: 700, color: '#1a1410', margin: '20px 0 10px', lineHeight: 1.25,
            }}>
              {t.joinTitle(ownerFirstName)}
            </h1>
            <p style={{ color: '#4a4038', lineHeight: 1.65, margin: 0 }}>{t.joinSubtitle}</p>

            <div style={{ marginTop: 18, background: '#f9f6f0', borderRadius: 14, padding: 16 }}>
              <p style={{
                fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: '#c13e2a', margin: '0 0 10px',
              }}>
                {lang === 'hi' ? 'Aap dekh sakte hain' : "You'll see"}
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {(lang === 'hi'
                  ? ['Photo aur poora biodata', 'Kundli milan ka score', 'Ghar-parivar ki jaankari', 'Abhi kya chal raha hai']
                  : ['Photos and full biodata', 'The kundli milan score', 'Family details', 'Where things stand']
                ).map(item => (
                  <li key={item} style={{ display: 'flex', gap: 9, color: '#4a4038', fontSize: '0.95rem' }}>
                    <span style={{ color: '#2D6B4F', fontWeight: 700 }}>✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>

            <button onClick={proceed} style={{ ...BIG_BUTTON, marginTop: 20 }}>{t.joinCta}</button>
          </div>
        ) : step === 'auth' ? (
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
            <AuthModal
              inline
              subtitle={t.joinTitle(ownerFirstName)}
              onClose={() => setStep('intro')}
              onSuccess={() => { /* the auth listener advances to the name step */ }}
            />
          </div>
        ) : (
          <div style={{ ...CARD, marginTop: 16 }}>
            <h1 style={{
              fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.4rem',
              fontWeight: 700, color: '#1a1410', margin: '0 0 6px',
            }}>
              {t.joinNamePrompt}
            </h1>
            <p style={{ color: '#6b5e4d', margin: '0 0 16px', fontSize: '0.95rem' }}>
              {lang === 'hi'
                ? `${ownerFirstName} ko yahi naam dikhega.`
                : `${ownerFirstName} will see this name.`}
            </p>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.joinNamePlaceholder}
              autoFocus
              style={{
                width: '100%', minHeight: 56, borderRadius: 14, padding: '0 16px',
                border: '1.5px solid #d6c9b0', background: '#f9f6f0',
                fontSize: '1.05rem', color: '#1a1410',
              }}
            />
            <button
              onClick={finish}
              disabled={!name.trim()}
              style={{
                ...BIG_BUTTON, marginTop: 16,
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                background: name.trim() ? BIG_BUTTON.background : '#d6c9b0',
                boxShadow: name.trim() ? BIG_BUTTON.boxShadow : 'none',
              }}
            >
              {t.joinNameCta}
            </button>
          </div>
        )}
      </FamilyPage>
    </>
  );
}
