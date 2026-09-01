'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Keeping the family's copy honest.
//
// The shared snapshot is a mirror, so it can drift. Rather than a write-through
// on every mutation — an extra read per write, and one call site away from
// being forgotten — this is a reconciler. The owner's client already holds
// every prospect in a live subscription, so comparing `updatedAt` against
// `syncedAt` is nearly free, runs in the same session as the edit, and
// self-heals: an edit made on another device is reconciled the next time the
// owner opens the app.
//
// It also sweeps up orphans — a share whose rishta was deleted elsewhere, or
// every share once the last family member is removed.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react';
import type { Prospect } from '@/types';
import type { FamilyLink, SharedProspect } from '@/types/family';
import { syncShare, unshareProspect, prospectIdOfShare } from './family-share';
import { updateProspect } from './firestore';

interface Args {
  uid: string | undefined;
  ownerName: string | undefined;
  prospects: Prospect[];
  shares: SharedProspect[];
  members: FamilyLink[];
  /**
   * False until the prospects, shares AND members subscriptions have each
   * delivered at least once. All three matter: if shares arrive before
   * prospects, every share looks like an orphan and step 2 below deletes the
   * lot — silently un-sharing everything the family could see.
   */
  ready: boolean;
}

export function useShareSync({ uid, ownerName, prospects, shares, members, ready }: Args): void {
  // Remember what we have already written this session so a snapshot echoing
  // back from Firestore cannot start a write loop.
  const handled = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!ready || !uid || !ownerName) return;

    const run = async () => {
      const byProspectId = new Map(prospects.map(p => [p.id, p]));

      // Belt and braces on top of `ready`: never interpret an empty prospect
      // list as “every rishta was deleted” while shares still exist.
      if (prospects.length === 0 && shares.length > 0) {
        console.warn('[share-sync] prospects empty while shares exist — skipping');
        return;
      }

      // 1. No family left → nothing should be shared with anyone.
      if (members.length === 0) {
        for (const s of shares) {
          await unshareProspect(uid, s.prospectId).catch(err =>
            console.error('[share-sync] revoke-all failed', err));
          await updateProspect(uid, s.prospectId, { isShared: false }).catch(() => {});
        }
        return;
      }

      for (const share of shares) {
        const prospectId = share.prospectId || prospectIdOfShare(share.id);
        const prospect = byProspectId.get(prospectId);

        // 2. Orphan: the rishta is gone but its shared copy survived.
        if (!prospect) {
          await unshareProspect(uid, prospectId).catch(err =>
            console.error('[share-sync] orphan cleanup failed', err));
          continue;
        }

        // 3. Stale: the rishta changed after the copy was last written.
        const sourceUpdatedAt = prospect.updatedAt ?? 0;
        if (sourceUpdatedAt <= (share.sourceUpdatedAt ?? 0)) continue;
        if (handled.current.get(share.id) === sourceUpdatedAt) continue;

        handled.current.set(share.id, sourceUpdatedAt);
        await syncShare(uid, ownerName, prospect).catch(err =>
          console.error('[share-sync] syncShare failed', err));
      }

      // 4. Repair the isShared flag in BOTH directions. It drives the share
      //    chip on the rishta page and the family-sync check there, so a flag
      //    that disagrees with reality is not cosmetic: a false negative means
      //    edits silently stop reaching the family.
      const sharedIds = new Set(shares.map(s => s.prospectId));
      for (const p of prospects) {
        const shared = sharedIds.has(p.id);
        if (!!p.isShared === shared) continue;
        await updateProspect(uid, p.id, { isShared: shared }).catch(() => {});
      }
    };

    run();
  }, [ready, uid, ownerName, prospects, shares, members]);
}
