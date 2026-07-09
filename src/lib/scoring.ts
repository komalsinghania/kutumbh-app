import { UserProfile, Prospect } from '@/types';
import { calculateAshtakoot } from './kundli';

// ─── Lookup tables ────────────────────────────────────────────────────────────

const INCOME_ORDER: Record<string, number> = {
  '< 5 LPA': 0, '5-10': 1, '10-20': 2, '20-35': 3, '35-50': 4, '50+': 5,
};

const INCOME_PREF_ORDER: Record<string, number> = {
  'No Preference': -1, '5+': 1, '10+': 2, '20+': 3, '35+': 4, '50+': 5,
};

// ─── Breakdown types ──────────────────────────────────────────────────────────

export type MatchStatus = 'full' | 'partial' | 'miss';

export interface CompatCriterion {
  label: string;
  status: MatchStatus;
  pts: number;
  maxPts: number;
  userVal: string;
  prospectVal: string;
  detail: string;
}

export interface KootScore {
  name: string;
  meaning: string;
  pts: number;
  maxPts: number;
  status: MatchStatus;
  userVal: string;
  prospectVal: string;
  detail: string;
}

// ─── Ashtakoot breakdown ──────────────────────────────────────────────────────

// Both the stored guna score and the on-screen breakdown come from the single
// Ashtakoot engine in kundli.ts, so the total always equals the sum of the 8
// kootas shown to the user. Pass the Moon-sign (rashi) index wherever available;
// the koots that depend on rashi (Varna, Vashya, Graha Maitri, Bhakut) need it.
export function getAshtakootBreakdown(
  userNakshatra: number,
  prospectNakshatra: number,
  userRashi?: number,
  prospectRashi?: number,
): KootScore[] {
  return calculateAshtakoot(userNakshatra, prospectNakshatra, userRashi, prospectRashi).koots;
}

export function calculateGunaScore(
  userNakshatra: number,
  prospectNakshatra: number,
  userRashi?: number,
  prospectRashi?: number,
): number {
  const { total } = calculateAshtakoot(userNakshatra, prospectNakshatra, userRashi, prospectRashi);
  return Math.round(Math.min(36, Math.max(0, total)));
}

// ─── Compatibility breakdown ──────────────────────────────────────────────────

