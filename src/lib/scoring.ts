import { UserProfile, Prospect, NAKSHATRAS } from '@/types';

// ─── Lookup tables ────────────────────────────────────────────────────────────

const GANA_MAP: Record<number, string> = {
  0: 'Deva', 1: 'Manushya', 2: 'Deva', 3: 'Manushya', 4: 'Deva', 5: 'Rakshasa',
  6: 'Deva', 7: 'Deva', 8: 'Rakshasa', 9: 'Rakshasa', 10: 'Manushya', 11: 'Manushya',
  12: 'Deva', 13: 'Rakshasa', 14: 'Deva', 15: 'Rakshasa', 16: 'Deva', 17: 'Rakshasa',
  18: 'Rakshasa', 19: 'Manushya', 20: 'Manushya', 21: 'Deva', 22: 'Deva', 23: 'Rakshasa',
  24: 'Manushya', 25: 'Manushya', 26: 'Deva',
};

const NADI_MAP: Record<number, string> = {
  0: 'Aadi', 1: 'Madhya', 2: 'Antya', 3: 'Antya', 4: 'Madhya', 5: 'Aadi',
  6: 'Aadi', 7: 'Madhya', 8: 'Antya', 9: 'Antya', 10: 'Madhya', 11: 'Aadi',
  12: 'Aadi', 13: 'Madhya', 14: 'Antya', 15: 'Antya', 16: 'Madhya', 17: 'Aadi',
  18: 'Aadi', 19: 'Madhya', 20: 'Antya', 21: 'Antya', 22: 'Madhya', 23: 'Aadi',
  24: 'Aadi', 25: 'Madhya', 26: 'Antya',
};

const VARNA_MAP: Record<number, number> = {
  0: 3, 1: 0, 2: 1, 3: 3, 4: 3, 5: 2, 6: 3, 7: 3, 8: 0, 9: 0, 10: 3, 11: 1,
  12: 3, 13: 1, 14: 3, 15: 3, 16: 0, 17: 0, 18: 0, 19: 3, 20: 1, 21: 3, 22: 0,
  23: 2, 24: 2, 25: 1, 26: 3,
};

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

