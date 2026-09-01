// Verify the Mummy Mode security rules against the Firebase emulators.
//
//   1. Install a JRE (the Firestore emulator is a Java process).
//   2. npx firebase emulators:start --only auth,firestore
//   3. node scripts/verify-family-rules.mjs
//
// Every assertion runs through the real client SDK with real auth tokens, so
// firestore.rules is evaluated exactly as it is for the app. No new dependency:
// this uses the "firebase" package the app already ships with, and it never
// touches the real project — only the local emulator.
//
// The negative cases are the point. They encode the promise the /mummy-mode
// page makes: the family can never reach the owner's notes, flags, call logs,
// meeting ratings or family scorecard, and a removed member cannot restore
// their own access.

import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, getDoc,
  deleteDoc, collection, getDocs, query, where, collectionGroup,
} from 'firebase/firestore';

const PROJECT = 'kutumbh-milaan';
let pass = 0, fail = 0;

function ok(name) { pass++; console.log('  PASS  ' + name); }
function bad(name, extra) { fail++; console.log('  FAIL  ' + name + (extra ? ' -- ' + extra : '')); }

/** Assert an operation succeeds. */
async function allowed(name, fn) {
  try { await fn(); ok(name); } catch (e) { bad(name, 'expected allowed, got ' + (e.code || e.message)); }
}
/** Assert an operation is rejected by the rules. */
async function denied(name, fn) {
  try { await fn(); bad(name, 'expected DENIED, but it succeeded'); }
  catch (e) {
    const msg = String(e.code || e.message);
    if (msg.includes('permission-denied')) ok(name);
    else bad(name, 'expected permission-denied, got ' + msg);
  }
}

function client(tag) {
  const app = initializeApp({ apiKey: 'emulator-key', projectId: PROJECT }, tag);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { app, auth, db };
}

async function account(c, email) {
  try { return (await createUserWithEmailAndPassword(c.auth, email, 'test1234')).user; }
  catch { return (await signInWithEmailAndPassword(c.auth, email, 'test1234')).user; }
}

const stamp = Date.now();
const owner = client('owner-' + stamp);
const mummy = client('mummy-' + stamp);
const stranger = client('stranger-' + stamp);

const O = await account(owner, 'owner' + stamp + '@test.local');
const M = await account(mummy, 'mummy' + stamp + '@test.local');
const S = await account(stranger, 'stranger' + stamp + '@test.local');

const PROSPECT = 'pros1';
const SHARE = O.uid + '__' + PROSPECT;
const LINK = O.uid + '__' + M.uid;
const CODE = 'code' + stamp;

console.log('\n-- Owner sets up ---------------------------------------------');
await allowed('owner writes their own profile', () =>
  setDoc(doc(owner.db, 'users', O.uid), { uid: O.uid, name: 'Komal', createdAt: Date.now() }));
await allowed('owner writes their own prospect (with private fields)', () =>
  setDoc(doc(owner.db, 'users', O.uid, 'prospects', PROSPECT), {
    name: 'Rohan Agarwal', age: 29, phone: '9990001111',
    firstImpression: 'seemed nervous', redFlagCount: 2, familyScore: 3.4,
    gunaScore: 26, stage: 'call_done', updatedAt: Date.now(),
  }));
await allowed('owner creates an invite', () =>
  setDoc(doc(owner.db, 'familyInvites', CODE), {
    ownerUid: O.uid, ownerName: 'Komal', relationLabel: 'Mummy',
    status: 'pending', createdAt: Date.now(), expiresAt: Date.now() + 6e8,
  }));

console.log('\n-- Mummy accepts the invitation -------------------------------');
await allowed('mummy reads the invite by code', () => getDoc(doc(mummy.db, 'familyInvites', CODE)));
await denied('mummy CANNOT list all invites', () => getDocs(collection(mummy.db, 'familyInvites')));
await denied('mummy cannot claim the invite in another name', () =>
  updateDoc(doc(mummy.db, 'familyInvites', CODE), { status: 'claimed', claimedByUid: S.uid, claimedAt: Date.now() }));
await allowed('mummy claims the invite as herself', () =>
  updateDoc(doc(mummy.db, 'familyInvites', CODE), {
    status: 'claimed', claimedByUid: M.uid, claimedByName: 'Sunita', claimedAt: Date.now(),
  }));
await denied('stranger cannot forge a link off mummy claim', () =>
  setDoc(doc(stranger.db, 'familyLinks', O.uid + '__' + S.uid), {
    ownerUid: O.uid, ownerName: 'Komal', viewerUid: S.uid, viewerName: 'X',
    relationLabel: 'Mummy', inviteCode: CODE, createdAt: Date.now(),
  }));
await allowed('mummy creates her link', () =>
  setDoc(doc(mummy.db, 'familyLinks', LINK), {
    ownerUid: O.uid, ownerName: 'Komal', viewerUid: M.uid, viewerName: 'Sunita',
    relationLabel: 'Mummy', inviteCode: CODE, createdAt: Date.now(), lastSeenAt: Date.now(),
  }));

console.log('\n-- THE PROMISE: private material stays private ----------------');
await denied('mummy CANNOT read the real prospect doc', () =>
  getDoc(doc(mummy.db, 'users', O.uid, 'prospects', PROSPECT)));
