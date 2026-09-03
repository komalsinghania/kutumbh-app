'use client';
// ─────────────────────────────────────────────────────────────────────────────
// "Share with family" — the per-rishta control.
//
// Sharing is per-rishta by design, never all-or-nothing: the family sees the
// shortlist you choose to show them and nothing else exists as far as they know.
//
// The sheet leans hard on showing rather than promising. "Preview mummy's view"
// renders the real component the family gets, built from the real snapshot
// function — so the privacy claim is demonstrable, not just a reassuring line
// of copy.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { Prospect } from '@/types';
import type { FamilyLink, SharedProspect } from '@/types/family';
import {
  buildShareSnapshot, shareProspect, unshareProspect, getShare, shareId,
} from '@/lib/family-share';
import { updateProspect } from '@/lib/firestore';
import { track } from '@/lib/analytics';
import SharedRishtaView from './SharedRishtaView';

const NEVER_SHARED = [
  'Your red & green flags',
  'Your call logs and how you felt',
  'Your meeting ratings',
  'Your family scorecard',
  'Your private notes',
  'The Compare matrix',
];

export default function ShareSheet({
  uid, ownerName, prospect, members, onClose, onInviteFirst, onSharedChange,
}: {
  uid: string;
  ownerName: string;
  prospect: Prospect;
  members: FamilyLink[];
  onClose: () => void;
  onInviteFirst: () => void;
  /** The parent holds the prospect in local state, so it has to be told when
   *  sharing is switched on or off — otherwise its header chip and its own
   *  family-sync check both go stale until the page is reloaded. */
  onSharedChange: (isShared: boolean) => void;
}) {
  const [share, setShare] = useState<SharedProspect | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [includeBirth, setIncludeBirth] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    getShare(shareId(uid, prospect.id))
      .then(s => { setShare(s); setIncludeBirth(!!s?.includeBirthDetails); })
      .catch(err => console.error('[ShareSheet] getShare failed', err))
      .finally(() => setLoading(false));
  }, [uid, prospect.id]);

  const isShared = !!share;
  const hasBirthData = !!(prospect.dobDate || prospect.dobTime || prospect.dobPlace);

  const applyShare = async (birth: boolean) => {
    setBusy(true);
    try {
      await shareProspect(uid, ownerName, prospect, { includeBirthDetails: birth });
      await updateProspect(uid, prospect.id, { isShared: true });
      setShare(await getShare(shareId(uid, prospect.id)));
      onSharedChange(true);
      track('family_share_toggled', { shared: true, birth_details: birth });
      toast.success(`${prospect.name} is now visible to your family.`);
    } catch (err) {
      console.error('[ShareSheet] share failed', err);
      toast.error('Could not share. Please try again.');
    } finally { setBusy(false); }
  };

  const stopSharing = async () => {
    setBusy(true);
    try {
      await unshareProspect(uid, prospect.id);
      await updateProspect(uid, prospect.id, { isShared: false });
      setShare(null);
      onSharedChange(false);
      track('family_share_toggled', { shared: false });
      toast.success('Removed from your family\'s view.');
    } catch (err) {
      console.error('[ShareSheet] unshare failed', err);
      toast.error('Could not stop sharing. Please try again.');
    } finally { setBusy(false); }
  };

  const toggleBirth = async () => {
    const next = !includeBirth;
    setIncludeBirth(next);
    if (isShared) await applyShare(next);
  };

  // Built from the same function that writes the real document, so what the
  // owner previews is exactly what gets stored and shown.
  const previewShare: SharedProspect = {
    id: shareId(uid, prospect.id),
    ...buildShareSnapshot(uid, ownerName, prospect, { includeBirthDetails: includeBirth }, share),
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(26,20,16,0.55)',
        backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-end',
        justifyContent: 'center', animation: 'famFade 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto',
          background: '#f5ede0', borderRadius: '24px 24px 0 0',
          boxShadow: '0 -10px 50px rgba(0,0,0,0.3)',
          animation: 'famRise 0.28s cubic-bezier(0.22,1,0.36,1)',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
        }}
      >
        {/* Grab handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#d6c9b0' }} />
        </div>

        <div style={{ padding: '8px 20px 0' }}>
          <h2 style={{
            fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.35rem',
            fontWeight: 700, color: '#1a1410', margin: 0,
          }}>
            {preview ? "Mummy's view" : 'Share with family'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6b5e4d', margin: '5px 0 0' }}>
            {preview
              ? `This is exactly what they see of ${prospect.name}. Nothing else.`
              : prospect.name}
          </p>
        </div>

        {preview ? (
          <div style={{ padding: '16px 20px 20px' }}>
            <SharedRishtaView share={previewShare} photos={prospect.photos ?? []} lang="hi" narrow />
            <button
              onClick={() => setPreview(false)}
              style={{
                width: '100%', marginTop: 18, padding: '15px 20px', borderRadius: 14,
                border: '1.5px solid #d6c9b0', background: 'white', cursor: 'pointer',
                fontSize: '0.95rem', fontWeight: 700, color: '#1a1410',
              }}
            >
              Back to sharing options
            </button>
          </div>
        ) : loading ? (
          <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
            <div className="gold-spinner" style={{ width: 26, height: 26 }} />
          </div>
        ) : members.length === 0 ? (
          /* ── First run: nobody to share with yet ── */
          <div style={{ padding: '20px' }}>
            <div style={{
              background: 'white', borderRadius: 18, border: '1px solid #e8dece',
              padding: '22px 20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '2.2rem', lineHeight: 1 }}>👩🏽</div>
              <p style={{
                fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '1.15rem',
                fontWeight: 700, color: '#1a1410', margin: '12px 0 6px',
              }}>
                Add your mummy first
              </p>
              <p style={{ fontSize: '0.88rem', color: '#6b5e4d', lineHeight: 1.6, margin: 0 }}>
                She gets her own login and sees only the rishtas you choose. Your notes,
                flags and ratings stay yours.
              </p>
              <button
                onClick={onInviteFirst}
                style={{
                  width: '100%', marginTop: 18, padding: '15px 20px', borderRadius: 14,
                  border: 'none', cursor: 'pointer', color: 'white', fontSize: '0.95rem', fontWeight: 700,
                  background: 'linear-gradient(135deg, #d44d36, #b83521)',
                  boxShadow: '0 6px 20px rgba(193,62,42,0.32)',
                }}
              >
                Invite family
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Main toggle */}
            <button
              onClick={() => (isShared ? stopSharing() : applyShare(includeBirth))}
              disabled={busy}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                background: 'white', borderRadius: 18, padding: '18px 18px',
                border: `1.5px solid ${isShared ? 'rgba(45,107,79,0.4)' : '#e8dece'}`,
                cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{
                width: 52, height: 30, borderRadius: 15, flexShrink: 0, position: 'relative',
                background: isShared ? '#2D6B4F' : '#d6c9b0', transition: 'background 0.2s',
              }}>
                <div style={{
                  position: 'absolute', top: 3, left: isShared ? 25 : 3,
                  width: 24, height: 24, borderRadius: '50%', background: 'white',
                  transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                }} />
              </div>
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1410', margin: 0 }}>
                  Visible to family
                </p>
                <p style={{ fontSize: '0.82rem', color: '#6b5e4d', margin: '3px 0 0' }}>
                  {isShared
                    ? `${members.map(m => m.relationLabel).join(', ')} can see this rishta`
                    : 'Nobody can see this rishta yet'}
                </p>
              </div>
            </button>

            {/* Birth details opt-in */}
            {hasBirthData && (
              <button
                onClick={toggleBirth}
                disabled={busy}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                  background: 'white', borderRadius: 18, padding: '16px 18px',
                  border: '1px solid #e8dece', cursor: busy ? 'wait' : 'pointer',
                  opacity: busy ? 0.6 : 1, boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                  border: `2px solid ${includeBirth ? '#c13e2a' : '#d6c9b0'}`,
                  background: includeBirth ? '#c13e2a' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '0.8rem', fontWeight: 800,
                }}>
                  {includeBirth ? '✓' : ''}
                </div>
                <div>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1a1410', margin: 0 }}>
                    Include birth details
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#6b5e4d', margin: '3px 0 0' }}>
                    Date, time and place — so she can take it to pandit ji
                  </p>
                </div>
              </button>
            )}

            {/* Preview */}
            <button
              onClick={() => { setPreview(true); track('family_preview_opened'); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'white', borderRadius: 18, padding: '16px 18px',
                border: '1px solid #e8dece', cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              }}
            >
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1a1410' }}>
                👁 Preview mummy&apos;s view
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#c13e2a">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
              </svg>
            </button>

            {/* The promise, spelled out */}
            <div style={{
              background: 'rgba(45,107,79,0.06)', border: '1px solid rgba(45,107,79,0.18)',
              borderRadius: 16, padding: '16px 18px',
            }}>
              <p style={{
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: '#2D6B4F', margin: '0 0 10px',
              }}>
                Never shared, with anyone
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {NEVER_SHARED.map(item => (
                  <li key={item} style={{ fontSize: '0.84rem', color: '#4a4038', display: 'flex', gap: 8 }}>
                    <span style={{ color: '#2D6B4F', fontWeight: 700 }}>✕</span>{item}
                  </li>
                ))}
              </ul>
            </div>

            <p style={{ fontSize: '0.72rem', color: '#9b8e7e', lineHeight: 1.6, margin: 0, textAlign: 'center' }}>
              These are someone else&apos;s personal details. Share them only with family who
              genuinely need to see them.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes famFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes famRise { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
