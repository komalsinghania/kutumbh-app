import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/verify-firebase-token';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

// Amount in paise (₹499 = 49900 paise)
const AMOUNT_PAISE = 49900;
const CURRENCY = 'INR';

export async function POST(req: NextRequest) {
  // Authenticate the caller
  const authHeader = req.headers.get('authorization');
  const uid = await verifyFirebaseIdToken(authHeader);
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Create a Razorpay order via their REST API (no SDK needed)
  const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      amount: AMOUNT_PAISE,
      currency: CURRENCY,
      receipt: `rcpt_${uid.slice(0, 16)}_${Date.now()}`,
      notes: { uid, product: 'rokamaybe_compare' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[create-order] Razorpay error:', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 502 });
  }

  const order = await response.json();
  return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency });
}
