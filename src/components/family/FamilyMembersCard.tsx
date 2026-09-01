'use client';
// ─────────────────────────────────────────────────────────────────────────────
// "Family access" — the owner's control panel, in the Profile tab.
//
// Invites go out over WhatsApp, not email: there is no mail infrastructure in
// this app, and WhatsApp is where this conversation actually happens anyway.
// The link is single-use, expires in a week, and can be revoked from here.
//
// Styling follows the shared system in components/ui.ts. Notably the primary
// action is no longer a full-width sindoor slab — on a page of quiet cards that
// read as a siren, and it competed with the actual content.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { FamilyInvite, FamilyLink, RelationLabel } from '@/types/family';
import { RELATION_LABELS } from '@/types/family';
import {
  createInvite, revokeInvite, removeFamilyMember,
  subscribeToFamilyMembers, subscribeToPendingInvites, MAX_FAMILY_MEMBERS,
} from '@/lib/family-share';
import { track } from '@/lib/analytics';
import {
  C, BODY, heading, label, meta, faint, card, btnPrimary, btnSecondary,
} from '@/components/ui';

function joinUrl(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/family/join?code=${code}`;
}

function inviteMessage(ownerName: string, relation: string, url: string): string {
  return `${ownerName} ne aapko RokaMaybe pe add kiya hai — yahan aap unke shortlist ke rishte dekh sakte hain aur apna verdict de sakte hain.\n\n${url}\n\n(Yeh link 7 din tak chalega.)`;
}

function timeAgo(ts?: number): string {
  if (!ts) return 'not yet';
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  return `${Math.floor(d / 30)} mo ago`;
}

const ROW: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
};

export default function FamilyMembersCard({
  uid, ownerName, sharedCount, autoOpenInvite, onInviteHandled,
}: {
  uid: string;
  ownerName: string;
  sharedCount: number;
  /** Set when the user arrived here from "Invite family" on a rishta. */
  autoOpenInvite?: boolean;
  onInviteHandled?: () => void;
}) {
  const [members, setMembers] = useState<FamilyLink[]>([]);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<{ code: string; relation: RelationLabel } | null>(null);

  useEffect(() => {
    const u1 = subscribeToFamilyMembers(uid, setMembers);
    const u2 = subscribeToPendingInvites(uid, setInvites);
    return () => { u1(); u2(); };
  }, [uid]);

  useEffect(() => {
    if (autoOpenInvite) { setPicking(true); onInviteHandled?.(); }
  }, [autoOpenInvite, onInviteHandled]);

  const atCapacity = members.length + invites.length >= MAX_FAMILY_MEMBERS;
  const isEmpty = members.length === 0 && invites.length === 0 && !fresh;

  const makeInvite = async (relation: RelationLabel) => {
    if (atCapacity) {
      toast.error(`You can add up to ${MAX_FAMILY_MEMBERS} family members.`);
      return;
    }
    setCreating(true);
    try {
      const code = await createInvite(uid, ownerName, relation);
      setFresh({ code, relation });
      setPicking(false);
      track('family_invite_created', { relation });
    } catch (err) {
      console.error('[FamilyMembersCard] createInvite failed', err);
      toast.error('Could not create the invite. Please try again.');
    } finally { setCreating(false); }
  };

  const shareOnWhatsApp = (code: string, relation: string) => {
    const text = inviteMessage(ownerName, relation, joinUrl(code));
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const copyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(joinUrl(code));
      toast.success('Link copied.');
    } catch {
      toast.error('Could not copy. Long-press the link instead.');
    }
  };

  const drop = async (m: FamilyLink) => {
    if (!confirm(`${m.viewerName} (${m.relationLabel}) will stop seeing your shortlist. Remove them?`)) return;
    try {
      await removeFamilyMember(uid, m.viewerUid, m.inviteCode);
      track('family_member_removed', { relation: m.relationLabel });
      toast.success(`${m.relationLabel} removed.`);
    } catch (err) {
      console.error('[FamilyMembersCard] removeFamilyMember failed', err);
      toast.error('Could not remove. Please try again.');
    }
  };

  const cancelInvite = async (code: string) => {
    try {
      await revokeInvite(code);
      toast.success('Invite cancelled.');
      if (fresh?.code === code) setFresh(null);
    } catch {
      toast.error('Could not cancel the invite.');
    }
  };

  return (
    <section>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 12, marginBottom: 10,
      }}>
        <h2 style={label}>Mummy Mode</h2>
        {members.length > 0 && (
          <span style={faint}>
            {sharedCount === 0
              ? 'Nothing shared yet'
              : `${sharedCount} rishta${sharedCount === 1 ? '' : 's'} shared`}
          </span>
        )}
      </div>

      <div style={card}>

        {isEmpty ? (
          <div style={{ padding: 18 }}>
            <h3 style={heading}>Mummy poochti rehti hai?</h3>
            <p style={{ ...meta, marginTop: 6, maxWidth: '52ch' }}>
              Give her a login of her own. She sees the rishtas you choose — biodata, photos,
              kundli score, family details — and can leave her verdict. Your notes, flags,
              call logs and ratings stay yours.
            </p>
          </div>
        ) : (
          <>
            {members.map((m, i) => (
              <div key={m.id} style={{
                ...ROW,
                borderTop: i === 0 ? 'none' : `1px solid ${C.lineSoft}`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: C.sindoorSoft, color: C.sindoor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: BODY, fontWeight: 600, fontSize: '0.82rem',
                }}>
                  {m.viewerName.trim()[0]?.toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: BODY, fontSize: '0.92rem', fontWeight: 600, color: C.ink, margin: 0,
                  }}>
                    {m.relationLabel}
                    <span style={{ fontWeight: 400, color: C.muted }}> · {m.viewerName}</span>
                  </p>
                  <p style={{ ...faint, marginTop: 2 }}>Last opened {timeAgo(m.lastSeenAt)}</p>
                </div>
                <button
                  onClick={() => drop(m)}
                  style={{
                    fontFamily: BODY, fontSize: '0.82rem', fontWeight: 500, color: C.muted,
                    background: 'none', border: 0, padding: '6px 2px', cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            ))}

            {invites.map(i => (
              <div key={i.code} style={{ ...ROW, borderTop: `1px solid ${C.lineSoft}` }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: C.cardQuiet, border: `1px dashed ${C.line}`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: BODY, fontSize: '0.92rem', fontWeight: 600, color: C.ink, margin: 0,
                  }}>
                    {i.relationLabel}
                  </p>
                  <p style={{ ...faint, marginTop: 2 }}>Invite sent — not opened yet</p>
                </div>
                <button
                  onClick={() => shareOnWhatsApp(i.code, i.relationLabel)}
                  style={{
                    fontFamily: BODY, fontSize: '0.82rem', fontWeight: 600, color: C.success,
                    background: 'none', border: 0, padding: '6px 8px', cursor: 'pointer',
                  }}
                >
                  Resend
                </button>
                <button
                  onClick={() => cancelInvite(i.code)}
                  style={{
                    fontFamily: BODY, fontSize: '0.82rem', fontWeight: 500, color: C.muted,
                    background: 'none', border: 0, padding: '6px 2px', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            ))}
          </>
        )}

        {/* Freshly created invite — the one moment that deserves emphasis. */}
        {fresh && (
          <div style={{
            padding: 18, borderTop: `1px solid ${C.lineSoft}`, background: C.cardQuiet,
          }}>
            <p style={{ fontFamily: BODY, fontSize: '0.92rem', fontWeight: 600, color: C.ink, margin: 0 }}>
              Invite ready for {fresh.relation}
            </p>
            <p style={{ ...faint, margin: '4px 0 14px' }}>
              Works once, expires in 7 days.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => shareOnWhatsApp(fresh.code, fresh.relation)} style={btnPrimary}>
                Send on WhatsApp
              </button>
              <button onClick={() => copyLink(fresh.code)} style={btnSecondary}>
                Copy link
              </button>
            </div>
          </div>
        )}

        {/* Relation picker / invite action */}
        <div style={{ padding: 18, borderTop: `1px solid ${C.lineSoft}` }}>
          {picking ? (
            <>
              <p style={{ ...meta, marginBottom: 10 }}>Who are you inviting?</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {RELATION_LABELS.map(r => (
                  <button
                    key={r}
                    disabled={creating}
                    onClick={() => makeInvite(r)}
                    style={{
                      ...btnSecondary,
                      padding: '9px 14px',
                      fontSize: '0.85rem',
                      cursor: creating ? 'wait' : 'pointer',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPicking(false)}
                style={{
                  fontFamily: BODY, fontSize: '0.84rem', color: C.faint,
                  background: 'none', border: 0, padding: '12px 0 0', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setPicking(true)}
              disabled={atCapacity}
              style={{
                ...(isEmpty ? btnPrimary : btnSecondary),
                opacity: atCapacity ? 0.5 : 1,
                cursor: atCapacity ? 'not-allowed' : 'pointer',
              }}
            >
              {atCapacity
                ? `Limit reached (${MAX_FAMILY_MEMBERS})`
                : members.length === 0 ? 'Invite mummy' : 'Invite someone else'}
            </button>
          )}
        </div>

      </div>
    </section>
  );
}
