# Mummy Mode — Implementation Plan

Status: **built** (all six phases). `next build` and `tsc --noEmit` pass.

**Before this works in production, two things must be deployed to Firebase —
the app will fail with `permission-denied` until they are:**

```bash
npx firebase deploy --only firestore:rules,firestore:indexes
```

The security rules could not be emulator-tested during implementation (the
Firestore emulator needs Java, which is not installed on this machine), so
§10's rules test suite is still worth running before this reaches real users.

Deviations from the plan as written below, all deliberate:

- `familyInvites` allows unauthenticated `get` (not signed-in-only). The invitee
  has to see *who* invited her before a login screen appears, or she abandons.
  `list` is still denied, so codes cannot be enumerated. Documented in the rules.
- `familyLinks` creation additionally requires the invite to have been claimed
  **within the last 30 minutes**. Without it, a removed family member could
  re-run the claim against the old invite and silently restore their own access.
  The owner's "Remove" also deletes the originating invite.
- The reconciler runs on the dashboard, but the prospect detail page syncs the
  family's copy directly on stage change, edit and photo add/remove — that page
  is where those changes happen, and waiting for the next dashboard visit would
  leave the family looking at a stale card.

---

---

## 0. What we already promised

`/mummy-mode` is live marketing copy and it is unusually specific. It is the
spec. Anything we build must honour it exactly, because users will read that
page and then open the app.

**The promise, verbatim in substance:**