export function getAshtakootBreakdown(userNakshatra: number, prospectNakshatra: number): KootScore[] {
  const u = userNakshatra;
  const p = prospectNakshatra;
  const uName = NAKSHATRAS[u];
  const pName = NAKSHATRAS[p];
  const diff = Math.abs(u - p);

  // 1. Varna (1 pt)
  const varnaScore = VARNA_MAP[p] >= VARNA_MAP[u] ? 1 : 0;
  const varnaLabels = ['Shudra', 'Vaishya', 'Kshatriya', 'Brahmin'];

  // 2. Vashya (2 pts)
  const vashyaScore = diff <= 2 || diff >= 25 ? 2 : diff <= 6 ? 1 : 0;

  // 3. Tara (3 pts)
  const taraVal = ((p - u + 27) % 27) % 9;
  const taraScore = [1, 3, 5, 7].includes(taraVal) ? 3 : taraVal === 0 ? 1.5 : 0;
  const taraFriendly = [1, 3, 5, 7].includes(taraVal) ? 'Favourable' : taraVal === 0 ? 'Neutral' : 'Unfavourable';

  // 4. Yoni (4 pts)
  const yoniScore = diff === 0 ? 4 : diff <= 2 ? 3 : diff <= 6 ? 2 : 0;

  // 5. Graha Maitri (5 pts)
  const gmScore = diff <= 3 ? 5 : diff <= 6 ? 3 : 1;

  // 6. Gana (6 pts)
  const uGana = GANA_MAP[u];
  const pGana = GANA_MAP[p];
  let ganaScore = 0;
  let ganaDetail = '';
  if (uGana === pGana) { ganaScore = 6; ganaDetail = 'Same Gana — ideal match'; }
  else if (uGana === 'Deva' && pGana === 'Manushya') { ganaScore = 5; ganaDetail = 'Deva + Manushya — compatible'; }
  else if (uGana === 'Manushya' && pGana === 'Deva') { ganaScore = 1; ganaDetail = 'Manushya + Deva — weak match'; }
  else { ganaScore = 0; ganaDetail = `${uGana} + ${pGana} — incompatible`; }

  // 7. Bhakut (7 pts)
  const bhakutPos = ((p - u + 27) % 27) + 1;
  const bhakutBad = [6, 8, 9, 12].includes(bhakutPos);
  const bhakutScore = bhakutBad ? 0 : 7;
  const bhakutDetail = bhakutBad
    ? `Position ${bhakutPos} — inauspicious Bhakut dosha`
    : `Position ${bhakutPos} — auspicious`;

  // 8. Nadi (8 pts)
  const uNadi = NADI_MAP[u];
  const pNadi = NADI_MAP[p];
  const nadiScore = uNadi !== pNadi ? 8 : 0;
  const nadiDetail = uNadi !== pNadi ? `${uNadi} + ${pNadi} — different Nadi (good)` : `Both ${uNadi} Nadi — Nadi dosha`;

  const status = (pts: number, max: number): MatchStatus =>
    pts === max ? 'full' : pts > 0 ? 'partial' : 'miss';

  return [
    {
      name: 'Varna',
      meaning: 'Spiritual compatibility',
      pts: varnaScore, maxPts: 1,
      status: status(varnaScore, 1),
      userVal: varnaLabels[VARNA_MAP[u]],
      prospectVal: varnaLabels[VARNA_MAP[p]],
      detail: varnaScore === 1 ? "Prospect's Varna is equal or higher" : "Prospect's Varna is lower",
    },
    {
      name: 'Vashya',
      meaning: 'Mutual attraction',
      pts: vashyaScore, maxPts: 2,
      status: status(vashyaScore, 2),
      userVal: uName, prospectVal: pName,
      detail: vashyaScore === 2 ? 'Strong mutual attraction' : vashyaScore === 1 ? 'Moderate attraction' : 'Weak attraction',
    },
    {
      name: 'Tara',
      meaning: 'Birth star compatibility',
      pts: taraScore, maxPts: 3,
      status: status(taraScore, 3),
      userVal: uName, prospectVal: pName,
      detail: `Tara position ${taraVal} — ${taraFriendly}`,
    },
    {
      name: 'Yoni',
      meaning: 'Biological compatibility',
      pts: yoniScore, maxPts: 4,
      status: status(yoniScore, 4),
      userVal: uName, prospectVal: pName,
      detail: yoniScore === 4 ? 'Same Yoni — perfect' : yoniScore >= 2 ? 'Friendly Yoni' : 'Unfriendly Yoni',
    },
    {
      name: 'Graha Maitri',
      meaning: 'Planetary friendship',
      pts: gmScore, maxPts: 5,
      status: status(gmScore, 5),
      userVal: uName, prospectVal: pName,
      detail: gmScore === 5 ? 'Strong planetary bond' : gmScore === 3 ? 'Neutral planetary bond' : 'Weak planetary bond',
    },
    {
      name: 'Gana',
      meaning: 'Temperament match',
      pts: ganaScore, maxPts: 6,
      status: status(ganaScore, 6),
      userVal: uGana, prospectVal: pGana,
      detail: ganaDetail,
    },
    {
      name: 'Bhakut',
      meaning: 'Emotional compatibility',
      pts: bhakutScore, maxPts: 7,
      status: status(bhakutScore, 7),
      userVal: uName, prospectVal: pName,
      detail: bhakutDetail,
    },
    {
      name: 'Nadi',
      meaning: 'Health & lineage',
      pts: nadiScore, maxPts: 8,
      status: status(nadiScore, 8),
      userVal: uNadi, prospectVal: pNadi,
      detail: nadiDetail,
    },
  ];
}

export function calculateGunaScore(userNakshatra: number, prospectNakshatra: number): number {
  const total = getAshtakootBreakdown(userNakshatra, prospectNakshatra)
    .reduce((sum, k) => sum + k.pts, 0);
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
