'use client';
// ─────────────────────────────────────────────────────────────────────────────
// RazorpayButton — one-time payment button for the Compare feature unlock.
//
// Payment flow (5 steps):
//   1. Fetch a Firebase ID token from the current user.
//   2. Lazy-load the Razorpay checkout.js SDK (avoids adding it to the
//      initial bundle — it's only needed when the user clicks Pay).
//   3. POST to /api/payment/create-order → receives a Razorpay order_id.
//   4. Open the Razorpay checkout modal (UPI, cards, netbanking, etc.).
//   5. On success, POST the payment response to /api/payment/verify, which
//      validates the HMAC signature and marks the user as paid in Firestore.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/firebase';
import toast from 'react-hot-toast';

/** Lazily inject the Razorpay checkout script; resolves true when ready. */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface Props {
  onSuccess?: () => void;
  label?: string;
  style?: React.CSSProperties;
}

export default function RazorpayButton({ onSuccess, label = 'Unlock Compare — ₹499', style }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!user) { toast.error('Please sign in first.'); return; }
    setLoading(true);
    try {
      // 1. Get Firebase ID token for authenticated API calls
      const idToken = await auth.currentUser!.getIdToken();

      // 2. Load Razorpay SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error('Could not load payment gateway. Check your connection.'); return; }

      // 3. Create an order on the server
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!orderRes.ok) { toast.error('Could not initiate payment. Please try again.'); return; }
      const { orderId, amount, currency } = await orderRes.json();

      // 4. Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: 'RokaMaybe',
        description: 'Compare feature — one-time, valid till your roka',
        image: '/favicon.ico',
        order_id: orderId,
        prefill: {
          name: profile?.name ?? '',
          email: user.email ?? '',
        },
        theme: { color: '#c13e2a' },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          // 5. Verify signature on server and update Firestore
          const verifyRes = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify(response),
          });
          if (verifyRes.ok) {
            await refreshProfile();
            toast.success('Payment successful! Compare is now unlocked 🎉');
            onSuccess?.();
          } else {
            toast.error('Payment verification failed. Contact support with your payment ID: ' + response.razorpay_payment_id);
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (err: any) => {
        toast.error('Payment failed: ' + (err?.error?.description ?? 'Unknown error'));
        setLoading(false);
      });
      rzp.open();
    } catch (e) {
      console.error('[RazorpayButton]', e);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '14px 28px', borderRadius: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        background: loading ? '#d6c9b0' : 'linear-gradient(135deg, #c13e2a 0%, #8B2A2A 100%)',
        color: 'white', fontWeight: 700, fontSize: '0.95rem',
        boxShadow: loading ? 'none' : '0 6px 20px rgba(193,62,42,0.35)',
        transition: 'all 0.2s',
        ...style,
      }}
    >
      {loading ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 010 20" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Processing…
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="1.8"/>
            <path d="M2 10h20" stroke="white" strokeWidth="1.8"/>
          </svg>
          {label}
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