export function getCompatBreakdown(user: UserProfile, prospect: Prospect): CompatCriterion[] {
  const criteria: CompatCriterion[] = [];

  // Age (15 pts)
  const inRange = prospect.age >= user.prefAgeMin && prospect.age <= user.prefAgeMax;
  const ageOff = inRange ? 0 : Math.min(
    Math.abs(prospect.age - user.prefAgeMin),
    Math.abs(prospect.age - user.prefAgeMax)
  );
  const agePts = inRange ? 15 : ageOff <= 2 ? 8 : 0;
  criteria.push({
    label: 'Age',
    status: inRange ? 'full' : agePts > 0 ? 'partial' : 'miss',
    pts: agePts, maxPts: 15,
    userVal: `${user.prefAgeMin}–${user.prefAgeMax} yrs`,
    prospectVal: prospect.age ? `${prospect.age} yrs` : 'Unknown',
    detail: inRange
      ? `In your preferred range (${user.prefAgeMin}–${user.prefAgeMax})`
      : agePts > 0
      ? `${ageOff} yr outside your range — partial`
      : `Outside preferred range by ${ageOff} yrs`,
  });

  // City (15 pts)
  const nocityPref = !user.prefCities || user.prefCities.length === 0;
  const cityMatch = nocityPref || user.prefCities.some(c => c.toLowerCase().trim() === prospect.city?.toLowerCase().trim());
  const cityPts = cityMatch ? 15 : 0;
  criteria.push({
    label: 'City',
    status: cityMatch ? 'full' : 'miss',
    pts: cityPts, maxPts: 15,
    userVal: nocityPref ? 'Any city' : user.prefCities.join(', '),
    prospectVal: prospect.city || 'Unknown',
    detail: nocityPref
      ? 'No city preference set'
      : cityMatch
      ? `Matches your preferred city`
      : `Not in your preferred cities`,
  });

  // Diet (12 pts)
  const sameDiet = prospect.diet === user.diet;
  const crossVeg = (user.diet === 'Pure Veg' && prospect.diet === 'Jain') ||
    (user.diet === 'Jain' && prospect.diet === 'Pure Veg');
  const dietPts = sameDiet ? 12 : crossVeg ? 8 : 0;
  criteria.push({
    label: 'Diet',
    status: sameDiet ? 'full' : crossVeg ? 'partial' : 'miss',
    pts: dietPts, maxPts: 12,
    userVal: user.diet || 'Not set',
    prospectVal: prospect.diet || 'Unknown',
    detail: sameDiet
      ? `Both ${user.diet}`
      : crossVeg
      ? 'Pure Veg / Jain crossover — compatible'
      : `You are ${user.diet}, prospect is ${prospect.diet || 'unknown'}`,
  });

  // Family type (10 pts)
  const noFamPref = user.prefFamily === 'No Preference';
  const famMatch = noFamPref || prospect.familyType === user.prefFamily;
  const famPts = famMatch ? 10 : 0;
  criteria.push({
    label: 'Family Type',
    status: famMatch ? 'full' : 'miss',
    pts: famPts, maxPts: 10,
    userVal: user.prefFamily,
    prospectVal: prospect.familyType || 'Unknown',
    detail: noFamPref
      ? 'No preference set'
      : famMatch
      ? `Both prefer ${user.prefFamily}`
      : `You prefer ${user.prefFamily}, prospect is ${prospect.familyType || 'unknown'}`,
  });

  // Manglik (10 pts)
  const sameManglik = prospect.manglik === user.manglik;
  const partialManglik =
    (prospect.manglik === 'Partial' && user.manglik !== 'No') ||
    (user.manglik === 'Partial' && prospect.manglik !== 'No') ||
    prospect.manglik === "Don't Know" || user.manglik === "Don't Know";
  const manglikPts = sameManglik ? 10 : partialManglik ? 5 : 0;
  criteria.push({
    label: 'Manglik',
    status: sameManglik ? 'full' : partialManglik ? 'partial' : 'miss',
    pts: manglikPts, maxPts: 10,
    userVal: user.manglik || 'Not set',
    prospectVal: prospect.manglik || 'Unknown',
    detail: sameManglik
      ? `Both ${user.manglik}`
      : partialManglik
      ? 'Partial compatibility'
      : `Manglik mismatch — you: ${user.manglik}, prospect: ${prospect.manglik}`,
  });

  // Education (10 pts)
  const highEdu = ['CA-CS-CMA', 'MBA', 'Doctor', 'PhD'];
  const medEdu = ['Engineer', 'Post Graduate'];
  const isHigh = highEdu.some(e => prospect.education?.includes(e));
  const isMed = medEdu.some(e => prospect.education?.includes(e));
  const eduPts = isHigh ? 10 : isMed ? 7 : 4;
  criteria.push({
    label: 'Education',
    status: isHigh ? 'full' : isMed ? 'partial' : 'partial',
    pts: eduPts, maxPts: 10,
    userVal: 'Professional degree preferred',
    prospectVal: prospect.education || 'Unknown',
    detail: isHigh
      ? `Professional degree (${prospect.education})`
      : isMed
      ? `Mid-level qualification (${prospect.education})`
      : `Basic qualification (${prospect.education || 'unknown'})`,
  });

  // Income (13 pts)
  const prefLevel = INCOME_PREF_ORDER[user.prefIncome] ?? -1;
  const prospectLevel = INCOME_ORDER[prospect.income] ?? 0;
  const noPref = prefLevel === -1;
  const incomeMatch = noPref || prospectLevel >= prefLevel;
  const incomeClose = !incomeMatch && prospectLevel === prefLevel - 1;
  const incomePts = noPref ? 13 : incomeMatch ? 13 : incomeClose ? 6 : 0;
  criteria.push({
    label: 'Income',
    status: (noPref || incomeMatch) ? 'full' : incomeClose ? 'partial' : 'miss',
    pts: incomePts, maxPts: 13,
    userVal: noPref ? 'No preference' : `Min ${user.prefIncome} LPA`,
    prospectVal: prospect.income || 'Unknown',
    detail: noPref
      ? 'No income preference set'
      : incomeMatch
      ? `Meets your minimum of ${user.prefIncome} LPA`
      : incomeClose
      ? `Just below your minimum — close match`
      : `Below your minimum of ${user.prefIncome} LPA`,
  });

  return criteria;
}

