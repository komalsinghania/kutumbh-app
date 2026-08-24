// ─────────────────────────────────────────────────────────────────────────────
// Mummy Mode — copy for the family view.
//
// This surface is read by someone who has never used the app, is often over 55,
// and is reading on a phone in bright light. Two rules:
//   1. Hinglish (Roman script) is the default. English is a toggle, not a
//      fallback — she should not have to translate anything to feel included.
//   2. No product jargon. It is a "rishta", not a "prospect". There is no
//      "pipeline", no "compatibility score", no "stage".
//
// This is deliberately a two-dictionary lookup rather than a full i18n stack —
// only one surface is translated, and adding i18next for it would be overkill.
// ─────────────────────────────────────────────────────────────────────────────

export type FamilyLang = 'hi' | 'en';

export const FAMILY_LANG_KEY = 'rm_family_lang';

interface Copy {
  // Join
  joinTitle: (owner: string) => string;
  joinSubtitle: string;
  joinCta: string;
  joinNamePrompt: string;
  joinNamePlaceholder: string;
  joinNameCta: string;
  inviteExpired: string;
  /** Pass the sender's first name when we know it — on an unrecognised code we
   *  never loaded the invite, so there is no name to use. */
  inviteExpiredHelp: (owner?: string) => string;
  inviteClaimed: string;
  inviteSelf: string;

  // List
  listTitle: (owner: string) => string;
  listEmpty: (owner: string) => string;
  listEmptyHelp: string;
  trustBanner: (owner: string) => string;
  verdictPrompt: string;
  yourVerdict: string;
  rishtaCount: (n: number) => string;

  // Detail
  parichay: string;
  kundliMilan: string;
  kundliDisclaimer: string;
  familyDetails: string;
  birthDetails: string;
  whereThingsStand: string;
  yourTake: string;
  commentPlaceholder: string;
  save: string;
  saving: string;
  saved: (owner: string) => string;
  change: string;
  othersSaid: string;
  noLongerShared: string;
  back: string;

  // Fields
  fields: Record<string, string>;

  // Account
  signOut: string;
  removeAccess: string;
  removeAccessConfirm: (owner: string) => string;
  switchOwner: string;
}

const hi: Copy = {
  joinTitle: o => `${o} ne aapko invite kiya hai`,
  joinSubtitle:
    'Aap unke shortlist ke rishte dekh sakte hain — photo, biodata, kundli score aur family details. Aur apna verdict de sakte hain.',
  joinCta: 'Aage badhiye',
  joinNamePrompt: 'Aapka naam kya likhein?',
  joinNamePlaceholder: 'Jaise: Sunita Agarwal',
  joinNameCta: 'Shuru kijiye',
  inviteExpired: 'Yeh link purana ho gaya',
  inviteExpiredHelp: o => o
    ? `${o} se naya link maang lijiye.`
    : 'Jinhone yeh link bheja tha, unse naya link maang lijiye.',
  inviteClaimed: 'Yeh link pehle se use ho chuka hai',
  inviteSelf: 'Yeh aapka hi invite link hai.',

  listTitle: o => `${o} ka shortlist`,
  listEmpty: o => `${o} ne abhi tak koi rishta share nahi kiya`,
  listEmptyHelp: 'Jab woh share karenge, yahin dikhega. Aapko kuch karne ki zaroorat nahi.',
  trustBanner: o => `Aap wahi dekh rahe hain jo ${o} ne share kiya hai.`,
  verdictPrompt: 'Aapka verdict?',
  yourVerdict: 'Aapka verdict',
  rishtaCount: n => (n === 1 ? '1 rishta' : `${n} rishte`),

  parichay: 'Parichay',
  kundliMilan: 'Kundli Milan',
  kundliDisclaimer: 'Computer se nikala gaya score hai — sirf reference ke liye. Pandit ji se zaroor puchhiye.',
  familyDetails: 'Ghar-parivar',
  birthDetails: 'Janm vivaran',
  whereThingsStand: 'Abhi kya chal raha hai',
  yourTake: 'Aapka kya kehna hai?',
  commentPlaceholder: 'Kuch kehna hai? Yahan likhiye…',
  save: 'Bhej dijiye',
  saving: 'Bhej rahe hain…',
  saved: o => `${o} ko bata diya.`,
  change: 'Badalna hai?',
  othersSaid: 'Baaki ghar walon ne kya kaha',
  noLongerShared: 'Yeh rishta ab share nahi kiya gaya hai.',
  back: 'Wapas',

  fields: {
    age: 'Umar', city: 'Sheher', height: 'Lambai', education: 'Padhai',
    profession: 'Kaam', income: 'Aamdani', familyType: 'Parivar',
    diet: 'Khaan-paan', manglik: 'Manglik', gotra: 'Gotra', rashi: 'Rashi',
    hobbies: 'Shauk', fatherOcc: 'Pita ji ka kaam', motherOcc: 'Mata ji ka kaam',
    siblings: 'Bhai-behen', property: 'Jaydaad',
    dobDate: 'Janm tithi', dobTime: 'Janm samay', dobPlace: 'Janm sthan',
  },

  signOut: 'Sign out',
  removeAccess: 'Meri access hata dijiye',
  removeAccessConfirm: o => `${o} ka shortlist dikhna band ho jayega. Pakka?`,
  switchOwner: 'Kiska shortlist?',
};

