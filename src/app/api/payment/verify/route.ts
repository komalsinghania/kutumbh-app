import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { verifyFirebaseIdToken } from '@/lib/verify-firebase-token';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;

/** Write payment fields to Firestore via REST API using the user's own ID token.
 *  This avoids needing firebase-admin / a service account on the server. */
async function markUserPaid(
  uid: string,
  idToken: string,
  fields: { razorpayOrderId: string; razorpayPaymentId: string },
) {
  const now = Date.now();
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}` +
    `?updateMask.fieldPaths=isPaid&updateMask.fieldPaths=paidAt` +
    `&updateMask.fieldPaths=razorpayOrderId&updateMask.fieldPaths=razorpayPaymentId` +
    `&updateMask.fieldPaths=updatedAt`;

  const body = {
    fields: {
      isPaid:            { booleanValue: true },
      paidAt:            { integerValue: String(now) },
      razorpayOrderId:   { stringValue: fields.razorpayOrderId },
      razorpayPaymentId: { stringValue: fields.razorpayPaymentId },
      updatedAt:         { integerValue: String(now) },
    },
  };

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore PATCH failed: ${res.status} ${err}`);
  }
}

export async function POST(req: NextRequest) {
  // Authenticate the caller
  const authHeader = req.headers.get('authorization');
  const uid = await verifyFirebaseIdToken(authHeader);
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Extract the raw token for the Firestore REST call
  const idToken = (authHeader ?? '').replace(/^Bearer\s+/i, '');

  const body = await req.json();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 });
  }

  // Verify signature: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
  const expectedSignature = createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
  }

  // Mark user as paid via Firestore REST API (uses user's own ID token — no admin SDK needed)
  await markUserPaid(uid, idToken, {
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
  });

  return NextResponse.json({ success: true });
}

