// ─────────────────────────────────────────────────────────────────────────────
// Mummy Mode — the sharing engine.
//
// Everything a family member can read passes through `buildShareSnapshot()`.
// That function is an explicit ALLOWLIST, never a denylist: a field added to
// `Prospect` tomorrow does not appear in the family's view unless someone
// deliberately adds it here. Combined with the mirror living in its own
// top-level collection, this means no rules mistake and no UI bug can expose
// the owner's notes, flags, call logs, meeting ratings or family scorecard —
// those fields are not present in any document the family can read.
// ─────────────────────────────────────────────────────────────────────────────
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, collectionGroup,
  onSnapshot, query, where, orderBy, getDocs, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Prospect } from '@/types';
import { STAGE_LABELS } from '@/types';
import type {
  FamilyInvite, FamilyLink, FamilyVerdict, FamilyVerdictWithShare,
  RelationLabel, SharedProspect, SharedProspectMedia, VerdictValue,
} from '@/types/family';
import { gunaVerdictWord } from './family-copy';

// Firestore rejects undefined values — strip them before any write.
function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days
export const MAX_FAMILY_MEMBERS = 5;

// ── Ids ───────────────────────────────────────────────────────────────────────
// Deterministic composite ids make share/unshare/sync idempotent single writes,
// and let the security rules derive the owner from the path without a billed
// get(). Both halves are Firebase uids, which never contain '_'.

export const shareId = (ownerUid: string, prospectId: string) => `${ownerUid}__${prospectId}`;
export const linkId  = (ownerUid: string, viewerUid: string)  => `${ownerUid}__${viewerUid}`;
export const ownerUidOfShare = (id: string) => id.split('__')[0];
export const prospectIdOfShare = (id: string) => id.split('__').slice(1).join('__');

/** URL-safe, unguessable invite code. The code IS the capability — 22 chars of
 *  crypto randomness, and `list` is denied on the collection in the rules. */