const en: Copy = {
  joinTitle: o => `${o} has invited you`,
  joinSubtitle:
    "You'll be able to see the rishtas on their shortlist — photos, biodata, kundli score and family details — and leave your verdict.",
  joinCta: 'Continue',
  joinNamePrompt: 'What should we call you?',
  joinNamePlaceholder: 'e.g. Sunita Agarwal',
  joinNameCta: 'Get started',
  inviteExpired: 'This link has expired',
  inviteExpiredHelp: o => o
    ? `Ask ${o} to send you a fresh one.`
    : 'Ask whoever sent it for a fresh one.',
  inviteClaimed: 'This link has already been used',
  inviteSelf: 'This is your own invite link.',

  listTitle: o => `${o}'s shortlist`,
  listEmpty: o => `${o} hasn't shared any rishta yet`,
  listEmptyHelp: "When they do, it'll show up here. Nothing for you to do.",
  trustBanner: o => `You're seeing exactly what ${o} chose to share.`,
  verdictPrompt: 'Your verdict?',
  yourVerdict: 'Your verdict',
  rishtaCount: n => (n === 1 ? '1 rishta' : `${n} rishtas`),

  parichay: 'Introduction',
  kundliMilan: 'Kundli Milan',
  kundliDisclaimer: 'Computerised calculation, for reference only. Please consult a qualified pandit ji.',
  familyDetails: 'Family',
  birthDetails: 'Birth details',
  whereThingsStand: 'Where things stand',
  yourTake: 'What do you think?',
  commentPlaceholder: 'Anything you want to add?',
  save: 'Send',
  saving: 'Sending…',
  saved: o => `${o} has been told.`,
  change: 'Change',
  othersSaid: 'What the rest of the family said',
  noLongerShared: 'This rishta is no longer shared.',
  back: 'Back',

  fields: {
    age: 'Age', city: 'City', height: 'Height', education: 'Education',
    profession: 'Work', income: 'Income', familyType: 'Family',
    diet: 'Diet', manglik: 'Manglik', gotra: 'Gotra', rashi: 'Rashi',
    hobbies: 'Interests', fatherOcc: "Father's work", motherOcc: "Mother's work",
    siblings: 'Siblings', property: 'Property',
    dobDate: 'Date of birth', dobTime: 'Time of birth', dobPlace: 'Place of birth',
  },

  signOut: 'Sign out',
  removeAccess: 'Remove my access',
  removeAccessConfirm: o => `You'll stop seeing ${o}'s shortlist. Sure?`,
  switchOwner: 'Whose shortlist?',
};

export const FAMILY_COPY: Record<FamilyLang, Copy> = { hi, en };

// ── Plain-language stage labels ───────────────────────────────────────────────
// The app's own STAGE_LABELS carry emoji and product framing ("New Lead ✦").
// Mummy gets a sentence about what is actually happening.

export const FAMILY_STAGE_LABELS: Record<FamilyLang, Record<string, string>> = {
  hi: {
    new: 'Abhi shuruat hui hai',
    kundli_matched: 'Kundli mil chuki hai',
    call_done: 'Baat ho chuki hai',
    meeting_fixed: 'Milne ki baat chal rahi hai',
    interested: 'Dono taraf se haan hai',
    on_hold: 'Filhaal rukka hua hai',
    rejected: 'Yeh baat aage nahi badhi',
  },
  en: {
    new: 'Just added',
    kundli_matched: 'Kundli matched',
    call_done: 'They have spoken',
    meeting_fixed: 'A meeting is planned',
    interested: 'Both sides are interested',
    on_hold: 'On hold for now',
    rejected: 'This one did not go ahead',
  },
};

export function familyStageLabel(stage: string, lang: FamilyLang = 'hi'): string {
  return FAMILY_STAGE_LABELS[lang][stage] ?? FAMILY_STAGE_LABELS[lang].new;
}

/**
 * The pandit-friendly word for a guna score. Thresholds match the ones already
 * used in AshtakootBreakdown (28 / 21 / 18) so the two never disagree.
 */
export function gunaVerdictWord(score: number | null | undefined, lang: FamilyLang = 'hi'): string {
  if (score === null || score === undefined) return lang === 'hi' ? 'Nikala nahi gaya' : 'Not calculated';
  if (score >= 28) return lang === 'hi' ? 'Uttam' : 'Excellent';
  if (score >= 21) return lang === 'hi' ? 'Shubh' : 'Good';
  if (score >= 18) return lang === 'hi' ? 'Theek' : 'Average';
  return lang === 'hi' ? 'Kam' : 'Below average';
}
