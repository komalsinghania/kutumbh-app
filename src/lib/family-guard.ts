// ─────────────────────────────────────────────────────────────────────────────
// Where does a signed-in user belong?
//
// Mummy Mode puts two kinds of account in one Firebase Auth pool, and one
// person can be both: a seeker (has a /users/{uid} profile) and a family viewer
// (has familyLinks). Without this, a mummy signing in through the normal header
// lands on /dashboard, which sends anyone without a profile to /onboarding —
// and asks her for her own age, gender and nakshatra. That is the single most
// likely way to embarrass this feature, so the check lives in one place.
// ─────────────────────────────────────────────────────────────────────────────
import { getMyAccess } from './family-share';
import { FAMILY_SHARING_ENABLED } from './config';

export type Home = '/dashboard' | '/family' | '/onboarding';

/**
 * Resolve the right landing route.
 *   has a profile            → the dashboard (family access, if any, is an
 *                              extra surface reachable from Profile)
 *   no profile, has access   → the family view
 *   neither                  → onboarding, as before
 */
export async function resolveHome(uid: string, hasProfile: boolean): Promise<Home> {
  if (hasProfile) return '/dashboard';
  if (!FAMILY_SHARING_ENABLED) return '/onboarding';
  try {
    const links = await getMyAccess(uid);
    return links.length > 0 ? '/family' : '/onboarding';
  } catch (err) {
    console.error('[family-guard] resolveHome failed, falling back to onboarding', err);
    return '/onboarding';
  }
}
