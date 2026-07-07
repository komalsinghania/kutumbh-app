import { UserProfile } from '@/types';

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

/** The user can open Compare if they've paid or the trial is still active. */
export function hasCompareAccess(profile: TrialProfile): boolean {
  return !!profile?.isPaid || isTrialActive(profile);
}