function newInviteCode(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// ── The allowlist ─────────────────────────────────────────────────────────────

export interface ShareOptions {
  includeBirthDetails?: boolean;
}

/**
 * Build the sanitised snapshot the family is allowed to read.
 *
 * ⚠️ PRIVACY BOUNDARY. Fields deliberately excluded, and why:
 *   phone              — the prospect's own contact details
 *   firstImpression    — the owner's private first take
 *   greenFlagCount /
 *   redFlagCount       — the flags feature is explicitly promised as private
 *   familyScore        — the family scorecard is explicitly promised as private
 *   conversationCount  — call logs are explicitly promised as private
 *   compatScore        — derived from the owner's own preferences
 *   decision, source, notes, lastActivityAt, noteCount
 * Birth details are included ONLY when the owner opts in per rishta.
 */
export function buildShareSnapshot(
  ownerUid: string,
  ownerName: string,
  p: Prospect,
  opts: ShareOptions = {},
  existing?: Pick<SharedProspect, 'sharedAt'> | null,
): Omit<SharedProspect, 'id'> {
  const now = Date.now();
  const includeBirthDetails = !!opts.includeBirthDetails;

  return stripUndefined({
    ownerUid,
    ownerName,
    prospectId: p.id,

    name: p.name,
    age: p.age,
    city: p.city,
    height: p.height,
    education: p.education,
    profession: p.profession,
    income: p.income,
    familyType: p.familyType,
    diet: p.diet,
    manglik: p.manglik,
    gotra: p.gotra,
    rashi: p.rashi,
    hobbies: p.hobbies,

    fatherOcc: p.fatherOcc,
    motherOcc: p.motherOcc,
    siblings: p.siblings,
    property: p.property,

    gunaScore: p.gunaScore ?? null,
    gunaVerdict: gunaVerdictWord(p.gunaScore, 'hi'),

    stage: p.stage,
    stageLabel: STAGE_LABELS[p.stage] ?? p.stage,

    photoCount: (p.photos ?? []).length,

    includeBirthDetails,
    dobDate: includeBirthDetails ? p.dobDate : undefined,
    dobTime: includeBirthDetails ? p.dobTime : undefined,
    dobPlace: includeBirthDetails ? p.dobPlace : undefined,

    sharedAt: existing?.sharedAt ?? now,
    syncedAt: now,
    sourceUpdatedAt: p.updatedAt ?? now,
  }) as Omit<SharedProspect, 'id'>;
}

// ── Invites ───────────────────────────────────────────────────────────────────

export async function createInvite(
  ownerUid: string,
  ownerName: string,
  relationLabel: RelationLabel,
): Promise<string> {
  const code = newInviteCode();
  const now = Date.now();
  const invite: Omit<FamilyInvite, 'code'> = {
    ownerUid,
    ownerName,
    relationLabel,
    status: 'pending',
    createdAt: now,
    expiresAt: now + INVITE_TTL_MS,
  };
  await setDoc(doc(db, 'familyInvites', code), invite);
  console.log('[family] createInvite | relation:', relationLabel);
  return code;
}

export async function getInvite(code: string): Promise<FamilyInvite | null> {
  const snap = await getDoc(doc(db, 'familyInvites', code));
  if (!snap.exists()) return null;
  return { code: snap.id, ...snap.data() } as FamilyInvite;
}

export async function revokeInvite(code: string): Promise<void> {
  await deleteDoc(doc(db, 'familyInvites', code));
}

export function subscribeToPendingInvites(
  ownerUid: string,
  callback: (invites: FamilyInvite[]) => void,
): () => void {
  const q = query(collection(db, 'familyInvites'), where('ownerUid', '==', ownerUid));
  return onSnapshot(q, snap => {
    const all = snap.docs.map(d => ({ code: d.id, ...d.data() } as FamilyInvite));
    callback(all.filter(i => i.status === 'pending' && i.expiresAt > Date.now()));
  }, err => console.error('[family] subscribeToPendingInvites failed', err));
}

export type ClaimResult =
  | { ok: true; link: FamilyLink }
  | { ok: false; reason: 'not_found' | 'expired' | 'claimed' | 'self' };

/**
 * Accept an invitation. Two writes: stamp the invite as claimed (the rules only
 * let the caller stamp their OWN uid), then create the link the rules check on
 * every subsequent read.
 */
export async function claimInvite(
  code: string,
  viewerUid: string,
  viewerName: string,
): Promise<ClaimResult> {
  const invite = await getInvite(code);
  if (!invite) return { ok: false, reason: 'not_found' };
  if (invite.ownerUid === viewerUid) return { ok: false, reason: 'self' };
  if (invite.expiresAt <= Date.now()) return { ok: false, reason: 'expired' };
  if (invite.status === 'claimed' && invite.claimedByUid !== viewerUid) {
    return { ok: false, reason: 'claimed' };
  }
  if (invite.status === 'revoked') return { ok: false, reason: 'not_found' };

  const id = linkId(invite.ownerUid, viewerUid);

  // Re-opening a link you already used (a re-sent WhatsApp message, a bookmark).
  // Both writes below would be REJECTED here — the invite is no longer pending,
  // and a full rewrite of an existing link is not an allowed update — so return
  // the link that already exists instead of failing in her face.
  if (invite.status === 'claimed' && invite.claimedByUid === viewerUid) {
    const existing = await getDoc(doc(db, 'familyLinks', id));
    if (existing.exists()) {
      return { ok: true, link: { id, ...existing.data() } as FamilyLink };
    }
  }

  const now = Date.now();
  if (invite.status === 'pending') {
    await updateDoc(doc(db, 'familyInvites', code), {
      status: 'claimed',
      claimedByUid: viewerUid,
      claimedByName: viewerName,
      claimedAt: now,
    });
  }

  const link: Omit<FamilyLink, 'id'> = {
    ownerUid: invite.ownerUid,
    ownerName: invite.ownerName,
    viewerUid,
    viewerName,
    relationLabel: invite.relationLabel,
    inviteCode: code,
    createdAt: now,
    lastSeenAt: now,
  };
  await setDoc(doc(db, 'familyLinks', id), link);
  console.log('[family] claimInvite success | link:', id);
  return { ok: true, link: { id, ...link } };
}

// ── Links ─────────────────────────────────────────────────────────────────────

/** The family members who can see this owner's shared rishtas. */
export function subscribeToFamilyMembers(
  ownerUid: string,
  callback: (links: FamilyLink[]) => void,
): () => void {
  const q = query(collection(db, 'familyLinks'), where('ownerUid', '==', ownerUid));
  return onSnapshot(q, snap => {
    const links = snap.docs.map(d => ({ id: d.id, ...d.data() } as FamilyLink));
    callback(links.sort((a, b) => a.createdAt - b.createdAt));
  }, err => console.error('[family] subscribeToFamilyMembers failed', err));
}

/** The shortlists this viewer has been given access to. */
export function subscribeToMyAccess(
  viewerUid: string,
  callback: (links: FamilyLink[]) => void,
): () => void {
  const q = query(collection(db, 'familyLinks'), where('viewerUid', '==', viewerUid));
  return onSnapshot(q, snap => {
    const links = snap.docs.map(d => ({ id: d.id, ...d.data() } as FamilyLink));
    callback(links.sort((a, b) => a.createdAt - b.createdAt));
  }, err => console.error('[family] subscribeToMyAccess failed', err));
}

export async function getMyAccess(viewerUid: string): Promise<FamilyLink[]> {
  const q = query(collection(db, 'familyLinks'), where('viewerUid', '==', viewerUid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FamilyLink));
}

export async function touchLastSeen(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'familyLinks', id), { lastSeenAt: Date.now() });
  } catch {
    // Non-critical: a failed "last opened" stamp must never block the view.
  }
}

