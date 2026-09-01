import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('[firebase] Missing env vars — apiKey:', !!firebaseConfig.apiKey, '| authDomain:', !!firebaseConfig.authDomain, '| projectId:', !!firebaseConfig.projectId);
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

// ── Local emulator mode ──────────────────────────────────────────────────────
//
// Set NEXT_PUBLIC_FIREBASE_EMULATOR=1 in .env.local and run
// `firebase emulators:start` to point the app at a throwaway local Firestore
// and Auth instead of the real project. The Firestore emulator loads
// firestore.rules from firebase.json, so this is the only way to exercise the
// security rules — including Mummy Mode's cross-user access — without touching
// production data.
//
// Hosts are written as localhost rather than 127.0.0.1 so the app CSP
// (connect-src ... http://localhost:*) permits the connection.
//
// Guarded so it can never fire in a production build: NEXT_PUBLIC_* values are
// inlined at build time, and the flag is absent from every deployed env.
if (process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === '1' && typeof window !== 'undefined') {
  console.warn('[firebase] EMULATOR MODE — auth localhost:9099, firestore localhost:8080. No production data is being touched.');
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export default app;
