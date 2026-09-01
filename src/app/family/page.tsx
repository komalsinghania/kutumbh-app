'use client';
// ─────────────────────────────────────────────────────────────────────────────
// The shortlist, as the family sees it.
//
// One list. No tabs, no filters, no search — this page and the detail page
// behind each card are the whole surface.
//
// Layout notes, because the first pass got these wrong:
//  • The card puts the kundli score on the same baseline as the name, on the
//    right. Previously the text column stopped halfway and left a dead gap
//    exactly where the eye goes looking for the score.
//  • The verdict strip carries real colour weight. At a 10% tint it read as
//    disabled — the opposite of "she has answered".
//  • Account actions sit in a bordered block. Grey text floating at the bottom
//    of a page reads as unfinished.
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
import {
  C, BODY, title, heading, meta, faint, card, numeral, btnQuiet,
} from '@/components/ui';

function scoreColor(score: number): string {
  if (score >= 28) return C.success;
  if (score >= 21) return '#7a8b3f';
  if (score >= 18) return C.gold;
  return C.danger;
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
  const hasScore = share.gunaScore !== null && share.gunaScore !== undefined;
  const sc = hasScore ? scoreColor(share.gunaScore as number) : C.faint;
  // Age rides in the meta line rather than the heading: on a phone
  // "Rohan Agarwal, 29" wraps and strands the age on a line of its own.
  const line = [share.age ? `${share.age} yrs` : null, share.profession, share.city, share.gotra]
    .filter(Boolean).join(' · ');

  return (
    <Link href={`/family/${share.id}`} style={{ ...card, display: 'block', textDecoration: 'none' }}>
      <div style={{ display: 'flex', gap: 16, padding: 16, alignItems: 'flex-start' }}>
        {/* Portrait */}
        <div style={{
          width: 76, height: 92, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
          background: C.cardQuiet, border: `1px solid ${C.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {photo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ ...numeral, fontSize: '1.5rem', color: C.faint }}>{share.name[0]}</span>
          )}
        </div>

        {/* Content fills the remaining width; the score takes the right edge. */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h2 style={{ ...heading, flex: 1, minWidth: 0 }}>{share.name}</h2>
            {hasScore && (
              <span style={{
                ...numeral, fontSize: '1.05rem', color: sc, flexShrink: 0,
                display: 'flex', alignItems: 'baseline', gap: 3,
              }}>
                {share.gunaScore}
                <span style={{ fontFamily: BODY, fontSize: '0.72rem', fontWeight: 500, color: C.faint }}>/36</span>
              </span>
            )}
          </div>

          {line && <p style={{ ...meta, marginTop: 5 }}>{line}</p>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 11, flexWrap: 'wrap' }}>
            <span style={{ ...faint, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span aria-hidden style={{
                width: 5, height: 5, borderRadius: '50%', background: C.gold, flexShrink: 0,
              }} />
              {familyStageLabel(share.stage, lang)}
            </span>
            {hasScore && (
              <span style={{ ...faint, color: sc, fontWeight: 600 }}>
                {gunaVerdictWord(share.gunaScore, lang)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Her verdict — or the ask. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '12px 16px',
        borderTop: `1px solid ${C.lineSoft}`,
        background: info ? info.bg : C.cardQuiet,
      }}>
        <span style={{
          fontFamily: BODY, fontSize: '0.88rem', fontWeight: 600,
          color: info ? info.color : C.sindoor,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          {info && <span aria-hidden>{info.icon}</span>}
          {info ? `${t.yourVerdict}: ${lang === 'hi' ? info.hi : info.en}` : t.verdictPrompt}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill={info ? info.color : C.sindoor} aria-hidden>
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
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div className="gold-spinner" style={{ width: 28, height: 28 }} />
          </div>
        </FamilyPage>
      </>
    );
  }

  return (
    <>
      <FamilyHeader lang={lang} onLang={setLang} />
      <FamilyPage>

        {/* Whose shortlist — only when she has access to more than one. */}
        {links.length > 1 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ ...faint, marginBottom: 8 }}>{t.switchOwner}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {links.map(l => {
                const on = l.ownerUid === activeOwner;
                return (
                  <button
                    key={l.id}
                    onClick={() => setActiveOwner(l.ownerUid)}
                    style={{
                      fontFamily: BODY, fontSize: '0.88rem', fontWeight: 600,
                      minHeight: 42, padding: '0 16px', borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${on ? C.sindoor : C.line}`,
                      background: on ? C.sindoorSoft : C.card,
                      color: on ? C.sindoor : C.muted,
                    }}
                  >
                    {l.ownerName.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Title block. The trust line rides with the count instead of sitting
            in its own filled box competing with the rishtas. */}
        <header style={{ marginBottom: 24 }}>
          <h1 style={title}>{t.listTitle(ownerFirstName)}</h1>
          <p style={{ ...meta, marginTop: 7 }}>
            {t.rishtaCount(shares.length)}
            <span aria-hidden style={{ color: C.line, padding: '0 8px' }}>·</span>
            <span style={{ color: C.faint }}>{t.trustBanner(ownerFirstName)}</span>
          </p>
        </header>

        {shares.length === 0 ? (
          <div style={{ ...card, padding: '48px 24px', textAlign: 'center' }}>
            <h2 style={{ ...heading, marginBottom: 8 }}>{t.listEmpty(ownerFirstName)}</h2>
            <p style={{ ...meta, maxWidth: '38ch', margin: '0 auto' }}>{t.listEmptyHelp}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

        {/* Account, in a block of its own so it reads as deliberate. */}
        <section style={{ ...card, marginTop: 36 }}>
          <button
            onClick={runSignOut}
            disabled={signingOut}
            style={{
              ...btnQuiet, width: '100%', textAlign: 'left', padding: '15px 16px',
              color: C.ink, fontSize: '0.9rem', fontWeight: 500,
            }}
          >
            {signingOut ? '…' : t.signOut}
          </button>
          <div style={{ height: 1, background: C.lineSoft }} />
          <button
            onClick={leave}
            style={{
              ...btnQuiet, width: '100%', textAlign: 'left', padding: '15px 16px',
              color: C.muted, fontSize: '0.9rem',
            }}
          >
            {t.removeAccess}
          </button>
        </section>

      </FamilyPage>
    </>
  );
}