/**
 * Remove a family member's access. Deleting the link revokes every read
 * immediately (the rules check it via exists()), then their verdicts are
 * cleared so nothing of theirs lingers on the owner's rishtas.
 *
 * The originating invite goes too. It is spent, but leaving it behind leaves a
 * usable key lying around: the rules gate re-creating a link on a recent claim,
 * and deleting the invite closes the door regardless of timing.
 */
export async function removeFamilyMember(
  ownerUid: string,
  viewerUid: string,
  inviteCode?: string,
): Promise<void> {
  await deleteDoc(doc(db, 'familyLinks', linkId(ownerUid, viewerUid)));

  const shares = await getDocs(
    query(collection(db, 'sharedProspects'), where('ownerUid', '==', ownerUid)),
  );
  const batch = writeBatch(db);
  shares.docs.forEach(s => batch.delete(doc(db, 'sharedProspects', s.id, 'verdicts', viewerUid)));
  if (inviteCode) batch.delete(doc(db, 'familyInvites', inviteCode));
  await batch.commit();
  console.log('[family] removeFamilyMember | viewer:', viewerUid);
}

// ── Sharing a rishta ──────────────────────────────────────────────────────────

export async function getShare(id: string): Promise<SharedProspect | null> {
  const snap = await getDoc(doc(db, 'sharedProspects', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as SharedProspect;
}

/** Share (or re-share) one rishta. Writes the snapshot and the photos doc. */
export async function shareProspect(
  ownerUid: string,
  ownerName: string,
  prospect: Prospect,
  opts: ShareOptions = {},
): Promise<void> {
  const id = shareId(ownerUid, prospect.id);
  const existing = await getShare(id);
  const snapshot = buildShareSnapshot(ownerUid, ownerName, prospect, opts, existing);

  await setDoc(doc(db, 'sharedProspects', id), snapshot);
  await setDoc(doc(db, 'sharedProspects', id, 'media', 'photos'), {
    photos: prospect.photos ?? [],
  } as SharedProspectMedia);
  console.log('[family] shareProspect | id:', id, '| birthDetails:', !!opts.includeBirthDetails);
}

/** Stop sharing: the snapshot, its photos and every verdict on it are deleted. */
export async function unshareProspect(ownerUid: string, prospectId: string): Promise<void> {
  const id = shareId(ownerUid, prospectId);
  const verdicts = await getDocs(collection(db, 'sharedProspects', id, 'verdicts'));
  const batch = writeBatch(db);
  verdicts.docs.forEach(v => batch.delete(v.ref));
  batch.delete(doc(db, 'sharedProspects', id, 'media', 'photos'));
  batch.delete(doc(db, 'sharedProspects', id));
  await batch.commit();
  console.log('[family] unshareProspect | id:', id);
}

/**
 * Refresh an existing snapshot from the live prospect. No-op if the rishta is
 * not shared — this is what the reconciler calls, so it must be cheap and safe
 * to call for anything.
 */
export async function syncShare(
  ownerUid: string,
  ownerName: string,
  prospect: Prospect,
): Promise<boolean> {
  const id = shareId(ownerUid, prospect.id);
  const existing = await getShare(id);
  if (!existing) return false;

  const snapshot = buildShareSnapshot(
    ownerUid, ownerName, prospect,
    { includeBirthDetails: existing.includeBirthDetails },
    existing,
  );
  await setDoc(doc(db, 'sharedProspects', id), snapshot);

  // Photos change rarely; only rewrite the heavy doc when the count moved.
  if ((prospect.photos ?? []).length !== existing.photoCount) {
    await setDoc(doc(db, 'sharedProspects', id, 'media', 'photos'), {
      photos: prospect.photos ?? [],
    } as SharedProspectMedia);
  }
  console.log('[family] syncShare | id:', id);
  return true;
}

/** Every rishta this owner has shared — used by both the owner and the family. */
export function subscribeToSharedProspects(
  ownerUid: string,
  callback: (shares: SharedProspect[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  const q = query(
    collection(db, 'sharedProspects'),
    where('ownerUid', '==', ownerUid),
    orderBy('sharedAt', 'desc'),
  );
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as SharedProspect))),
    err => { console.error('[family] subscribeToSharedProspects failed', err); onError?.(err); },
  );
}

export function subscribeToShare(
  id: string,
  callback: (share: SharedProspect | null) => void,
): () => void {
  return onSnapshot(doc(db, 'sharedProspects', id), snap => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as SharedProspect) : null);
  }, err => { console.error('[family] subscribeToShare failed', err); callback(null); });
}

