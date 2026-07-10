import {
  doc, getDoc, setDoc, updateDoc, collection, addDoc,
  deleteDoc, onSnapshot, query, orderBy, limit, increment,
  getDocs, writeBatch, type DocumentReference,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  UserProfile, Prospect, Note,
  ConversationLog, Flag, FamilyScorecard, FamilyScorecardKey,
  MeetingData, ActivityEntry, ActivityType, migrateStage,
} from '@/types';
import { calculateGunaScore, calculateCompatScore } from './scoring';

// Firestore rejects undefined values — strip them before any write
function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

// Normalise a prospect read from Firestore: remap any retired stage value to a
// surviving one so the UI never receives an unknown stage.
function normalizeProspect(p: Prospect): Prospect {
  return { ...p, stage: migrateStage(p.stage) };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function saveUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const ref = doc(db, 'users', uid);
  try {
    const snap = await getDoc(ref);
    const payload = stripUndefined({ ...data, updatedAt: Date.now() });
    if (snap.exists()) {
      console.log('[firestore] updateDoc users/', uid, '| fields:', Object.keys(payload).join(', '));
      await updateDoc(ref, payload);
    } else {
      const createPayload = stripUndefined({ ...payload, uid, createdAt: Date.now() });
      console.log('[firestore] setDoc users/', uid, '| fields:', Object.keys(createPayload).join(', '));
      await setDoc(ref, createPayload);
    }
  } catch (err: any) {
    console.error('[firestore] saveUserProfile failed | code:', err.code, '| message:', err.message);
    throw err;
  }
}

// Bump whenever the Ashtakoot / compatibility scoring logic changes, so every
// user's stored scores are recomputed once on their next load.
//   v2 — corrected Ashtakoot tables (Gana, Nadi, Yoni, Bhakut, Varna, Vashya,
//        Graha Maitri) and unified the guna engine so the saved total matches
//        the displayed 8-koota breakdown.
export const SCORING_VERSION = 2;

// One-time, idempotent recompute triggered on load. If the profile's stamped
// scoringVersion is behind SCORING_VERSION, recompute all prospect scores and
// stamp the new version so it runs at most once per engine change.
export async function recalcScoresIfStale(uid: string): Promise<number> {
  const profile = await getUserProfile(uid);
  if (!profile) return 0;
  if (profile.scoringVersion === SCORING_VERSION) return 0;
  const updated = await recalcAllProspectScores(uid);
  await updateDoc(doc(db, 'users', uid), { scoringVersion: SCORING_VERSION, updatedAt: Date.now() });
  console.log('[firestore] recalcScoresIfStale | bumped to v' + SCORING_VERSION + ', recomputed', updated);
  return updated;
}

// Recompute gunaScore + compatScore for EVERY prospect against the current
// profile. Call after preference/profile changes so stored scores stay correct.
// Reads the persisted profile internally so callers can't pass a stale copy.
export async function recalcAllProspectScores(uid: string): Promise<number> {
  const profile = await getUserProfile(uid);
  if (!profile) return 0;

  const snap = await getDocs(collection(db, 'users', uid, 'prospects'));
  if (snap.empty) return 0;

  const now = Date.now();
  let batch = writeBatch(db);
  let pending = 0;
  let total = 0;

  for (const d of snap.docs) {
    const p = { id: d.id, ...d.data() } as Prospect;
    const gunaScore =
      profile.nakshatra >= 0 && p.nakshatra !== undefined && p.nakshatra >= 0
        ? calculateGunaScore(profile.nakshatra, p.nakshatra, profile.rashiIndex, p.rashiIndex)
        : null;
    const compatScore = calculateCompatScore(profile, p);
    batch.update(d.ref, { gunaScore, compatScore, updatedAt: now });
    pending++;
    total++;
    // Firestore batches cap at 500 writes — commit in chunks to be safe.
    if (pending === 450) {
      await batch.commit();
      batch = writeBatch(db);
      pending = 0;
    }
  }

  if (pending > 0) await batch.commit();
  console.log('[firestore] recalcAllProspectScores | updated', total, 'prospects');
  return total;
}

export function subscribeToProspects(
  uid: string,
  callback: (prospects: Prospect[]) => void
): () => void {
  const q = query(collection(db, 'users', uid, 'prospects'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    const prospects = snap.docs.map(d => normalizeProspect({ id: d.id, ...d.data() } as Prospect));
    callback(prospects);
  });
}

export async function addProspect(uid: string, data: Omit<Prospect, 'id'>): Promise<string> {
  const payload = stripUndefined({ ...data, createdAt: Date.now(), updatedAt: Date.now() });
  console.log('[firestore] addProspect users/', uid, '/prospects | fields:', Object.keys(payload).join(', '));
  try {
    const ref = await addDoc(collection(db, 'users', uid, 'prospects'), payload);
    console.log('[firestore] addProspect success | id:', ref.id);
    return ref.id;
  } catch (err: any) {
    console.error('[firestore] addProspect failed | code:', err.code, '| message:', err.message);
    throw err;
  }
}

