'use client';
// ─────────────────────────────────────────────────────────────────────────────
// The shortlist, as the family sees it.
//
// One list. No tabs, no filters, no search, no infinite scroll — the whole
// surface is this page and the detail page behind each card. Every number
// carries a word, because "26/36" on its own means nothing to the reader.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { FamilyLink, FamilyVerdict, FamilyVerdictWithShare, SharedProspect } from '@/types/family';
import { VERDICT_INFO } from '@/types/family';
import {
  subscribeToMyAccess, subscribeToSharedProspects, subscribeToAllVerdicts,
  getSharedPhotos, touchLastSeen, removeMyAccess,
} from '@/lib/family-share';
import { FAMILY_COPY, familyStageLabel, gunaVerdictWord } from '@/lib/family-copy';
import { useFamilyLang, FamilyHeader, FamilyPage } from '@/components/family/FamilyShell';
import { track } from '@/lib/analytics';
import { useSignOut } from '@/components/SignOutButton';

function scoreColor(score: number): string {
  if (score >= 28) return '#2D6B4F';
  if (score >= 21) return '#7a8b3f';
  if (score >= 18) return '#b8892b';
  return '#8B2A2A';
}

/** One card per rishta, with her own verdict on it if she has left one. */
function RishtaCard({ share, lang, mine }: {
  share: SharedProspect;
  lang: 'hi' | 'en';
  mine: FamilyVerdict | null;
}) {
  const t = FAMILY_COPY[lang];
  const [photo, setPhoto] = useState<string | null>(null);

  // Photos live in their own document because three base64 images are ~800 KB —
  // inlining them in the list query would make this page unusable on 4G. Only
  // the first is needed for a card.
  useEffect(() => {
    if (share.photoCount === 0) return;
    let cancelled = false;
    getSharedPhotos(share.id)
      .then(ps => { if (!cancelled) setPhoto(ps[0] ?? null); })
      .catch(err => console.error('[family] photo load failed', err));
    return () => { cancelled = true; };
  }, [share.id, share.photoCount]);

  const info = mine ? VERDICT_INFO[mine.verdict] : null;

  return (
    <Link
      href={`/family/${share.id}`}
      style={{
        display: 'block', textDecoration: 'none',
        background: 'white', borderRadius: 20, overflow: 'hidden',
        border: '1px solid #e8dece', boxShadow: '0 3px 16px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', gap: 14, padding: 16 }}>
        <div style={{
          width: 88, height: 108, borderRadius: 14, flexShrink: 0, overflow: 'hidden',
          background: 'linear-gradient(145deg, #4a1a0d, #2a0f08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {photo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{
              fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '2rem',
              fontWeight: 700, color: '#f3e7d3',
            }}>{share.name[0]}</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{
            fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.3rem',
            fontWeight: 700, color: '#1a1410', margin: 0, lineHeight: 1.25,
          }}>
            {share.name}{share.age ? `, ${share.age}` : ''}
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#6b5e4d', margin: '5px 0 0', lineHeight: 1.45 }}>
            {[share.profession, share.city, share.gotra].filter(Boolean).join(' · ')}
          </p>

          {share.gunaScore !== null && share.gunaScore !== undefined && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 9,
              padding: '5px 11px', borderRadius: 999,
              background: `${scoreColor(share.gunaScore)}15`,
              border: `1px solid ${scoreColor(share.gunaScore)}44`,
            }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: scoreColor(share.gunaScore) }}>
                {share.gunaScore}/36
              </span>
              <span style={{ fontSize: '0.85rem', color: scoreColor(share.gunaScore) }}>
                {gunaVerdictWord(share.gunaScore, lang)}
              </span>
            </div>
          )}

          <p style={{ fontSize: '0.9rem', color: '#9b8e7e', margin: '9px 0 0' }}>
            {familyStageLabel(share.stage, lang)}
          </p>
        </div>
      </div>

      {/* Her verdict — or the ask. */}
      <div style={{
        padding: '13px 16px',
        borderTop: '1px solid #f2ece1',
        background: info ? info.bg : 'rgba(193,62,42,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <span style={{
          fontSize: '0.95rem', fontWeight: 700,
          color: info ? info.color : '#c13e2a',
        }}>
          {info ? `${t.yourVerdict}: ${info.icon} ${lang === 'hi' ? info.hi : info.en}` : t.verdictPrompt}
        </span>
        <svg width="19" height="19" viewBox="0 0 24 24" fill={info ? info.color : '#c13e2a'}>
          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
        </svg>
      </div>
    </Link>
  );
}

