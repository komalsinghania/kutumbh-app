'use client';

interface Props {
  daysLeft: number;
  endsAt: number | null;
  onClose: () => void;
}

// Celebratory popup shown once, the moment a user's 7-day Compare trial begins.
export default function TrialStartedModal({ daysLeft, endsAt, onClose }: Props) {
  const endLabel = endsAt
    ? new Date(endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(26,20,16,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        animation: 'trialFade 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380, borderRadius: 24, overflow: 'hidden',
          background: 'white', boxShadow: '0 24px 70px rgba(139,42,42,0.28), 0 6px 20px rgba(0,0,0,0.12)',
          animation: 'trialPop 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Hero */}
        <div style={{
          background: 'linear-gradient(145deg, #1a0d08 0%, #3a1510 45%, #1c0a0a 100%)',
          padding: '30px 24px 26px', position: 'relative', overflow: 'hidden', textAlign: 'center',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(193,62,42,0.35) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ fontSize: '2.6rem', lineHeight: 1, marginBottom: 12, position: 'relative' }}>🎁</div>
          <h3 style={{
            fontFamily: 'var(--font-fraunces, Fraunces, serif)',
            fontSize: '1.4rem', fontWeight: 800, color: 'white', lineHeight: 1.25, position: 'relative',
          }}>
            Your <em style={{ color: '#ffb8a0' }}>7-day free trial</em> has started!
          </h3>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px 26px' }}>
          <p style={{ fontSize: '0.9rem', color: '#4a4038', lineHeight: 1.6, textAlign: 'center', marginBottom: 16 }}>
            Compare up to 3 prospects side by side — kundli score, compatibility, and every flag that matters — free for the next{' '}
            <strong style={{ color: '#c13e2a' }}>{daysLeft} day{daysLeft === 1 ? '' : 's'}</strong>.
          </p>

          {endLabel && (
            <div style={{
              background: 'rgba(193,62,42,0.07)', border: '1px solid rgba(193,62,42,0.22)',
              borderRadius: 12, padding: '10px 14px', marginBottom: 20, textAlign: 'center',
            }}>
              <span style={{ fontSize: '0.78rem', color: '#6b5e4d' }}>
                Trial ends on <strong style={{ color: '#1a1410' }}>{endLabel}</strong>
              </span>
            </div>
          )}

          <button
            onClick={onClose}
            style={{
              width: '100%', border: 'none', cursor: 'pointer',
              padding: '14px 20px', borderRadius: 14,
              background: 'linear-gradient(135deg, #d44d36 0%, #b83521 100%)',
              color: 'white', fontWeight: 700, fontSize: '0.95rem',
              boxShadow: '0 6px 20px rgba(193,62,42,0.35)',
            }}
          >
            Start Comparing
          </button>
        </div>
      </div>

      <style>{`
        @keyframes trialFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes trialPop { from { opacity: 0; transform: scale(0.92) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}