export async function updateProspect(uid: string, prospectId: string, data: Partial<Prospect>): Promise<void> {
  const payload = stripUndefined({ ...data, updatedAt: Date.now() });
  try {
    await updateDoc(doc(db, 'users', uid, 'prospects', prospectId), payload);
  } catch (err: any) {
    console.error('[firestore] updateProspect failed | id:', prospectId, '| code:', err.code, '| message:', err.message);
    throw err;
  }
}

export async function deleteProspect(uid: string, prospectId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'prospects', prospectId));
}

// Commit deletes in chunks (Firestore caps a batch at 500 writes).
async function deleteRefsInBatches(refs: DocumentReference[]): Promise<void> {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach(r => batch.delete(r));
    await batch.commit();
  }
}

// Permanently erase ALL data for a user: every prospect and its subcollections
// (notes, conversations, flags, meta), the activity log, and the profile doc.
// Firestore does not cascade, so each subcollection is deleted explicitly.
// Must run while the user is still authenticated (rules require it).
export async function deleteAllUserData(uid: string): Promise<void> {
  const prospectsSnap = await getDocs(collection(db, 'users', uid, 'prospects'));
  for (const p of prospectsSnap.docs) {
    for (const sub of ['notes', 'conversations', 'flags', 'meta']) {
      const subSnap = await getDocs(collection(db, 'users', uid, 'prospects', p.id, sub));
      await deleteRefsInBatches(subSnap.docs.map(d => d.ref));
    }
  }
  await deleteRefsInBatches(prospectsSnap.docs.map(d => d.ref));

  const activitySnap = await getDocs(collection(db, 'users', uid, 'activityLog'));
  await deleteRefsInBatches(activitySnap.docs.map(d => d.ref));

  await deleteDoc(doc(db, 'users', uid));
}

export async function getProspect(uid: string, prospectId: string): Promise<Prospect | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'prospects', prospectId));
  if (!snap.exists()) return null;
  return normalizeProspect({ id: snap.id, ...snap.data() } as Prospect);
}

export function subscribeToNotes(
  uid: string,
  prospectId: string,
  callback: (notes: Note[]) => void
): () => void {
  const q = query(
    collection(db, 'users', uid, 'prospects', prospectId, 'notes'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    const notes = snap.docs.map(d => ({ id: d.id, ...d.data() } as Note));
    callback(notes);
  });
}

export async function addNote(uid: string, prospectId: string, text: string): Promise<void> {
  const now = new Date();
  await addDoc(collection(db, 'users', uid, 'prospects', prospectId, 'notes'), {
    text,
    date: now.toLocaleDateString('en-IN'),
    time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    createdAt: Date.now(),
  });
}

// ── Activity Timeline ─────────────────────────────────────────────────────────

async function addActivityEntry(
  uid: string,
  prospectId: string,
  prospectName: string,
  type: ActivityType,
  summary: string,
): Promise<void> {
  const now = new Date();
  await addDoc(collection(db, 'users', uid, 'activityLog'), {
    prospectId,
    prospectName,
    type,
    summary,
    date: now.toLocaleDateString('en-IN'),
    time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    createdAt: Date.now(),
  });
}

export function subscribeToActivityLog(
  uid: string,
  callback: (entries: ActivityEntry[]) => void,
  limitCount = 60,
): () => void {
  const q = query(collection(db, 'users', uid, 'activityLog'), orderBy('createdAt', 'desc'), limit(limitCount));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityEntry)));
  });
}

export async function logStageChange(
  uid: string,
  prospectId: string,
  prospectName: string,
  newStage: string,
): Promise<void> {
  await addActivityEntry(uid, prospectId, prospectName, 'stage_change', `Stage changed to: ${newStage}`);
  await updateProspect(uid, prospectId, { lastActivityAt: Date.now() } as any);
}

// ── Conversations ─────────────────────────────────────────────────────────────

export function subscribeToConversations(
  uid: string,
  prospectId: string,
  callback: (convs: ConversationLog[]) => void,
): () => void {
  const q = query(
    collection(db, 'users', uid, 'prospects', prospectId, 'conversations'),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ConversationLog)));
  });
}

export async function addConversation(
  uid: string,
  prospectId: string,
  prospectName: string,
  data: Omit<ConversationLog, 'id'>,
): Promise<void> {
  await addDoc(collection(db, 'users', uid, 'prospects', prospectId, 'conversations'), stripUndefined(data as object));
  await updateDoc(doc(db, 'users', uid, 'prospects', prospectId), {
    conversationCount: increment(1),
    lastActivityAt: Date.now(),
    updatedAt: Date.now(),
  });
  await addActivityEntry(uid, prospectId, prospectName, 'conversation',
    `${data.callType}: ${data.duration}${data.topics.length ? ', topics: ' + data.topics.slice(0, 2).join(', ') : ''} ${data.mood}`);
}