await denied('mummy CANNOT list the owner prospects', () =>
  getDocs(collection(mummy.db, 'users', O.uid, 'prospects')));
await denied('mummy CANNOT read the owner profile', () =>
  getDoc(doc(mummy.db, 'users', O.uid)));
await denied('mummy CANNOT read the owner flags', () =>
  getDocs(collection(mummy.db, 'users', O.uid, 'prospects', PROSPECT, 'flags')));
await denied('mummy CANNOT read the owner activity log', () =>
  getDocs(collection(mummy.db, 'users', O.uid, 'activityLog')));

console.log('\n-- Sharing one rishta ----------------------------------------');
await allowed('owner writes the sanitised mirror', () =>
  setDoc(doc(owner.db, 'sharedProspects', SHARE), {
    ownerUid: O.uid, ownerName: 'Komal', prospectId: PROSPECT,
    name: 'Rohan Agarwal', age: 29, gunaScore: 26, stage: 'call_done',
    stageLabel: 'Call Done', photoCount: 1, sharedAt: Date.now(),
    syncedAt: Date.now(), sourceUpdatedAt: Date.now(),
  }));
await allowed('owner writes the photos doc', () =>
  setDoc(doc(owner.db, 'sharedProspects', SHARE, 'media', 'photos'), { photos: ['data:image/jpeg;base64,xx'] }));
await denied('mummy cannot write to the mirror', () =>
  updateDoc(doc(mummy.db, 'sharedProspects', SHARE), { name: 'Tampered' }));
await denied('owner cannot write a mirror claiming another owner', () =>
  setDoc(doc(owner.db, 'sharedProspects', S.uid + '__x'), { ownerUid: S.uid, name: 'X' }));

await allowed('mummy reads the shared rishta', () => getDoc(doc(mummy.db, 'sharedProspects', SHARE)));
await allowed('mummy lists the shortlist', () =>
  getDocs(query(collection(mummy.db, 'sharedProspects'), where('ownerUid', '==', O.uid))));
await allowed('mummy reads the photos', () =>
  getDoc(doc(mummy.db, 'sharedProspects', SHARE, 'media', 'photos')));
await denied('STRANGER cannot read the shared rishta', () =>
  getDoc(doc(stranger.db, 'sharedProspects', SHARE)));
await denied('STRANGER cannot list the shortlist', () =>
  getDocs(query(collection(stranger.db, 'sharedProspects'), where('ownerUid', '==', O.uid))));

console.log('\n-- Verdicts --------------------------------------------------');
await denied('mummy cannot write a verdict as someone else', () =>
  setDoc(doc(mummy.db, 'sharedProspects', SHARE, 'verdicts', S.uid), {
    ownerUid: O.uid, viewerUid: S.uid, verdict: 'yes', updatedAt: Date.now(),
  }));
await denied('mummy cannot write an invalid verdict value', () =>
  setDoc(doc(mummy.db, 'sharedProspects', SHARE, 'verdicts', M.uid), {
    ownerUid: O.uid, viewerUid: M.uid, verdict: 'maybe', updatedAt: Date.now(),
  }));
await allowed('mummy writes her own verdict', () =>
  setDoc(doc(mummy.db, 'sharedProspects', SHARE, 'verdicts', M.uid), {
    ownerUid: O.uid, prospectId: PROSPECT, viewerUid: M.uid, viewerName: 'Sunita',
    relationLabel: 'Mummy', verdict: 'yes', comment: 'Achha ladka hai',
    createdAt: Date.now(), updatedAt: Date.now(),
  }));
await allowed('owner reads every verdict via collection group', async () => {
  const snap = await getDocs(query(collectionGroup(owner.db, 'verdicts'), where('ownerUid', '==', O.uid)));
  if (snap.size !== 1) throw new Error('expected 1 verdict, got ' + snap.size);
});
await denied('stranger cannot collection-group read the verdicts', () =>
  getDocs(query(collectionGroup(stranger.db, 'verdicts'), where('ownerUid', '==', O.uid))));

console.log('\n-- Revocation ------------------------------------------------');
await allowed('owner removes the member (link + invite)', async () => {
  await deleteDoc(doc(owner.db, 'familyLinks', LINK));
  await deleteDoc(doc(owner.db, 'familyInvites', CODE));
});
await denied('removed mummy can no longer read the rishta', () =>
  getDoc(doc(mummy.db, 'sharedProspects', SHARE)));
await denied('removed mummy can no longer write a verdict', () =>
  setDoc(doc(mummy.db, 'sharedProspects', SHARE, 'verdicts', M.uid), {
    ownerUid: O.uid, viewerUid: M.uid, verdict: 'no', updatedAt: Date.now(),
  }));
await denied('removed mummy cannot re-create her link with the old invite', () =>
  setDoc(doc(mummy.db, 'familyLinks', LINK), {
    ownerUid: O.uid, ownerName: 'Komal', viewerUid: M.uid, viewerName: 'Sunita',
    relationLabel: 'Mummy', inviteCode: CODE, createdAt: Date.now(),
  }));

console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
await Promise.all([deleteApp(owner.app), deleteApp(mummy.app), deleteApp(stranger.app)]);
process.exit(fail === 0 ? 0 : 1);
