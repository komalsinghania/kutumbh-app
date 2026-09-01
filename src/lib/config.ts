// ── Feature flags ──────────────────────────────────────────────────────────
//
// Payments are TEMPORARILY DISABLED — the app is free for everyone while we're
// in early access. Compare (the only paid feature) is unlocked for all users,
// the paywall/trial UI is hidden, and the Razorpay checkout is short-circuited.
//
// The payment code (Razorpay, API routes, `isPaid` Firestore fields, trial
// logic) is all left intact. To make the app chargeable again, flip this one
// constant back to `true` — no other code change is required to restore the
// paywall, trial, and checkout. (The two marketing-copy edits made alongside
// this flag — the landing hero badge and the /pricing page — would need to be
// reverted by hand.)
export const PAYMENTS_ENABLED = false;

// ── Mummy Mode ─────────────────────────────────────────────────────────────
//
// Family sharing: the owner mirrors a sanitised copy of chosen rishtas into a
// separate collection that invited family members can read, and they leave a
// verdict. Flip to `false` to hide every entry point (the share button, the
// Family access card, the /family routes) without removing the code.
//
// Turning this off does NOT revoke access already granted — deploy the rules
// change or delete the familyLinks documents for that.
export const FAMILY_SHARING_ENABLED = true;
