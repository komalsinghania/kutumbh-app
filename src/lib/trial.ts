import { UserProfile } from '@/types';
import { PAYMENTS_ENABLED, FAMILY_SHARING_ENABLED } from '@/lib/config';

// Compare is unlocked either by a one-time payment (isPaid) or by a free trial
// that begins the first time the user opens the Compare tab. The trial start
// timestamp lives on the user profile (`trialStartedAt`) so it persists across
// devices and sessions.

export const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DAY_MS = 24 * 60 * 60 * 1000;

type TrialProfile = Pick<UserProfile, 'isPaid' | 'trialStartedAt'> | null | undefined;

/** Epoch ms when the trial ends, or null if no trial has been started. */
export function trialEndsAt(profile: TrialProfile): number | null {
  if (!profile?.trialStartedAt) return null;
  return profile.trialStartedAt + TRIAL_DURATION_MS;
}

/** True while the free trial is running (started and not yet expired). */
export function isTrialActive(profile: TrialProfile): boolean {
  const end = trialEndsAt(profile);
  return end !== null && Date.now() < end;
}

/** True once a started trial has run out. */
export function isTrialExpired(profile: TrialProfile): boolean {
  const end = trialEndsAt(profile);
  return end !== null && Date.now() >= end;
}

/** Whole days remaining in the trial (rounded up), or 0 if none/expired. */
export function trialDaysLeft(profile: TrialProfile): number {
  const end = trialEndsAt(profile);
  if (end === null) return 0;
  return Math.max(0, Math.ceil((end - Date.now()) / DAY_MS));
}

/** The user can open Compare if they've paid or the trial is still active.
 *  While payments are disabled (early access), Compare is free for everyone. */
export function hasCompareAccess(profile: TrialProfile): boolean {
  if (!PAYMENTS_ENABLED) return true;
  return !!profile?.isPaid || isTrialActive(profile);
}

/** Mummy Mode. Free for everyone during early access; when payments come back
 *  it follows the same paid-or-trial rule as Compare, which is what the
 *  marketing page promises ("Roka Ready members get it before everyone else"). */
export function canUseFamilySharing(profile: TrialProfile): boolean {
  if (!FAMILY_SHARING_ENABLED) return false;
  if (!PAYMENTS_ENABLED) return true;
  return !!profile?.isPaid || isTrialActive(profile);
}
