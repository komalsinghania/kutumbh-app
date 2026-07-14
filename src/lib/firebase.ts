// ─────────────────────────────────────────────────────────────────────────────
// Firebase client SDK initialisation.
//
// Exports the shared `auth` and `db` singletons used throughout the app.
// Uses the "initialize-once" guard (`getApps().length === 0`) so hot-reloads
// in development (and duplicate imports) never create a second Firebase app.
//
// All config values come from NEXT_PUBLIC_* env vars so they are safe to ship
// in client bundles — they are not secret (Firebase security is enforced by
// Firestore Security Rules and server-side token verification).
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ── Client-side Firebase configuration ───────────────────────────────────────
// Values are injected at build time from environment variables.
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

// Re-use the existing app instance if one was already initialized (e.g. on HMR).
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Shared auth and Firestore instances — import these instead of calling
// getAuth()/getFirestore() directly to keep the singleton guarantee.
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
