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
  /** False until both subscriptions have delivered at least once — reconciling
   *  against empty arrays would delete every share on first paint. */
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

      // 4. Repair: a rishta flagged as shared whose copy no longer exists
      //    (e.g. a half-finished unshare). Clear the flag so the UI is honest.
      const sharedIds = new Set(shares.map(s => s.prospectId));
      for (const p of prospects) {
        if (p.isShared && !sharedIds.has(p.id)) {
          await updateProspect(uid, p.id, { isShared: false }).catch(() => {});
        }
      }
    };

    run();
  }, [ready, uid, ownerName, prospects, shares, members]);
}
