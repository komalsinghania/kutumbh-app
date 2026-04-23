import {
  doc, getDoc, setDoc, updateDoc, collection, addDoc,
  deleteDoc, onSnapshot, query, orderBy, limit, increment,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  UserProfile, Prospect, Note,
  ConversationLog, Flag, FamilyScorecard, FamilyScorecardKey,
  MeetingData, ActivityEntry, ActivityType,
} from '@/types';

// Firestore rejects undefined values — strip them before any write
function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
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

export function subscribeToProspects(
  uid: string,
  callback: (prospects: Prospect[]) => void
): () => void {
  const q = query(collection(db, 'users', uid, 'prospects'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    const prospects = snap.docs.map(d => ({ id: d.id, ...d.data() } as Prospect));
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

export async function getProspect(uid: string, prospectId: string): Promise<Prospect | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'prospects', prospectId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Prospect;
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
