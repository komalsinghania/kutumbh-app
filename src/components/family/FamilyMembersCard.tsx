'use client';
// ─────────────────────────────────────────────────────────────────────────────
// "Family access" — the owner's control panel, in the Profile tab.
//
// Invites go out over WhatsApp, not email: there is no mail infrastructure in
// this app, and WhatsApp is where this conversation actually happens anyway.
// The link is single-use, expires in a week, and can be revoked from here.
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

function joinUrl(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/family/join?code=${code}`;
}

function inviteMessage(ownerName: string, relation: string, url: string): string {
  return `${ownerName} ne aapko RokaMaybe pe add kiya hai — yahan aap unke shortlist ke rishte dekh sakte hain aur apna verdict de sakte hain.\n\n${url}\n\n(Yeh link 7 din tak chalega.)`;
}

function timeAgo(ts?: number): string {
  if (!ts) return 'never';
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  return `${Math.floor(d / 30)} mo ago`;
}

const CARD: React.CSSProperties = {
  background: 'white', borderRadius: 16, border: '1px solid #ede4d4',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
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
    <div style={{ ...CARD, padding: '18px 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <p style={{
          fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: '#c13e2a', margin: 0,
        }}>
          Mummy Mode
        </p>
        {members.length > 0 && (
          <span style={{ fontSize: '0.7rem', color: '#9b8e7e' }}>
            {sharedCount === 0
              ? 'No rishta shared yet'
              : `${sharedCount} rishta${sharedCount === 1 ? '' : 's'} shared`}
          </span>
        )}
      </div>

      {members.length === 0 && invites.length === 0 && !fresh ? (
        /* ── Empty state ── */
        <div style={{ marginTop: 12 }}>
          <p style={{
            fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.1rem',
            fontWeight: 700, color: '#1a1410', margin: 0,
          }}>
            Mummy poochti rehti hai?
          </p>
          <p style={{ fontSize: '0.85rem', color: '#6b5e4d', lineHeight: 1.6, margin: '6px 0 0' }}>
            Give her a login of her own. She sees the rishtas you choose — biodata, photos,
            kundli score, family details — and can leave her verdict. Your notes, flags,
            call logs and ratings stay yours.
          </p>
        </div>
      ) : (
        /* ── Member list ── */
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#f9f6f0', borderRadius: 12, padding: '12px 14px',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(193,62,42,0.1)', color: '#c13e2a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.85rem',
              }}>
                {m.viewerName.trim()[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1410', margin: 0 }}>
                  {m.relationLabel}
                  <span style={{ fontWeight: 400, color: '#6b5e4d' }}> · {m.viewerName}</span>
                </p>
                <p style={{ fontSize: '0.72rem', color: '#9b8e7e', margin: '2px 0 0' }}>
                  Last opened {timeAgo(m.lastSeenAt)}
                </p>
              </div>
              <button
                onClick={() => drop(m)}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer', padding: '6px 4px',
                  fontSize: '0.75rem', fontWeight: 600, color: '#8B2A2A',
                }}
              >
                Remove
              </button>
            </div>
          ))}

          {invites.map(i => (
            <div key={i.code} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(184,137,43,0.07)', border: '1px dashed rgba(184,137,43,0.4)',
              borderRadius: 12, padding: '12px 14px',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1a1410', margin: 0 }}>
                  {i.relationLabel} · invite sent
                </p>
                <p style={{ fontSize: '0.72rem', color: '#9b8e7e', margin: '2px 0 0' }}>
                  Waiting for them to open the link
                </p>
              </div>
              <button
                onClick={() => shareOnWhatsApp(i.code, i.relationLabel)}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer', padding: '6px 4px',
                  fontSize: '0.75rem', fontWeight: 700, color: '#2D6B4F',
                }}
              >
                Resend
              </button>
              <button
                onClick={() => cancelInvite(i.code)}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer', padding: '6px 4px',
                  fontSize: '0.75rem', fontWeight: 600, color: '#8B2A2A',
                }}
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Freshly created invite: send it ── */}
      {fresh && (
        <div style={{
          marginTop: 14, background: 'rgba(45,107,79,0.06)',
          border: '1px solid rgba(45,107,79,0.22)', borderRadius: 14, padding: '16px 16px 18px',
        }}>
          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1410', margin: 0 }}>
            Invite ready for {fresh.relation}
          </p>
          <p style={{ fontSize: '0.78rem', color: '#6b5e4d', margin: '4px 0 12px', lineHeight: 1.5 }}>
            Send it to her. The link works once and expires in 7 days.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => shareOnWhatsApp(fresh.code, fresh.relation)}
              style={{
                flex: 1, padding: '13px 16px', borderRadius: 12, border: 'none',
                cursor: 'pointer', color: 'white', fontSize: '0.88rem', fontWeight: 700,
                background: '#25D366', boxShadow: '0 4px 14px rgba(37,211,102,0.3)',
              }}
            >
              Send on WhatsApp
            </button>
            <button
              onClick={() => copyLink(fresh.code)}
              style={{
                padding: '13px 16px', borderRadius: 12, cursor: 'pointer',
                border: '1.5px solid #d6c9b0', background: 'white',
                fontSize: '0.88rem', fontWeight: 700, color: '#1a1410',
              }}
            >
              Copy link
            </button>
          </div>
        </div>
      )}

      {/* ── Relation picker ── */}
      {picking ? (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b5e4d', margin: '0 0 10px' }}>
            Who are you inviting?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {RELATION_LABELS.map(r => (
              <button
                key={r}
                disabled={creating}
                onClick={() => makeInvite(r)}
                style={{
                  padding: '10px 16px', borderRadius: 999, cursor: creating ? 'wait' : 'pointer',
                  border: '1.5px solid #e2d5bf', background: 'white',
                  fontSize: '0.85rem', fontWeight: 600, color: '#1a1410',
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPicking(false)}
            style={{
              marginTop: 12, border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '0.8rem', color: '#9b8e7e', padding: 0,
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setPicking(true)}
          disabled={atCapacity}
          style={{
            width: '100%', marginTop: 16, padding: '14px 20px', borderRadius: 13,
            border: 'none', cursor: atCapacity ? 'not-allowed' : 'pointer',
            color: 'white', fontSize: '0.9rem', fontWeight: 700,
            background: atCapacity ? '#c9bda9' : 'linear-gradient(135deg, #d44d36, #b83521)',
            boxShadow: atCapacity ? 'none' : '0 5px 18px rgba(193,62,42,0.28)',
          }}
        >
          {atCapacity
            ? `Limit reached (${MAX_FAMILY_MEMBERS})`
            : members.length === 0 ? 'Invite mummy' : 'Invite someone else'}
        </button>
      )}
    </div>
  );
}