| Mummy sees | Mummy never sees |
|---|---|
| Biodata summary (name, age, education, profession, income, city) | Your red & green flags |
| All three photos | Your call logs & moods |
| Kundli score out of 36 + pandit-friendly verdict | Your meeting ratings |
| Family details (father's occupation, family type, gotra) | Your family scorecard |
| Current stage | The Compare matrix |
| Her own verdict button: Yes / No / Need to discuss + comment | Prospects you haven't shared |

Plus three structural promises:
1. **"Mummy gets her own login."** → real auth, not an anonymous link.
2. **"You choose which prospects appear in her view, one by one."** → sharing is
   per-rishta, never all-or-nothing.
3. **"Papa can have a login too. So can bhabhi. Everyone's verdicts sit side by
   side — and you remain the decision-maker."** → multiple viewers, verdicts are
   advisory, no vetoes.

And the line that governs every technical decision:

> "Her voice, structured… She gets a verdict button. Not a veto."
> "What she sees. What she doesn't. **This line is the entire feature.**"

The privacy boundary *is* the product. That drives the architecture in §2.

---

## 1. Constraints in the current codebase

Read before designing anything:

- **No Firebase Admin SDK.** `src/lib/verify-firebase-token.ts` verifies ID
  tokens via public JWKS, but there is no service-account credential anywhere,
  so **server routes cannot read or write Firestore**. Everything is the client
  SDK + security rules. Mummy Mode must be enforceable *in rules alone*.
- **`firestore.rules` is currently airtight and simple**: `users/{uid}` plus a
  `match /{document=**}` catch-all, owner-only. We must not weaken it.
- **Photos are base64 data URLs stored inside the prospect doc** (≤200 KB each,
  max 3 — see `src/lib/compress-image.ts`). Three photos ≈ 800 KB of the 1 MB
  Firestore document limit. Any mirrored copy must keep photos in a *separate*
  document or list views will be unusable.
- **`/dashboard` redirects any signed-in user without a `users/{uid}` profile to
  `/onboarding`** (`src/app/dashboard/page.tsx:254`). A mummy who lands there
  would be asked her own age, gender and nakshatra. This is the single most
  likely way to ship an embarrassing bug.
- **No email/push infrastructure.** No Resend, no nodemailer, no FCM. Invite
  delivery must be WhatsApp / copy-link. That is the right channel for this
  audience anyway.
- **`PAYMENTS_ENABLED = false`** — app is free during early access. Gate Mummy
  Mode behind one helper so it flips with the rest.
- `firestore.indexes.json` is empty; composite indexes must be added and
  deployed *before* the feature goes live or queries fail in production.
- Per `AGENTS.md`: read `node_modules/next/dist/docs/` for routing/metadata APIs
  before writing route files. This Next.js differs from training data.

---

## 2. Architecture

### 2.1 The core decision: sanitised mirror documents

Two ways to give mummy read access:

**(A) Loosen rules on the real prospect doc** — `allow read if uid in sharedWith`.
Simple, always fresh. **Rejected:** the prospect doc physically contains
`firstImpression`, `greenFlagCount`, `redFlagCount`, `familyScore`,
`conversationCount`, `decision`, `phone`. Hiding them in the UI is not hiding
them — anyone can read the doc with the JS SDK. That directly breaks the
promise, and the promise is the feature.

**(B) Mirror an allowlisted snapshot into a separate collection.** ✅ **Chosen.**
The document mummy can read *does not contain* the private fields at all. No
rules mistake, no UI bug, and no future added field can leak them. It also means
`/users/{uid}` rules stay byte-for-byte unchanged.

Cost: the mirror must be kept in sync. Solved in §2.4 with a reconciler.

**Engineering rule for the whole feature: the snapshot builder is an explicit
allowlist (`pick`), never a denylist (`omit`).** A field added to `Prospect`
next month must not silently appear in mummy's view.

### 2.2 Collections (all new, all top-level — `/users/{uid}` untouched)

```
familyInvites/{code}
  code = 24-char URL-safe random (crypto.getRandomValues), used as the doc id
  { ownerUid, ownerName, relationLabel, createdAt, expiresAt,
    status: 'pending' | 'claimed' | 'revoked',
    claimedByUid?, claimedByName?, claimedAt? }

familyLinks/{ownerUid}__{viewerUid}
  { ownerUid, ownerName, viewerUid, viewerName, relationLabel,
    inviteCode, createdAt, lastSeenAt? }

sharedProspects/{ownerUid}__{prospectId}          ← deterministic id
  { ownerUid, prospectId, ownerName,
    // ALLOWLISTED snapshot only:
    name, age, city, height, education, profession, income, familyType,
    diet, manglik, gotra, rashi, hobbies,
    fatherOcc, motherOcc, siblings, property,
    gunaScore, gunaVerdict,            // "26/36 · Shubh"
    stage, stageLabel,                 // Hinglish label, not the internal enum
    photoCount,
    includeBirthDetails: boolean,      // per-share opt-in
    dobDate?, dobTime?, dobPlace?,     // ONLY when includeBirthDetails
    sharedAt, syncedAt, sourceUpdatedAt }

sharedProspects/{shareId}/media/photos
  { photos: string[] }                 // heavy doc, fetched on detail view only

sharedProspects/{shareId}/verdicts/{viewerUid}
  { viewerUid, viewerName, relationLabel,
    verdict: 'yes' | 'no' | 'discuss', comment, createdAt, updatedAt }
```

**Never mirrored:** `phone`, `firstImpression`, `greenFlagCount`, `redFlagCount`,
`familyScore`, `conversationCount`, `compatScore`, `decision`, `source`,
`lastActivityAt`, `noteCount`, and every subcollection (notes, conversations,
flags, meta).

Deterministic composite ids matter: share/unshare/sync become idempotent
`setDoc`/`deleteDoc` with no lookup, and rules can derive `ownerUid` from the
path without a billed `get()`.

### 2.3 Security rules

Add three top-level `match` blocks. **Do not touch the existing `users/{uid}`
block.** Sketch (verify `string.split()` behaviour in the emulator before
relying on it for the subcollection rules):

```
function signedIn()      { return request.auth != null; }
function isLinked(owner) {
  return signedIn() &&
    exists(/databases/$(database)/documents/familyLinks/$(owner + '__' + request.auth.uid));
}

match /familyInvites/{code} {
  allow get:    if signedIn();                    // the code IS the secret
  allow list:   if false;                         // never enumerable
  allow create: if signedIn()
                && request.resource.data.ownerUid == request.auth.uid
                && request.resource.data.status == 'pending';
  allow delete: if signedIn() && resource.data.ownerUid == request.auth.uid;
  // Claim: viewer flips pending → claimed, stamping only their own uid.
  allow update: if signedIn() && (
       resource.data.ownerUid == request.auth.uid                       // owner revoke
    || (resource.data.status == 'pending'
        && request.time < resource.data.expiresAt
        && request.resource.data.status == 'claimed'
        && request.resource.data.claimedByUid == request.auth.uid
        && request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['status','claimedByUid','claimedByName','claimedAt'])));
}

match /familyLinks/{linkId} {
  allow read:   if signedIn() && (resource.data.ownerUid  == request.auth.uid
                              ||  resource.data.viewerUid == request.auth.uid);
  allow create: if signedIn()
                && linkId == request.resource.data.ownerUid + '__' + request.auth.uid
                && request.resource.data.viewerUid == request.auth.uid
                && get(/databases/$(database)/documents/familyInvites/$(request.resource.data.inviteCode))
                     .data.claimedByUid == request.auth.uid;
  allow update: if signedIn() && resource.data.viewerUid == request.auth.uid
                && request.resource.data.diff(resource.data).affectedKeys()
                     .hasOnly(['viewerName','lastSeenAt']);
  allow delete: if signedIn() && (resource.data.ownerUid  == request.auth.uid
                              ||  resource.data.viewerUid == request.auth.uid);
}

match /sharedProspects/{shareId} {
  allow read:  if signedIn() && (resource.data.ownerUid == request.auth.uid
                             ||  isLinked(resource.data.ownerUid));
  allow write: if signedIn()
               && shareId.split('__')[0] == request.auth.uid
               && request.resource.data.ownerUid == request.auth.uid;

  match /media/{docId}      { /* same read; write owner only */ }
  match /verdicts/{viewerUid} {
    allow read:          if signedIn() && (shareId.split('__')[0] == request.auth.uid
                                       ||  isLinked(shareId.split('__')[0]));
    allow create, update: if signedIn() && viewerUid == request.auth.uid
                          && isLinked(shareId.split('__')[0]);
    allow delete:        if signedIn() && (viewerUid == request.auth.uid
                                       ||  shareId.split('__')[0] == request.auth.uid);
  }
}
```

Notes:
- The invite code is a capability. `allow get: if signedIn()` is safe *only*
  because the id is 24 random chars and `list` is denied. Keep both.
- `isLinked()` costs one document read per share doc read. At ~10 shared
  rishtas that's negligible; revisit only if a user shares hundreds.
- **Cap family members at 5 per owner** (enforced client-side at invite
  creation). Keeps rule cost bounded and matches reality.

### 2.4 Keeping the mirror fresh — a reconciler, not write-through

Write-through in `updateProspect()` would need an extra read on every mutation
and could be forgotten at any call site. Instead:

- Add `isShared?: boolean` to the `Prospect` doc (owner-only, no privacy impact).
- `useShareSync(uid, prospects)` — a hook mounted on `/dashboard` and
  `/prospects/[id]`. The owner's client already holds every prospect via
  `subscribeToProspects`. Whenever a prospect has `isShared === true` and
  `updatedAt > share.syncedAt`, rewrite the mirror.
- It is **self-healing**: an edit made on another device is reconciled the next
  time the owner opens the app.
- It also handles orphans: share doc exists but the prospect is gone → delete
  the share; zero remaining family links → delete every share and clear
  `isShared`.

Latency: sub-second in practice, since the owner is in the app when they edit.
Document the tradeoff — mummy's copy is *eventually* consistent, and the share
sheet shows "Updated just now / 2 days ago" so the owner can see it.

---

## 3. Accounts, routing and the onboarding trap

One Firebase Auth pool, two roles, and a user can be **both**:

| | has `users/{uid}` profile | has `familyLinks` as viewer |
|---|---|---|
| Seeker | ✅ | — |
| Family viewer | ❌ | ✅ |
| Both (e.g. a sister who also uses the app) | ✅ | ✅ |

Add `src/lib/family-guard.ts` → `resolveHome(uid)`:

- profile + links → `/dashboard`, and show a "Family view" entry in the nav
- profile only → `/dashboard` (unchanged)
- links only → `/family`
- neither → `/onboarding` (unchanged)

**Mandatory guards:**
1. `/family/*` must never redirect to `/onboarding`, whatever the profile state.
2. `/family/join?code=…` handles its own auth and creates the link *before* any
   routing decision, so an invited mummy is never bounced to onboarding.
3. Viewer display name lives on `familyProfiles/{uid}` (self-owned) **and** is
   denormalised onto `familyLinks` and each verdict — so no screen ever needs to
   read another user's profile document.

---

## 4. User experience

### 4.1 Owner (the seeker) — three touchpoints, no new bottom tab

The bottom nav already carries five tabs (board / matches / decision / compare /
profile) and `navigation.md` deliberately wanted it lean. Do **not** add a sixth.

**(a) Profile tab → "Family access" card**
- Empty state: *"Mummy poochti rehti hai? Add her here."* + **Invite mummy**.
- Invite flow: pick relation (Mummy · Papa · Bhabhi · Bhai · Didi · Other) →
  generate link → **Share on WhatsApp** (primary) / Copy link (secondary).
  Link is valid 7 days, single use, revocable.
- Populated state: list of members with relation, joined date, "last opened",
  count of rishtas visible to them, and **Remove access**.

**(b) Prospect detail header → "Share with family"**
- First run (no members yet) → routes into the invite flow above.
- Otherwise a sheet with:
  - Toggle **Visible to family** (this is the per-rishta control)
  - Toggle **Include birth details (for pandit ji)** — default **off**
  - "Who can see this: Mummy, Papa"
  - **Preview mummy's view** — renders the actual read-only card. This one
    control is what makes the privacy promise *believable*; it should not be
    cut for scope.
  - Footer line: *"Your notes, flags, call logs and ratings are never shared."*

**(c) Verdicts come back**
- **Decision tab** gets a section **"What your family said"** — one row per
  member: avatar initial, relation, verdict pill, comment, timestamp.
  It lives in Decision because it belongs to deliberation, not to the biodata.
  ⚠️ Naming collision: the existing **Family** tab means *his* family's
  scorecard. Do not reuse that word for this. Use **"Ghar wale ka kya kehna hai"
  / "What your family said"**.
- Header badge when there are unseen verdicts; clearing on view.
- New `ActivityType: 'family_verdict'` so it flows into the existing timeline.
- Dashboard: small badge on the Profile tab when verdicts are unseen.

**(d) Discovery nudge** — a one-time dismissible card on the board once the user
has ≥2 prospects at `kundli_matched` or beyond: *"Mummy ko dikhana hai? Mummy
Mode is here."*

### 4.2 Mummy (the viewer) — a different product for a different person

This is not a smaller dashboard. It is a separate, calmer surface.

**Join:** `/family/join?code=…`
- Warm framing before any auth: *"Komal ne aapko apna rishta shortlist dekhne ke
  liye invite kiya hai."* + what she'll be able to do.
- One button: **Continue with Google** (email/password below the fold). Reuse
  `AuthModal` with a `heading`/`subtitle` prop.
- Name confirm (prefilled from Google) → claim → `/family`.
- Expired/claimed/revoked code → friendly dead-end: *"Yeh link purana ho gaya.
  Komal se naya link maangiye."*

**List:** `/family`
- Header: *"Komal ka shortlist"*, owner switcher if she's linked to more than one.
- Persistent trust banner: *"Aap wahi dekh rahe hain jo Komal ne share kiya hai."*
- Large cards, one rishta each: photo, name + age, one line
  (profession · city · gotra), guna badge with a word not just a number
  (**26/36 · Shubh**), stage in plain Hinglish, and either her verdict or the
  prompt **"Aapka verdict?"**.
- No tabs, no filters, no search, no infinite scroll.

**Detail:** `/family/[shareId]`
- Photos carousel → parichay grid → kundli card (with the existing pandit
  disclaimer: *"Computerised calculation for reference only"*) → family details
  → current stage → verdict block.
- Verdict block: three large buttons — **Haan ✓ · Nahi ✕ · Baat karni hai 💬** —
  plus a comment box. Save → *"Komal ko bata diya."* Editable afterwards.
- Below: other members' verdicts side by side (Papa: Haan — "Achha ladka hai").
- Nothing destructive is reachable anywhere in this surface.

**Non-negotiable UI rules for this audience** (this is where most parent-facing
features fail):
- Body text ≥17px, tap targets ≥48px, high contrast, generous spacing.
- **Hinglish (Roman) by default, English toggle** stored in localStorage. A
  small `src/lib/family-copy.ts` with two dictionaries — not a full i18n stack.
  Devanagari is a v2 item.
- Zero product jargon: *rishta*, *ladka/ladki*, *kundli* — never "prospect",
  "compatibility score", "pipeline", "stage".
- Every number carries a word. `26/36` alone means nothing to her.
- No notifications exist, so the owner gets a **"Nudge mummy"** WhatsApp button
  instead. (Push via FCM is a v2 item.)

---

## 5. Edge cases to specify up front

| Case | Behaviour |
|---|---|
| Invite expires | 7 days, single use; owner can regenerate |
| Owner invites themselves | Blocked with a clear message |
| Viewer already has a seeker account | Allowed; "Family view" appears in their dashboard |
| Owner unshares a rishta | Mirror + all its verdicts deleted; card vanishes from her list; open detail shows *"Yeh rishta ab shared nahi hai"* |
| Owner removes a member | Link deleted → all shares become unreadable to them instantly; their verdicts are deleted |
| Last member removed | Reconciler deletes every mirror and clears `isShared` |
| Prospect deleted | `deleteProspect()` also deletes share, media, verdicts |
| **Owner deletes account** | `deleteAllUserData()` **must** also delete shares, media, verdicts, links and invites — DPDPA compliance, not optional |
| Viewer wants out | Self-serve "Remove my access" deletes their links and verdicts |
| Two members verdict simultaneously | Separate docs keyed by uid — no conflict by construction |

---

## 6. Legal / privacy

Sharing a prospect's photos and biodata with a third party is processing another
person's data. `MEMORY.md` records that Terms/Privacy were finalised to DPDPA
copy in July 2026 — this is an **edit**, not new drafting:

- Privacy policy: a "Family sharing" clause — what is shared, with whom, that
  the user controls it per-rishta, and that access is revocable.
- Share sheet: a one-line reminder that these are someone else's details.
- Keep the kundli disclaimer visible in mummy's view too.

---

## 7. Gating

Add `canUseFamilySharing(profile)` to `src/lib/trial.ts`, mirroring
`hasCompareAccess()`: returns `true` while `PAYMENTS_ENABLED === false`. When
payments return, the "Roka Ready members first" promise is a one-line change.

---

## 8. Files

**New**
- `src/types/family.ts` — `FamilyInvite`, `FamilyLink`, `SharedProspect`,
  `FamilyVerdict`, `RELATION_LABELS`, `VERDICT_OPTIONS`
- `src/lib/family-share.ts` — allowlist snapshot builder, share/unshare, sync,
  reconcile, invite create/claim/revoke, verdict save, subscriptions
- `src/lib/family-copy.ts` — Hinglish/English strings
- `src/lib/family-guard.ts` — `resolveHome(uid)`
- `src/app/family/layout.tsx`, `page.tsx`, `[shareId]/page.tsx`,
  `join/page.tsx`, `family.css`
- `src/components/family/ShareSheet.tsx`, `FamilyMembersCard.tsx`,
  `VerdictBlock.tsx`, `FamilyVerdictsSection.tsx`, `MummyPreview.tsx`

**Modified**
- `firestore.rules` — three new top-level blocks; `users/{uid}` untouched
- `firestore.indexes.json` — `sharedProspects (ownerUid ASC, sharedAt DESC)`,
  `familyLinks (viewerUid ASC, createdAt DESC)`,
  `familyLinks (ownerUid ASC, createdAt DESC)`
- `src/types/index.ts` — `Prospect.isShared?`, `ActivityType += 'family_verdict'`
- `src/lib/firestore.ts` — cleanup in `deleteProspect()` and `deleteAllUserData()`
- `src/lib/trial.ts` — `canUseFamilySharing()`
- `src/app/dashboard/page.tsx` — Family access card, unseen badge, nudge card
- `src/app/prospects/[id]/page.tsx` — header Share button, "What your family said"
- `src/components/AuthModal.tsx` — optional `heading`/`subtitle` props
- `src/app/mummy-mode/content.ts` + `page.tsx` — flip "Coming soon · Join the
  waitlist" (and the dead `#waitlist` anchor) to a live CTA; update metadata
  description which currently ends "Coming soon."
- Privacy policy copy

---

## 9. Build order

| Phase | Scope | Ships? |
|---|---|---|
| **0** | Types, `family-share.ts` skeleton, rules, indexes — deploy rules & indexes first | no |
| **1** | Owner side: invite create / share / revoke, Family access card, share sheet | behind flag |
| **2** | Viewer side: `/family/join`, `/family`, `/family/[shareId]` read-only | behind flag |
| **3** | Verdicts both directions + activity log + unseen badges | behind flag |
| **4** | Reconciler, deletion & revocation cleanup, `deleteAllUserData` | behind flag |
| **5** | Polish: preview-as-mummy, Hinglish toggle, empty states, nudge card, analytics, marketing flip, privacy copy | **launch** |

Phases 1–4 behind a `FAMILY_SHARING_ENABLED` flag in `src/lib/config.ts`, so
partial work can merge to main safely.

---

## 10. Testing

There is no test infrastructure in the repo today. The rules are the one place
where a mistake is catastrophic and un-noticeable, so:

- **Strongly recommended:** add `@firebase/rules-unit-testing` (dev dependency
  only) with a focused suite. Minimum cases:
  - a stranger cannot read any `sharedProspects` doc
  - a linked viewer **cannot** read the owner's `users/{uid}/prospects/*`
  - a viewer cannot write a verdict as another viewer
  - a viewer cannot create a `familyLinks` doc without a claimed invite
  - a revoked/expired invite cannot be claimed
  - after link deletion, reads fail immediately
- **Snapshot allowlist test:** feed a `Prospect` with every private field
  populated into `buildShareSnapshot()` and assert none appear in the output.
  This is the regression guard for future field additions.
- **Manual QA:** run the whole flow on a real second Google account on a phone,
  including revoke-while-she-has-the-page-open.

---

## 11. Analytics (no PII, per `src/lib/analytics.ts` rules)

`family_invite_created` {relation} · `family_invite_claimed` ·
`family_share_toggled` {shared} · `family_verdict_given` {verdict, relation} ·
`family_view_opened` · `family_member_removed` · `family_preview_opened`

---

## 12. Explicitly out of scope for v1

Push/email notifications (needs FCM) · Devanagari UI · per-member targeting of
individual rishtas (all members see all shared rishtas) · mummy adding her own
rishtas · chat threads on a rishta · sharing the Compare matrix in any form.

---

## 13. Open decisions

1. **Login vs. no-login link.** The plan follows the marketing promise (real
   login). A no-login capability link would be lower friction but cannot
   attribute verdicts and is forwardable — a real privacy risk given it exposes
   a third party's photos. Recommend keeping login.
2. **Phone number.** Excluded from the mirror. Mummy will ask for it. Could
   become a third per-share toggle alongside birth details.
3. **Per-member targeting.** v1 shares to *all* linked members at once. Adding
   `viewerUids` to the mirror later is backward-compatible.