export default function FamilyHomePage() {
  const router = useRouter();
  const [lang, setLang] = useFamilyLang();
  const t = FAMILY_COPY[lang];
  // Shared with every other signed-in surface: analytics, toast, and a guard
  // against a double tap firing two sign-outs.
  const { runSignOut, signingOut } = useSignOut();

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [links, setLinks] = useState<FamilyLink[] | null>(null);
  const [activeOwner, setActiveOwner] = useState<string | null>(null);
  const [shares, setShares] = useState<SharedProspect[]>([]);
  const [sharesReady, setSharesReady] = useState(false);
  const [verdicts, setVerdicts] = useState<FamilyVerdictWithShare[]>([]);

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setAuthReady(true); }), []);

  useEffect(() => {
    if (!authReady) return;
    if (!user) { router.replace('/'); return; }
    return subscribeToMyAccess(user.uid, ls => {
      setLinks(ls);
      setActiveOwner(cur => cur && ls.some(l => l.ownerUid === cur) ? cur : ls[0]?.ownerUid ?? null);
    });
  }, [authReady, user, router]);

  // Someone with no access at all is not a family member — send them to the
  // front door rather than leaving them on an empty page.
  useEffect(() => {
    if (links && links.length === 0) router.replace('/');
  }, [links, router]);

  useEffect(() => {
    if (!activeOwner) return;
    setSharesReady(false);
    track('family_view_opened');
    // One collection-group subscription for every verdict on this shortlist,
    // rather than one per card.
    const u1 = subscribeToSharedProspects(activeOwner, s => { setShares(s); setSharesReady(true); });
    const u2 = subscribeToAllVerdicts(activeOwner, setVerdicts);
    return () => { u1(); u2(); };
  }, [activeOwner]);

  // Stamp "last opened" once per shortlist per visit. This MUST NOT depend
  // on `links`: touchLastSeen writes lastSeenAt, the subscription above fires
  // with a fresh array, and an effect watching `links` would stamp again — an
  // unbounded write loop. The ref pins it to one write per owner.
  const stampedOwner = useRef<string | null>(null);
  useEffect(() => {
    if (!activeOwner || !links || stampedOwner.current === activeOwner) return;
    const link = links.find(l => l.ownerUid === activeOwner);
    if (!link) return;
    stampedOwner.current = activeOwner;
    touchLastSeen(link.id);
  }, [activeOwner, links]);

  const link = links?.find(l => l.ownerUid === activeOwner) ?? null;
  const ownerFirstName = link?.ownerName.split(' ')[0] ?? '';

  const leave = async () => {
    if (!user || !link) return;
    if (!confirm(t.removeAccessConfirm(ownerFirstName))) return;
    await removeMyAccess(user.uid, link.ownerUid);
    router.replace('/');
  };

  if (!authReady || !links || (activeOwner && !sharesReady)) {
    return (
      <>
        <FamilyHeader lang={lang} onLang={setLang} />
        <FamilyPage>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '70px 0' }}>
            <div className="gold-spinner" style={{ width: 30, height: 30 }} />
          </div>
        </FamilyPage>
      </>
    );
  }

  return (
    <>
      <FamilyHeader lang={lang} onLang={setLang} />
      <FamilyPage>
        {/* Whose shortlist — only shown when she has access to more than one. */}
        {links.length > 1 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: '0.85rem', color: '#6b5e4d', margin: '0 0 8px' }}>{t.switchOwner}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {links.map(l => (
                <button
                  key={l.id}
                  onClick={() => setActiveOwner(l.ownerUid)}
                  style={{
                    minHeight: 46, padding: '0 18px', borderRadius: 999, cursor: 'pointer',
                    fontSize: '0.95rem', fontWeight: 700,
                    border: `1.5px solid ${l.ownerUid === activeOwner ? '#c13e2a' : '#e2d5bf'}`,
                    background: l.ownerUid === activeOwner ? 'rgba(193,62,42,0.1)' : 'white',
                    color: l.ownerUid === activeOwner ? '#c13e2a' : '#6b5e4d',
                  }}
                >
                  {l.ownerName.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        <h1 style={{
          fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.7rem',
          fontWeight: 700, color: '#1a1410', margin: '0 0 4px', lineHeight: 1.2,
        }}>
          {t.listTitle(ownerFirstName)}
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#9b8e7e', margin: '0 0 16px' }}>
          {t.rishtaCount(shares.length)}
        </p>

        {/* The expectation-setter. Prevents "why can't I see the other one?" */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: 'rgba(45,107,79,0.07)', border: '1px solid rgba(45,107,79,0.18)',
          borderRadius: 14, padding: '13px 15px', marginBottom: 18,
        }}>
          <span style={{ fontSize: '1rem', lineHeight: 1.4 }}>🔒</span>
          <p style={{ fontSize: '0.9rem', color: '#3d5a4a', margin: 0, lineHeight: 1.55 }}>
            {t.trustBanner(ownerFirstName)}
          </p>
        </div>

        {shares.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: 20, border: '1px solid #e8dece',
            padding: '38px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.2rem', lineHeight: 1 }}>🫖</div>
            <p style={{
              fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.2rem',
              fontWeight: 700, color: '#1a1410', margin: '14px 0 8px', lineHeight: 1.35,
            }}>
              {t.listEmpty(ownerFirstName)}
            </p>
            <p style={{ fontSize: '0.95rem', color: '#6b5e4d', margin: 0, lineHeight: 1.6 }}>
              {t.listEmptyHelp}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {user && shares.map(s => (
              <RishtaCard
                key={s.id}
                share={s}
                lang={lang}
                mine={verdicts.find(v => v.shareId === s.id && v.viewerUid === user.uid) ?? null}
              />
            ))}
          </div>
        )}

        {/* Account actions, deliberately quiet and at the very bottom. */}
        <div style={{
          marginTop: 30, paddingTop: 18, borderTop: '1px solid #e8dece',
          display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start',
        }}>
          <button
            onClick={runSignOut}
            disabled={signingOut}
            style={{
              border: 'none', background: 'none', cursor: 'pointer', padding: '10px 0',
              fontSize: '0.9rem', color: '#6b5e4d',
            }}
          >
            {t.signOut}
          </button>
          <button
            onClick={leave}
            style={{
              border: 'none', background: 'none', cursor: 'pointer', padding: '10px 0',
              fontSize: '0.9rem', color: '#9b8e7e',
            }}
          >
            {t.removeAccess}
          </button>
        </div>
      </FamilyPage>
    </>
  );
}