export async function updateConversation(
  uid: string,
  prospectId: string,
  convId: string,
  data: Partial<Omit<ConversationLog, 'id'>>,
): Promise<void> {
  await updateDoc(
    doc(db, 'users', uid, 'prospects', prospectId, 'conversations', convId),
    stripUndefined(data as object),
  );
  await updateDoc(doc(db, 'users', uid, 'prospects', prospectId), {
    lastActivityAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function deleteConversation(
  uid: string,
  prospectId: string,
  convId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'prospects', prospectId, 'conversations', convId));
  await updateDoc(doc(db, 'users', uid, 'prospects', prospectId), {
    conversationCount: increment(-1),
    updatedAt: Date.now(),
  });
}

// ── Flags ─────────────────────────────────────────────────────────────────────

export function subscribeToFlags(
  uid: string,
  prospectId: string,
  callback: (flags: Flag[]) => void,
): () => void {
  const q = query(
    collection(db, 'users', uid, 'prospects', prospectId, 'flags'),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Flag)));
  });
}

export async function addFlag(
  uid: string,
  prospectId: string,
  prospectName: string,
  data: Omit<Flag, 'id'>,
): Promise<void> {
  await addDoc(collection(db, 'users', uid, 'prospects', prospectId, 'flags'), data);
  const field = data.type === 'green' ? 'greenFlagCount' : 'redFlagCount';
  await updateDoc(doc(db, 'users', uid, 'prospects', prospectId), {
    [field]: increment(1),
    lastActivityAt: Date.now(),
    updatedAt: Date.now(),
  });
  const type: ActivityType = data.type === 'green' ? 'flag_green' : 'flag_red';
  await addActivityEntry(uid, prospectId, prospectName, type, `${data.type === 'green' ? '💚' : '🚩'} Flag: ${data.text}`);
}

export async function deleteFlag(
  uid: string,
  prospectId: string,
  flagId: string,
  flagType: 'green' | 'red',
): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'prospects', prospectId, 'flags', flagId));
  const field = flagType === 'green' ? 'greenFlagCount' : 'redFlagCount';
  await updateDoc(doc(db, 'users', uid, 'prospects', prospectId), {
    [field]: increment(-1),
    updatedAt: Date.now(),
  });
}

// ── Family Scorecard ──────────────────────────────────────────────────────────

export async function saveFamilyScorecard(
  uid: string,
  prospectId: string,
  prospectName: string,
  scores: Partial<Record<FamilyScorecardKey, number>>,
): Promise<void> {
  const vals = Object.values(scores).filter(v => v !== undefined && v > 0) as number[];
  const average = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
  const data: FamilyScorecard = { scores, average, updatedAt: Date.now() };
  await setDoc(doc(db, 'users', uid, 'prospects', prospectId, 'meta', 'familyScorecard'), data);
  await updateDoc(doc(db, 'users', uid, 'prospects', prospectId), {
    familyScore: average,
    lastActivityAt: Date.now(),
    updatedAt: Date.now(),
  });
  await addActivityEntry(uid, prospectId, prospectName, 'family_score', `Family scorecard updated: ${average}/5 ⭐`);
}

export async function getFamilyScorecard(
  uid: string,
  prospectId: string,
): Promise<FamilyScorecard | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'prospects', prospectId, 'meta', 'familyScorecard'));
  return snap.exists() ? snap.data() as FamilyScorecard : null;
}

export function subscribeFamilyScorecard(
  uid: string,
  prospectId: string,
  callback: (sc: FamilyScorecard | null) => void,
): () => void {
  return onSnapshot(doc(db, 'users', uid, 'prospects', prospectId, 'meta', 'familyScorecard'), snap => {
    callback(snap.exists() ? snap.data() as FamilyScorecard : null);
  });
}

// ── Meeting ───────────────────────────────────────────────────────────────────

export async function saveMeetingData(
  uid: string,
  prospectId: string,
  prospectName: string,
  data: MeetingData,
): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'prospects', prospectId, 'meta', 'meeting'), stripUndefined(data as object));
  await updateDoc(doc(db, 'users', uid, 'prospects', prospectId), {
    lastActivityAt: Date.now(),
    updatedAt: Date.now(),
  });
  const latestRecord = data.meetings?.filter(m => m.savedAt).slice(-1)[0];
  if (latestRecord) {
    const vals = [latestRecord.appearanceMatch, latestRecord.convQuality, latestRecord.connectionFelt].filter(Boolean) as number[];
    const avgScore = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : 0;
    await addActivityEntry(uid, prospectId, prospectName, 'meeting',
      `Meeting #${latestRecord.meetingNumber} rated: ${avgScore}/5 ${latestRecord.gutFeeling ?? ''}`);
  }
}

export async function getMeetingData(
  uid: string,
  prospectId: string,
): Promise<MeetingData | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'prospects', prospectId, 'meta', 'meeting'));
  return snap.exists() ? snap.data() as MeetingData : null;
}

export function subscribeMeetingData(
  uid: string,
  prospectId: string,
  callback: (m: MeetingData | null) => void,
): () => void {
  return onSnapshot(doc(db, 'users', uid, 'prospects', prospectId, 'meta', 'meeting'), snap => {
    callback(snap.exists() ? snap.data() as MeetingData : null);
  });
}