export function calculateCompatScore(user: UserProfile, prospect: Prospect): number {
  const total = getCompatBreakdown(user, prospect).reduce((sum, c) => sum + c.pts, 0);
  return Math.round((total / 85) * 100);
}

export function calculateOverallScore(gunaScore: number | null, compatScore: number | null): number | null {
  if (gunaScore === null && compatScore === null) return null;
  const guna = gunaScore !== null ? (gunaScore / 36) * 50 : 25;
  const compat = compatScore !== null ? (compatScore / 100) * 50 : 25;
  return Math.round(guna + compat);
}

// ─── Dealbreaker check ────────────────────────────────────────────────────────

export interface DealbreakersCheckItem {
  label: string;
  met: boolean;
  detail: string;
}

export function getDealbreakersCheck(user: UserProfile, prospect: Prospect): DealbreakersCheckItem[] {
  const db = user.dealbreakers || [];
  const result: DealbreakersCheckItem[] = [];

  if (db.includes('Joint Family Only')) {
    const met = prospect.familyType === 'Joint';
    result.push({
      label: 'Joint Family Only',
      met,
      detail: met ? 'Prospect is from a joint family' : `Prospect's family: ${prospect.familyType || 'Unknown'}`,
    });
  }

  if (db.includes('Nuclear Family Only')) {
    const met = prospect.familyType === 'Nuclear';
    result.push({
      label: 'Nuclear Family Only',
      met,
      detail: met ? 'Prospect is from a nuclear family' : `Prospect's family: ${prospect.familyType || 'Unknown'}`,
    });
  }

  if (db.includes('Manglik Mismatch')) {
    const uM = user.manglik;
    const pM = prospect.manglik;
    const conflict = (uM === 'Yes' && pM === 'No') || (uM === 'No' && pM === 'Yes');
    result.push({
      label: 'Manglik Mismatch',
      met: !conflict,
      detail: !conflict
        ? `Manglik compatible — you: ${uM || '?'}, prospect: ${pM || '?'}`
        : `Mismatch — you: ${uM}, prospect: ${pM}`,
    });
  }

  if (db.includes('Age Gap More Than 5 Years')) {
    const gap = Math.abs((user.age || 0) - (prospect.age || 0));
    const met = gap <= 5;
    result.push({
      label: 'Age Gap > 5 Years',
      met,
      detail: met ? `Age gap: ${gap} yr${gap !== 1 ? 's' : ''} — within limit` : `Age gap: ${gap} yrs — exceeds 5 years`,
    });
  }

  if (db.includes('Must Live in My City')) {
    const met = !!prospect.city && prospect.city.toLowerCase().trim() === (user.city || '').toLowerCase().trim();
    result.push({
      label: 'Must Live in My City',
      met,
      detail: met ? `Both in ${user.city}` : `Prospect is in ${prospect.city || 'Unknown'}`,
    });
  }

  if (db.includes('Must Be Financially Independent')) {
    const lowIncome = !prospect.income || prospect.income === '< 5 LPA';
    result.push({
      label: 'Must Be Financially Independent',
      met: !lowIncome,
      detail: !lowIncome ? `Income: ${prospect.income}` : `Income appears low (${prospect.income || 'not set'})`,
    });
  }

  return result;
}
