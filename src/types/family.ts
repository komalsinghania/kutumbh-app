// ─────────────────────────────────────────────────────────────────────────────
// Mummy Mode — family sharing types.
//
// The whole feature rests on one rule: what the family can read lives in
// SEPARATE top-level collections holding a SANITISED COPY of the prospect.
// The private working material (flags, call logs, meeting ratings, the family
// scorecard, Compare) never leaves /users/{uid} — not hidden in the UI, but
// physically absent from every document a family member is allowed to read.
//
// Collections (see firestore.rules):
//   familyInvites/{code}                              — one-time invite links
//   familyLinks/{ownerUid}__{viewerUid}               — an accepted invitation
//   sharedProspects/{ownerUid}__{prospectId}          — the sanitised snapshot
//   sharedProspects/{shareId}/media/photos            — photos (heavy, separate)
//   sharedProspects/{shareId}/verdicts/{viewerUid}    — her take on the rishta
// ─────────────────────────────────────────────────────────────────────────────

/** How the viewer is related to the person doing the search. */
export const RELATION_LABELS = [
  'Mummy', 'Papa', 'Bhai', 'Didi', 'Bhabhi', 'Jiju', 'Chacha', 'Chachi',
  'Mama', 'Mami', 'Bua', 'Massi', 'Friend', 'Other',
] as const;

export type RelationLabel = typeof RELATION_LABELS[number];

export type VerdictValue = 'yes' | 'no' | 'discuss';

export const VERDICT_OPTIONS: {
  value: VerdictValue; icon: string; hi: string; en: string; color: string; bg: string; border: string;
}[] = [
  { value: 'yes',     icon: '✓', hi: 'Haan',           en: 'Yes',              color: '#2D6B4F', bg: 'rgba(45,107,79,0.10)',  border: 'rgba(45,107,79,0.35)' },
  { value: 'discuss', icon: '💬', hi: 'Baat karni hai', en: 'Need to discuss', color: '#b8892b', bg: 'rgba(184,137,43,0.10)', border: 'rgba(184,137,43,0.35)' },
  { value: 'no',      icon: '✕', hi: 'Nahi',           en: 'No',               color: '#8B2A2A', bg: 'rgba(139,42,42,0.10)',  border: 'rgba(139,42,42,0.35)' },
];

export const VERDICT_INFO: Record<VerdictValue, typeof VERDICT_OPTIONS[number]> =
  VERDICT_OPTIONS.reduce((acc, o) => { acc[o.value] = o; return acc; },
    {} as Record<VerdictValue, typeof VERDICT_OPTIONS[number]>);

/** A single-use invitation link. The document id IS the secret code. */
export interface FamilyInvite {
  code: string;
  ownerUid: string;
  ownerName: string;
  relationLabel: RelationLabel;
  status: 'pending' | 'claimed' | 'revoked';
  createdAt: number;
  expiresAt: number;
  claimedByUid?: string;
  claimedByName?: string;
  claimedAt?: number;
}

/** An accepted invitation: this viewer may read this owner's shared rishtas. */
export interface FamilyLink {
  id: string;               // `${ownerUid}__${viewerUid}`
  ownerUid: string;
  ownerName: string;
  viewerUid: string;
  viewerName: string;
  relationLabel: RelationLabel;
  inviteCode: string;
  createdAt: number;
  lastSeenAt?: number;
}

/**
 * The sanitised snapshot of a prospect, mirrored by the owner's client.
 *
 * ⚠️ Adding a field here is a privacy decision. It must also be added to the
 * allowlist in `buildShareSnapshot()` — and nothing reaches this document
 * except through that function.
 */
export interface SharedProspect {
  id: string;               // `${ownerUid}__${prospectId}`
  ownerUid: string;
  ownerName: string;
  prospectId: string;

  // ── Biodata (the parichay she'd be forwarded on WhatsApp anyway) ──
  name: string;
  age?: number;
  city?: string;
  height?: string;
  education?: string;
  profession?: string;
  income?: string;
  familyType?: string;
  diet?: string;
  manglik?: string;
  gotra?: string;
  rashi?: string;
  hobbies?: string[];

  // ── Family details — her home turf ──
  fatherOcc?: string;
  motherOcc?: string;
  siblings?: string;
  property?: string;

  // ── Kundli: the score only, never the working ──
  gunaScore?: number | null;
  gunaVerdict?: string;     // e.g. "Shubh" — the pandit-friendly word

  // ── Where things stand ──
  stage: string;            // internal enum, for ordering
  stageLabel: string;       // plain-language label shown to her

  photoCount: number;

  // Birth details are opt-in per rishta ("for pandit ji").
  includeBirthDetails?: boolean;
  dobDate?: string;
  dobTime?: string;
  dobPlace?: string;

  sharedAt: number;
  syncedAt: number;
  sourceUpdatedAt: number;
}

/** Photos live in their own document — three base64 images are ~800 KB and
 *  would make the list view unusable if inlined on every card. */
export interface SharedProspectMedia {
  photos: string[];
}

/** One family member's take on one rishta. Advisory — never a veto. */
export interface FamilyVerdict {
  viewerUid: string;
  viewerName: string;
  relationLabel: RelationLabel;
  verdict: VerdictValue;
  comment?: string;
  createdAt: number;
  updatedAt: number;
}

/** Verdict plus the share it belongs to — used by the owner's unseen badge.
 *  `prospectId` is denormalised onto the document so the owner can map a
 *  collection-group result back to a rishta without extra reads. */
export interface FamilyVerdictWithShare extends FamilyVerdict {
  shareId: string;
  prospectId: string;
}
