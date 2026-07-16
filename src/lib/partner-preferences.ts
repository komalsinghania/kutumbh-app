// ─────────────────────────────────────────────────────────────────────────────
// "What do you want in a partner" — structured partner preferences.
//
// Replaces the old free-form "non-negotiables" chips with 15 single-select
// questions grouped into themed sections. The answers are captured and shown
// as-is; to keep the existing scoring engine and prospect dealbreaker-checks
// working unchanged, `deriveLegacyPreferenceFields()` maps the answers back to
// the legacy UserProfile fields (prefFamily / prefAge* / prefCities /
// prefIncome / dealbreakers) that scoring already reads.
// ─────────────────────────────────────────────────────────────────────────────

export type PartnerQuestionId =
  | 'location'
  | 'familySetup'
  | 'financialIndependence'
  | 'afterMarriage'
  | 'previousMarriage'
  | 'horoscope'
  | 'community'
  | 'ageDifference'
  | 'children'
  | 'diet'
  | 'smoking'
  | 'alcohol'
  | 'careerRespect'
  | 'household'
  | 'independence';

/** The user's answers: question id → chosen option label. All optional so the
 *  whole section is skippable and old profiles (without it) still load. */
export type PartnerPreferences = Partial<Record<PartnerQuestionId, string>>;

export interface PartnerQuestion {
  id: PartnerQuestionId;
  label: string;
  options: string[];
  /** A single-option question rendered as an on/off toggle (e.g. Career Respect). */
  toggle?: boolean;
}

export interface PartnerSection {
  label: string;
  questions: PartnerQuestion[];
}

// Grouped for a clean, scannable single-page layout.
export const PARTNER_SECTIONS: PartnerSection[] = [
  {
    label: 'Location & Lifestyle',
    questions: [
      { id: 'location', label: 'Preferred Location', options: ['Same City', 'Same State', 'Anywhere in India', 'Abroad', 'Flexible'] },
      { id: 'diet', label: 'Diet', options: ['Vegetarian', 'Eggetarian', 'Non-Vegetarian', "Doesn't Matter"] },
      { id: 'smoking', label: 'Smoking', options: ['Non-Smoker', "Doesn't Matter"] },
      { id: 'alcohol', label: 'Alcohol', options: ['Non-Drinker', 'Occasionally', "Doesn't Matter"] },
    ],
  },
  {
    label: 'Family & Children',
    questions: [
      { id: 'familySetup', label: 'Family Setup', options: ['Nuclear', 'Joint', 'Either'] },
      { id: 'children', label: 'Children', options: ['Yes', 'No', 'Undecided'] },
      { id: 'previousMarriage', label: 'Previous Marriage', options: ['Comfortable', 'Prefer Never Married'] },
    ],
  },
  {
    label: 'Career & Finance',
    questions: [
      { id: 'financialIndependence', label: 'Financial Independence', options: ['Important', 'Preferred', "Doesn't Matter"] },
      { id: 'afterMarriage', label: 'After Marriage', options: ['Should Continue Working', "Doesn't Matter", 'Prefer Homemaker'] },
    ],
  },
  {
    label: 'Beliefs & Match',
    questions: [
      { id: 'community', label: 'Religion / Caste / Community', options: ['Same Religion / Caste / Community', 'Open'] },
      { id: 'horoscope', label: 'Horoscope', options: ['Must Match', 'Preferred', "Doesn't Matter"] },
      { id: 'ageDifference', label: 'Age Difference', options: ['Up to 3 Years', 'Up to 5 Years', 'No Preference'] },
    ],
  },
  {
    label: 'Values & Personality',
    questions: [
      { id: 'careerRespect', label: 'Career Respect', options: ['Must Respect My Career'], toggle: true },
      { id: 'household', label: 'Household Responsibilities', options: ['Shared Equally', 'Flexible'] },
      { id: 'independence', label: 'Independence', options: ['Independent Thinker', 'Family-Oriented', 'Balanced'] },
    ],
  },
];

export const PARTNER_QUESTIONS: PartnerQuestion[] = PARTNER_SECTIONS.flatMap(s => s.questions);

/** Number of questions answered — used for a subtle progress hint. */
export function countAnswered(prefs: PartnerPreferences | undefined): number {
  if (!prefs) return 0;
  return PARTNER_QUESTIONS.reduce((n, q) => (prefs[q.id] ? n + 1 : n), 0);
}

// ── Legacy-field derivation ─────────────────────────────────────────────────
// Scoring (getCompatBreakdown) and the prospect dealbreaker-check read these
// legacy fields. We keep them populated from the new answers so nothing in the
// scoring path has to change. Income has no equivalent question in the new set,
// so it defaults to "No Preference" (income simply stops filtering).

export interface LegacyPreferenceFields {
  prefAgeMin: number;
  prefAgeMax: number;
  prefCities: string[];
  prefIncome: 'No Preference';
  prefFamily: 'Joint' | 'Nuclear' | 'No Preference';
  dealbreakers: string[];
}

function ageRange(ageDifference: string | undefined, userAge: number): { min: number; max: number } {
  const a = Number.isFinite(userAge) && userAge >= 18 ? userAge : 28;
  if (ageDifference === 'Up to 3 Years') return { min: Math.max(18, a - 3), max: a + 3 };
  if (ageDifference === 'Up to 5 Years') return { min: Math.max(18, a - 5), max: a + 5 };
  return { min: 18, max: 99 }; // "No Preference" / unanswered
}

export function deriveLegacyPreferenceFields(
  prefs: PartnerPreferences,
  ctx: { age: number; city: string },
): LegacyPreferenceFields {
  const family: LegacyPreferenceFields['prefFamily'] =
    prefs.familySetup === 'Nuclear' ? 'Nuclear' :
    prefs.familySetup === 'Joint' ? 'Joint' : 'No Preference';

  const { min, max } = ageRange(prefs.ageDifference, ctx.age);

  // Only "Same City" maps cleanly to the city-list constraint scoring uses;
  // broader choices (state / anywhere / abroad / flexible) mean no constraint.
  const cities = prefs.location === 'Same City' && ctx.city.trim() ? [ctx.city.trim()] : [];

  // Rebuild the legacy dealbreaker strings that the prospect check implements.
  const dealbreakers: string[] = [];
  if (prefs.familySetup === 'Joint') dealbreakers.push('Joint Family Only');
  if (prefs.familySetup === 'Nuclear') dealbreakers.push('Nuclear Family Only');
  if (prefs.location === 'Same City') dealbreakers.push('Must Live in My City');
  if (prefs.ageDifference === 'Up to 3 Years' || prefs.ageDifference === 'Up to 5 Years') dealbreakers.push('Age Gap More Than 5 Years');
  if (prefs.financialIndependence === 'Important') dealbreakers.push('Must Be Financially Independent');
  if (prefs.previousMarriage === 'Prefer Never Married') dealbreakers.push('Divorced Not Acceptable');
  if (prefs.community === 'Same Religion / Caste / Community') dealbreakers.push('Inter-Caste Not Acceptable');
  if (prefs.horoscope === 'Must Match') dealbreakers.push('Manglik Mismatch');

  return { prefAgeMin: min, prefAgeMax: max, prefCities: cities, prefIncome: 'No Preference', prefFamily: family, dealbreakers };
}
