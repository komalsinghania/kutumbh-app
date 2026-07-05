'use client';
import RazorpayButton from './RazorpayButton';

interface Props {
  isPaid?: boolean;
  paidAt?: number;
  razorpayPaymentId?: string;
  onUpgradeSuccess?: () => void;
}

const FREE_FEATURES = [
  'Track up to 3 prospects',
  'All 5 stages of the journey',
  'AI biodata extraction',
  'Full Kundli Milan (Ashtakoot · 36 guna)',
  'Call logs · Red & green flags',
  'Family scorecard & meeting planner',
];

const PAID_FEATURES = [
  'Everything in Maybe — free forever',
  'Unlimited prospects (no 3-prospect cap)',
  'Compare up to 3 prospects side by side',
  'Compatibility · Kundli · Flags · all in one view',
  'One-time payment · valid till your roka',
  'No subscription · no auto-renewal',
];

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function PlanCard({ isPaid, paidAt, razorpayPaymentId, onUpgradeSuccess }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Plan header badge ── */}
      <div style={{
        borderRadius: 20, overflow: 'hidden',
        border: isPaid ? '1.5px solid rgba(45,107,79,0.35)' : '1.5px solid rgba(193,62,42,0.2)',
        boxShadow: isPaid ? '0 4px 24px rgba(45,107,79,0.1)' : '0 4px 24px rgba(193,62,42,0.08)',
        background: 'white',
      }}>
        {/* Gradient header */}
        <div style={{
          background: isPaid
            ? 'linear-gradient(135deg, #1c3a2a 0%, #2D6B4F 100%)'
            : 'linear-gradient(135deg, #1c1108 0%, #3a2010 100%)',
          padding: '20px 22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              {/* Plan name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)',
                  fontSize: '1.4rem', fontWeight: 800,
                  color: isPaid ? '#a8f0c8' : '#f5ede0',
                }}>
                  {isPaid ? 'Roka Ready' : 'Maybe'}
                </span>
                <span style={{
                  fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em',
                  textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20,
                  background: isPaid ? 'rgba(168,240,200,0.2)' : 'rgba(245,237,224,0.12)',
                  color: isPaid ? '#a8f0c8' : 'rgba(245,237,224,0.6)',
                  border: isPaid ? '1px solid rgba(168,240,200,0.3)' : '1px solid rgba(245,237,224,0.2)',
                }}>
                  {isPaid ? 'Active' : 'Free'}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: isPaid ? 'rgba(168,240,200,0.7)' : 'rgba(245,237,224,0.5)', lineHeight: 1.4 }}>
                {isPaid ? 'For the serious search · one-time payment' : 'Start here · free forever'}
              </p>
            </div>

            {/* Price / icon */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{
                fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)',
                fontSize: '1.6rem', fontWeight: 800, lineHeight: 1,
                color: isPaid ? '#a8f0c8' : '#f5ede0',
              }}>
                {isPaid ? '₹499' : '₹0'}
              </div>
              <div style={{ fontSize: '0.6rem', color: isPaid ? 'rgba(168,240,200,0.5)' : 'rgba(245,237,224,0.35)', marginTop: 3 }}>
                {isPaid ? 'paid once' : 'free forever'}
              </div>
            </div>
          </div>

          {/* Payment receipt — paid users only */}
          {isPaid && paidAt && (
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 12,
              background: 'rgba(0,0,0,0.25)',
              display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(168,240,200,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Paid on</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a8f0c8', marginTop: 2 }}>{formatDate(paidAt)}</div>
              </div>
              {razorpayPaymentId && (
                <div>
                  <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(168,240,200,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Payment ID</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(168,240,200,0.75)', marginTop: 2, fontFamily: 'monospace' }}>{razorpayPaymentId}</div>
                </div>
              )}
              <div style={{ marginLeft: 'auto' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: '0.7rem', fontWeight: 700, color: '#a8f0c8',
                  background: 'rgba(168,240,200,0.1)', border: '1px solid rgba(168,240,200,0.25)',
                  borderRadius: 20, padding: '4px 10px',
                }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5.5" fill="rgba(61,184,122,0.3)" stroke="#3db87a"/>
                    <path d="M3.5 6l1.8 1.8L8.5 4" stroke="#3db87a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Valid till your roka
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Features list */}
        <div style={{ padding: '18px 22px 20px' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#a89e92', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
            What's included
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {(isPaid ? PAID_FEATURES : FREE_FEATURES).map((feat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  background: isPaid ? 'rgba(45,107,79,0.12)' : 'rgba(193,62,42,0.08)',
                  border: `1px solid ${isPaid ? 'rgba(45,107,79,0.3)' : 'rgba(193,62,42,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6l2.5 2.5 4.5-5" stroke={isPaid ? '#2D6B4F' : '#c13e2a'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: '0.82rem', color: '#3a2e24', lineHeight: 1.45 }}>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Upgrade CTA — free users only ── */}
      {!isPaid && (
        <div style={{
          background: 'white', borderRadius: 18,
          border: '1.5px solid rgba(193,62,42,0.2)',
          boxShadow: '0 4px 20px rgba(193,62,42,0.08)',
          padding: '20px 22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(193,62,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" stroke="#c13e2a" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1a1410' }}>Upgrade to Roka Ready</div>
              <div style={{ fontSize: '0.72rem', color: '#a89e92', marginTop: 2 }}>One payment · no subscription · no auto-renewal</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)', fontSize: '1.5rem', fontWeight: 800, color: '#c13e2a', lineHeight: 1 }}>₹499</div>
              <div style={{ fontSize: '0.6rem', color: '#a89e92' }}>once</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, padding: '10px 14px', borderRadius: 12, background: 'rgba(193,62,42,0.04)', border: '1px solid rgba(193,62,42,0.12)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#c13e2a" strokeWidth="1.6"/><path d="M3 10h18M8 15h2M13 15h3" stroke="#c13e2a" strokeWidth="1.4" strokeLinecap="round"/></svg>
            <span style={{ fontSize: '0.78rem', color: '#6b5e4d' }}>Compare prospects side by side · see the full picture before your <em>roka</em></span>
          </div>
          <RazorpayButton
            onSuccess={onUpgradeSuccess}
            label="Unlock Roka Ready — ₹499"
            style={{ width: '100%', borderRadius: 14, padding: '14px 20px', fontSize: '0.9rem' }}
          />
        </div>
      )}
    </div>
  );
}