export async function getSharedPhotos(id: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'sharedProspects', id, 'media', 'photos'));
  return snap.exists() ? ((snap.data() as SharedProspectMedia).photos ?? []) : [];
}

// ── Verdicts ──────────────────────────────────────────────────────────────────

export async function saveVerdict(
  id: string,
  viewer: { uid: string; name: string; relationLabel: RelationLabel },
  verdict: VerdictValue,
  comment: string,
): Promise<void> {
  const ref = doc(db, 'sharedProspects', id, 'verdicts', viewer.uid);
  const existing = await getDoc(ref);
  const now = Date.now();
  await setDoc(ref, stripUndefined({
    // ownerUid is denormalised so the owner can collection-group query every
    // verdict across all their rishtas in a single subscription.
    ownerUid: ownerUidOfShare(id),
    prospectId: prospectIdOfShare(id),
    viewerUid: viewer.uid,
    viewerName: viewer.name,
    relationLabel: viewer.relationLabel,
    verdict,
    comment: comment.trim() || undefined,
    createdAt: existing.exists() ? (existing.data().createdAt as number) : now,
    updatedAt: now,
  }));
  console.log('[family] saveVerdict | share:', id, '| verdict:', verdict);
}

export function subscribeToVerdicts(
  id: string,
  callback: (verdicts: FamilyVerdict[]) => void,
): () => void {
  return onSnapshot(collection(db, 'sharedProspects', id, 'verdicts'), snap => {
    const list = snap.docs.map(d => d.data() as FamilyVerdict);
    callback(list.sort((a, b) => a.createdAt - b.createdAt));
  }, err => console.error('[family] subscribeToVerdicts failed', err));
}

/**
 * Every verdict across every rishta one person has shared, in a single
 * subscription. Used by the owner (badges, activity feed) and by each family
 * member (so the list can show their own verdict without one subscription per
 * card). Needs the `verdicts` collection-group index.
 */
export function subscribeToAllVerdicts(
  ownerUid: string,
  callback: (verdicts: FamilyVerdictWithShare[]) => void,
): () => void {
  const q = query(collectionGroup(db, 'verdicts'), where('ownerUid', '==', ownerUid));
  return onSnapshot(q, snap => {
    const list = snap.docs.map(d => ({
      ...(d.data() as FamilyVerdict),
      shareId: d.ref.parent.parent?.id ?? '',
      prospectId: (d.data() as { prospectId?: string }).prospectId ?? '',
    } as FamilyVerdictWithShare));
    callback(list.sort((a, b) => b.updatedAt - a.updatedAt));
  }, err => console.error('[family] subscribeToAllVerdicts failed', err));
}

// ── Teardown ──────────────────────────────────────────────────────────────────

/** Delete every family artefact belonging to an owner. Called when a rishta or
 *  the whole account is deleted — Firestore does not cascade. */
export async function deleteAllFamilyDataForOwner(ownerUid: string): Promise<void> {
  const shares = await getDocs(
    query(collection(db, 'sharedProspects'), where('ownerUid', '==', ownerUid)),
  );
  for (const s of shares.docs) {
    const verdicts = await getDocs(collection(db, 'sharedProspects', s.id, 'verdicts'));
    const batch = writeBatch(db);
    verdicts.docs.forEach(v => batch.delete(v.ref));
    batch.delete(doc(db, 'sharedProspects', s.id, 'media', 'photos'));
    batch.delete(s.ref);
    await batch.commit();
  }

  const links = await getDocs(
    query(collection(db, 'familyLinks'), where('ownerUid', '==', ownerUid)),
  );
  const invites = await getDocs(
    query(collection(db, 'familyInvites'), where('ownerUid', '==', ownerUid)),
  );
  const batch = writeBatch(db);
  [...links.docs, ...invites.docs].forEach(d => batch.delete(d.ref));
  await batch.commit();
  console.log('[family] deleteAllFamilyDataForOwner | shares:', shares.size);
}

/**
 * A viewer walking away. Order matters: their verdicts must go FIRST, while the
 * link still grants access — deleting the link is what revokes their reads, so
 * doing it first would strand their verdicts on the owner's rishtas forever.
 */
export async function removeMyAccess(viewerUid: string, ownerUid: string): Promise<void> {
  try {
    const shares = await getDocs(
      query(collection(db, 'sharedProspects'), where('ownerUid', '==', ownerUid)),
    );
    const batch = writeBatch(db);
    shares.docs.forEach(s => batch.delete(doc(db, 'sharedProspects', s.id, 'verdicts', viewerUid)));
    await batch.commit();
  } catch (err) {
    console.error('[family] removeMyAccess | verdict cleanup failed', err);
  }
  await deleteDoc(doc(db, 'familyLinks', linkId(ownerUid, viewerUid)));
  console.log('[family] removeMyAccess | owner:', ownerUid);
}
