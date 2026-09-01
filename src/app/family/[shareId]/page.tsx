'use client';
// ─────────────────────────────────────────────────────────────────────────────
// One rishta, and her say on it.
//
// The verdict is three big buttons and a comment box — advisory, never a veto.
// The app records the opinion against the right rishta so it stops arriving
// mid-meeting as "waise, mujhe woh pehle wala theek laga tha".
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import toast from 'react-hot-toast';
import type { FamilyLink, FamilyVerdict, SharedProspect } from '@/types/family';
import { VERDICT_OPTIONS, VERDICT_INFO, type VerdictValue } from '@/types/family';
import {
  subscribeToShare, subscribeToVerdicts, getSharedPhotos,
  saveVerdict, getMyAccess, ownerUidOfShare,
} from '@/lib/family-share';
import { FAMILY_COPY } from '@/lib/family-copy';
import { useFamilyLang, FamilyHeader, FamilyPage, BackButton } from '@/components/family/FamilyShell';
import SharedRishtaView from '@/components/family/SharedRishtaView';
import { track } from '@/lib/analytics';
import { C, BODY, heading, label, meta, card, btnPrimary } from '@/components/ui';

export default function FamilyRishtaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.shareId as string;
  const [lang, setLang] = useFamilyLang();
  const t = FAMILY_COPY[lang];

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [link, setLink] = useState<FamilyLink | null>(null);
  const [share, setShare] = useState<SharedProspect | null>(null);
  const [shareReady, setShareReady] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [verdicts, setVerdicts] = useState<FamilyVerdict[]>([]);

  const [choice, setChoice] = useState<VerdictValue | null>(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setAuthReady(true); }), []);

  useEffect(() => {
    if (!authReady) return;
    if (!user) { router.replace('/'); return; }
    getMyAccess(user.uid)
      .then(ls => {
        const match = ls.find(l => l.ownerUid === ownerUidOfShare(id)) ?? null;
        setLink(match);
        if (!match) router.replace('/family');
      })
      .catch(err => { console.error('[family/detail] access check failed', err); router.replace('/family'); });
  }, [authReady, user, id, router]);

  useEffect(() => {
    if (!link) return;
    const u1 = subscribeToShare(id, s => { setShare(s); setShareReady(true); });
    const u2 = subscribeToVerdicts(id, setVerdicts);
    getSharedPhotos(id).then(setPhotos).catch(err => console.error('[family/detail] photos failed', err));
    return () => { u1(); u2(); };
  }, [id, link]);

  // Seed the form from her saved verdict, but never stomp on edits in progress.
  const mine = user ? verdicts.find(v => v.viewerUid === user.uid) ?? null : null;
  useEffect(() => {
    if (dirty || !mine) return;
    setChoice(mine.verdict);
    setComment(mine.comment ?? '');
  }, [mine, dirty]);

  const others = user ? verdicts.filter(v => v.viewerUid !== user.uid) : [];
  const ownerFirstName = link?.ownerName.split(' ')[0] ?? '';

  const submit = async () => {
    if (!user || !link || !choice) return;
    setSaving(true);
    try {
      await saveVerdict(
        id,
        { uid: user.uid, name: link.viewerName, relationLabel: link.relationLabel },
        choice,
        comment,
      );
      track('family_verdict_given', { verdict: choice, relation: link.relationLabel });
      setDirty(false);
      toast.success(t.saved(ownerFirstName));
    } catch (err) {
      console.error('[family/detail] saveVerdict failed', err);
      toast.error(lang === 'hi' ? 'Nahi bhej paye. Dobara koshish kijiye.' : 'Could not send. Please try again.');
    } finally { setSaving(false); }
  };

  const header = (
    <FamilyHeader
      lang={lang}
      onLang={setLang}
      left={<BackButton label={t.back} onClick={() => router.push('/family')} />}
      wide
    />
  );

  if (!authReady || !link || !shareReady) {
    return (
      <>
        {header}
        <FamilyPage wide>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '70px 0' }}>
            <div className="gold-spinner" style={{ width: 30, height: 30 }} />
          </div>
        </FamilyPage>
      </>
    );
  }

  // The owner un-shared it while she had the page open.
  if (!share) {
    return (
      <>
        {header}
        <FamilyPage wide>
          <div style={{
            background: 'white', borderRadius: 20, border: '1px solid #e8dece',
            padding: '38px 24px', textAlign: 'center', marginTop: 20,
          }}>
            <div style={{ fontSize: '2.2rem', lineHeight: 1 }}>🙏</div>
            <p style={{
              fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.15rem',
              fontWeight: 700, color: '#1a1410', margin: '14px 0 0', lineHeight: 1.4,
            }}>
              {t.noLongerShared}
            </p>
            <button
              onClick={() => router.replace('/family')}
              style={{
                marginTop: 20, width: '100%', minHeight: 54, borderRadius: 14, border: 'none',
                cursor: 'pointer', background: 'linear-gradient(135deg, #d44d36, #b83521)',
                color: 'white', fontSize: '1rem', fontWeight: 700,
              }}
            >
              {t.back}
            </button>
          </div>
        </FamilyPage>
      </>
    );
  }

  return (
    <>
      {header}
      <FamilyPage wide>
        <SharedRishtaView
          share={share}
          photos={photos}
          lang={lang}
          aside={
            <>
              {/* ── Her verdict ── */}
              <div style={{ ...card, padding: "20px 20px 22px" }}>
                <h2 style={heading}>{t.yourTake}</h2>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                  {VERDICT_OPTIONS.map(o => {
                    const active = choice === o.value;
                    return (
                      <button
                        key={o.value}
                        onClick={() => { setChoice(o.value); setDirty(true); }}
                        aria-pressed={active}
                        style={{
                          display: "flex", alignItems: "center", gap: 13,
                          minHeight: 58, padding: "0 16px", borderRadius: 10, cursor: "pointer",
                          border: `1.5px solid ${active ? o.color : C.line}`,
                          background: active ? o.bg : C.card,
                          transition: "background 0.15s ease, border-color 0.15s ease",
                        }}
                      >
                        <span aria-hidden style={{ fontSize: "1.2rem", lineHeight: 1, color: o.color }}>{o.icon}</span>
                        <span style={{
                          fontFamily: BODY, fontSize: "1.02rem", fontWeight: 600,
                          color: active ? o.color : C.ink,
                        }}>
                          {lang === "hi" ? o.hi : o.en}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <textarea
                  value={comment}
                  onChange={e => { setComment(e.target.value); setDirty(true); }}
                  placeholder={t.commentPlaceholder}
                  rows={3}
                  style={{
                    width: "100%", marginTop: 12, borderRadius: 10, padding: "13px 14px",
                    border: `1px solid ${C.line}`, background: C.cardQuiet,
                    fontFamily: BODY, fontSize: "0.98rem", color: C.ink,
                    lineHeight: 1.55, resize: "vertical",
                  }}
                />

                <button
                  onClick={submit}
                  disabled={!choice || saving || (!dirty && !!mine)}
                  style={{
                    ...btnPrimary, width: "100%", marginTop: 12, minHeight: 52,
                    fontSize: "1rem",
                    background: !choice || (!dirty && !!mine) ? C.line : C.sindoor,
                    color: !choice || (!dirty && !!mine) ? C.muted : "#fff",
                    cursor: !choice || saving || (!dirty && !!mine) ? "default" : "pointer",
                  }}
                >
                  {saving ? t.saving : !dirty && mine ? `✓ ${t.saved(ownerFirstName)}` : t.save}
                </button>
              </div>

              {/* ── Everyone else, side by side ── */}
              {others.length > 0 && (
                <div style={{ ...card, padding: "18px 20px 6px" }}>
                  <p style={label}>{t.othersSaid}</p>
                  {others.map(v => {
                    const info = VERDICT_INFO[v.verdict];
                    return (
                      <div key={v.viewerUid} style={{
                        display: "flex", gap: 12, padding: "14px 0",
                        borderBottom: `1px solid ${C.lineSoft}`,
                      }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                          background: info.bg, border: `1px solid ${info.border}`, color: info.color,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem",
                        }} aria-hidden>{info.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontFamily: BODY, fontSize: "0.94rem", fontWeight: 600, color: C.ink, margin: 0,
                          }}>
                            {v.relationLabel}
                            <span style={{ color: info.color }}> — {lang === "hi" ? info.hi : info.en}</span>
                          </p>
                          {v.comment && (
                            <p style={{ ...meta, marginTop: 4, fontStyle: "italic" }}>
                              &ldquo;{v.comment}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          }
        />
      </FamilyPage>
    </>
  );
}
