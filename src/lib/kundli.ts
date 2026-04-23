import * as Astronomy from 'astronomy-engine';

// ── Types ──────────────────────────────────────────────────────────────────

export interface BirthData {
  date: string;      // 'YYYY-MM-DD'
  time: string;      // 'HH:MM' (24h, local IST)
  lat: number;
  lng: number;
  tzOffset: number;  // hours (IST = 5.5)
}

export interface KundliResult {
  moonLongitudeTropical: number;
  moonLongitudeSidereal: number;
  ayanamsa: number;
  rashi: number;       // 0–11
  rashiName: string;
  nakshatra: number;   // 0–26
  nakshatraName: string;
  pada: number;        // 1–4
  nakshatraLord: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const RASHI_NAMES = [
  'Mesh (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)',
  'Karka (Cancer)', 'Simha (Leo)', 'Kanya (Virgo)',
  'Tula (Libra)', 'Vrishchika (Scorpio)', 'Dhanu (Sagittarius)',
  'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)',
];

export const RASHI_SHORT = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta',
  'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

const NAKSHATRA_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu',
  'Jupiter', 'Saturn', 'Mercury', 'Ketu', 'Venus', 'Sun',
  'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu',
  'Jupiter', 'Saturn', 'Mercury',
];

// ── Lahiri Ayanamsa ───────────────────────────────────────────────────────────
// Lahiri ayanamsa formula: 23°15' for J2000.0, precessing at ~50.3"/year
function lahiriAyanamsa(julianDate: number): number {
  const J2000 = 2451545.0;
  const T = (julianDate - J2000) / 36525.0; // Julian centuries from J2000
  // IAU precession rate ~50.2796"/year → degrees/century = 50.2796*100/3600
  const ayanamsa = 23.853 + 1.396819 * T + 0.0003086 * T * T;
  return ayanamsa;
}

// ── Core calculation ──────────────────────────────────────────────────────────

export function calculateKundli(birth: BirthData): KundliResult {
  const [year, month, day] = birth.date.split('-').map(Number);
  const [hour, minute] = birth.time.split(':').map(Number);

  // Convert local time to UTC
  const utcHour = hour + minute / 60 - birth.tzOffset;
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCHours(0, 0, 0, 0);
  utcDate.setTime(utcDate.getTime() + utcHour * 3600 * 1000);

  const astroTime = Astronomy.MakeTime(utcDate);

  // Get Moon's geocentric ecliptic longitude (tropical)
  const moonEq = Astronomy.GeoVector(Astronomy.Body.Moon, astroTime, false);
  const moonEcl = Astronomy.Ecliptic(moonEq);
  const tropicalLon = ((moonEcl.elon % 360) + 360) % 360;

  // Julian date for ayanamsa
  const jd = astroTime.tt + 2451545.0;
  const ayanamsa = lahiriAyanamsa(jd);

  // Sidereal longitude
  const siderealLon = ((tropicalLon - ayanamsa) + 360) % 360;

  // Rashi (sign): each rashi = 30°
  const rashi = Math.floor(siderealLon / 30);

  // Nakshatra: 27 nakshatras in 360°, each = 13°20' = 13.333...°
  const nakshatraFloat = siderealLon / (360 / 27);
  const nakshatra = Math.floor(nakshatraFloat);

  // Pada: each nakshatra has 4 padas
  const padaFloat = (nakshatraFloat - nakshatra) * 4;
  const pada = Math.floor(padaFloat) + 1;

  return {
    moonLongitudeTropical: tropicalLon,
    moonLongitudeSidereal: siderealLon,
    ayanamsa,
    rashi,
    rashiName: RASHI_SHORT[rashi],
    nakshatra,
    nakshatraName: NAKSHATRA_NAMES[nakshatra],
    pada,
    nakshatraLord: NAKSHATRA_LORDS[nakshatra],
  };
}

// ── Ashtakoot tables ──────────────────────────────────────────────────────────

// Varna: 0=Brahmin, 1=Kshatriya, 2=Vaishya, 3=Shudra
const VARNA: number[] = [
  3, 0, 3, 3, 1, 3, 2, 0, 3, 1, 2, 1,
  2, 1, 1, 0, 2, 0, 2, 2, 2, 0, 3, 3,
  0, 0, 0,
];

// Vashya: 0=Chatushpad, 1=Manav, 2=Vanchar, 3=Jalchar, 4=Keet
// Based on rashi (0-11)
const VASHYA_RASHI: number[] = [0, 0, 1, 3, 2, 1, 1, 4, 0, 2, 1, 3];

// Compatibility table for Vashya [a][b] = points (0, 0.5, 1, 1.5, 2)
const VASHYA_TABLE: number[][] = [
  [2, 1, 0, 1, 1], // Chatushpad
  [0, 2, 0, 0, 0], // Manav
  [1, 0, 2, 0, 1], // Vanchar
  [1, 0, 0, 2, 0], // Jalchar
  [0, 0, 1, 0, 2], // Keet
];

// Gana: 0=Deva, 1=Manav, 2=Rakshasa
const GANA: number[] = [
  0, 2, 0, 0, 0, 2, 0, 0, 2, 2, 2, 0,
  0, 2, 0, 0, 0, 2, 2, 0, 0, 0, 2, 2,
  1, 0, 0,
];

const GANA_TABLE: number[][] = [
  [6, 5, 0], // Deva
  [5, 6, 0], // Manav
  [0, 0, 6], // Rakshasa
];

// Nadi: 0=Aadi (Vata), 1=Madhya (Pitta), 2=Antya (Kapha)
const NADI: number[] = [
  0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2,
  0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2,
  0, 1, 2,
];

// Yoni: animal symbol for each nakshatra
// 0=Horse, 1=Elephant, 2=Sheep, 3=Snake, 4=Dog, 5=Cat, 6=Rat, 7=Cow,
// 8=Buffalo, 9=Tiger, 10=Hare/Deer, 11=Monkey, 12=Mongoose, 13=Lion
const YONI: number[] = [
  0, 1, 2, 3, 3, 4, 5, 6, 7, 6, 8, 7,
  9, 9, 10, 10, 11, 11, 4, 12, 5, 2, 0, 1,
  13, 8, 12,
];

// Yoni compatibility: same yoni = 4, friendly = 3, neutral = 2, enemy = 1, opposite = 0
// Opposite pairs (0 pts): Horse/Buffalo, Elephant/Lion, Sheep/Monkey, Snake/Mongoose, Dog/Hare, Cat/Rat, Cow/Tiger
const YONI_OPPOSITE: Record<number, number> = {
  0: 8, 8: 0,   // Horse-Buffalo
  1: 13, 13: 1, // Elephant-Lion
  2: 11, 11: 2, // Sheep-Monkey
  3: 12, 12: 3, // Snake-Mongoose
  4: 10, 10: 4, // Dog-Hare
  5: 6, 6: 5,   // Cat-Rat
  7: 9, 9: 7,   // Cow-Tiger
};

function yoniScore(a: number, b: number): number {
  if (YONI[a] === YONI[b]) return 4;
  if (YONI_OPPOSITE[YONI[a]] === YONI[b]) return 0;
  return 2; // neutral
}

// Graha Maitri (planetary friendship) based on rashi lords
// Rashi lords: Aries/Scorpio=Mars, Taurus/Libra=Venus, Gemini/Virgo=Mercury,
//              Cancer=Moon, Leo=Sun, Sagittarius/Pisces=Jupiter, Capricorn/Aquarius=Saturn
const RASHI_LORD: number[] = [2, 5, 4, 3, 1, 4, 5, 2, 6, 7, 7, 6];
// 1=Sun, 2=Mars, 3=Moon, 4=Mercury, 5=Venus, 6=Jupiter, 7=Saturn

const PLANET_FRIENDS: Record<number, number[]> = {
  1: [3, 2, 6],      // Sun: Moon, Mars, Jupiter
  2: [1, 3, 6],      // Mars: Sun, Moon, Jupiter
  3: [1, 4],         // Moon: Sun, Mercury
  4: [1, 5, 7],      // Mercury: Sun, Venus, Saturn
  5: [4, 7],         // Venus: Mercury, Saturn
  6: [1, 2, 3],      // Jupiter: Sun, Mars, Moon
  7: [4, 5],         // Saturn: Mercury, Venus
};

const PLANET_ENEMIES: Record<number, number[]> = {
  1: [5, 7],         // Sun: Venus, Saturn
  2: [4, 7],         // Mars: Mercury, Saturn
  3: [2],            // Moon: none/Mars (neutral in some systems)
  4: [3, 2],         // Mercury: Moon, Mars (but Moon is neutral)
  5: [1, 3, 2],      // Venus: Sun, Moon, Mars (Moon neutral in some)
  6: [4, 5, 7],      // Jupiter: Mercury, Venus, Saturn
  7: [1, 3, 2],      // Saturn: Sun, Moon, Mars
};

function gruhaMaitriScore(rashiA: number, rashiB: number): number {
  const lordA = RASHI_LORD[rashiA];
  const lordB = RASHI_LORD[rashiB];
  if (lordA === lordB) return 5;
  const aFriends = PLANET_FRIENDS[lordA] ?? [];
  const bFriends = PLANET_FRIENDS[lordB] ?? [];
  const aEnemies = PLANET_ENEMIES[lordA] ?? [];
  const bEnemies = PLANET_ENEMIES[lordB] ?? [];
  const aLikesB = aFriends.includes(lordB);
  const bLikesA = bFriends.includes(lordA);
  const aHatesB = aEnemies.includes(lordB);
  const bHatesA = bEnemies.includes(lordA);
  if (aLikesB && bLikesA) return 5;
  if (aLikesB && !bHatesA) return 4;
  if (!aHatesB && bLikesA) return 4;
  if (!aHatesB && !bHatesA) return 3;
  if ((aHatesB && bLikesA) || (aLikesB && bHatesA)) return 1;
  return 0;
}

// Bhakut: based on rashi distance
function bhakutScore(rashiA: number, rashiB: number): number {
  const diff = Math.abs(rashiA - rashiB);
  const norm = Math.min(diff, 12 - diff);
  // Bad rashis: 6/8 (shadashtak) = 0, 5/9 (pancha-nav) = 0 in some systems
  // Good: same rashi = 7, 1/7 = 7
  if (rashiA === rashiB) return 7;
  if (diff === 6) return 0; // 7th rashi (opposite)
  if (diff === 1 || diff === 11) return 7; // adjacent
  if (diff === 2 || diff === 10) return 7;
  if (diff === 3 || diff === 9) return 7;
  if (diff === 4 || diff === 8) return 0; // 5/9 - bad bhakut
  if (diff === 5 || diff === 7) return 0; // 6/8 - shadashtak dosha
  return 7;
}

// Tara: counting nakshatras from birth star
function taraScore(nakshatraA: number, nakshatraB: number): number {
  // Count from male's nakshatra to female's, divide by 9, remainder = tara
  const forward = ((nakshatraB - nakshatraA + 27) % 27) + 1;
  const reverse = ((nakshatraA - nakshatraB + 27) % 27) + 1;
  const taraForward = ((forward - 1) % 9) + 1;
  const taraReverse = ((reverse - 1) % 9) + 1;
  // Good taras: 1,3,5,7 (Janma=1 mixed, Sampat=2 good, Vipat=3 bad, Kshema=4 good,
  //             Pratyak=5 bad, Sadhaka=6 good, Vadha=7 bad, Mitra=8 good, Atimitra=9 best)
  const goodTaras = new Set([2, 4, 6, 8, 9]);
  const fwd = goodTaras.has(taraForward) ? 1.5 : 0;
  const rev = goodTaras.has(taraReverse) ? 1.5 : 0;
  return fwd + rev; // max 3
}

// ── Ashtakoot breakdown ───────────────────────────────────────────────────────

export interface KootDetail {
  name: string;
  meaning: string;
  pts: number;
  maxPts: number;
  status: 'full' | 'partial' | 'miss';
  userVal: string;
  prospectVal: string;
  detail: string;
  dosha: boolean;
}

export interface AshtakootResult {
  koots: KootDetail[];
  total: number;
  interpretation: string;
  hasNadiDosha: boolean;
  hasBhakutDosha: boolean;
  hasGanaDosha: boolean;
}

export function calculateAshtakoot(userNakshatra: number, prospectNakshatra: number, userRashi?: number, prospectRashi?: number): AshtakootResult {
  const uN = userNakshatra;
  const pN = prospectNakshatra;
  const uR = userRashi ?? Math.floor(uN / (27 / 12));
  const pR = prospectRashi ?? Math.floor(pN / (27 / 12));

  // 1. Varna (1 pt)
  const varnaU = VARNA[uN];
  const varnaP = VARNA[pN];
  const varnaNames = ['Brahmin', 'Kshatriya', 'Vaishya', 'Shudra'];
  const varnaPts = varnaU <= varnaP ? 1 : 0;
  const varnaKoot: KootDetail = {
    name: 'Varna',
    meaning: 'Spiritual compatibility',
    pts: varnaPts,
    maxPts: 1,
    status: varnaPts === 1 ? 'full' : 'miss',
    userVal: varnaNames[varnaU],
    prospectVal: varnaNames[varnaP],
    detail: varnaPts === 1 ? 'Spiritual levels are compatible' : 'Spiritual levels are mismatched',
    dosha: false,
  };

  // 2. Vashya (2 pts)
  const vashyaU = VASHYA_RASHI[uR % 12];
  const vashyaP = VASHYA_RASHI[pR % 12];
  const vashyaNames = ['Chatushpad', 'Manav', 'Vanchar', 'Jalchar', 'Keet'];
  const vashyaPts = VASHYA_TABLE[vashyaU]?.[vashyaP] ?? 0;
  const vashyaKoot: KootDetail = {
    name: 'Vashya',
    meaning: 'Mutual attraction',
    pts: vashyaPts,
    maxPts: 2,
    status: vashyaPts === 2 ? 'full' : vashyaPts > 0 ? 'partial' : 'miss',
    userVal: vashyaNames[vashyaU],
    prospectVal: vashyaNames[vashyaP],
    detail: vashyaPts === 2 ? 'Strong mutual attraction' : vashyaPts > 0 ? 'Some attraction present' : 'Limited mutual attraction',
    dosha: false,
  };

  // 3. Tara (3 pts)
  const taraPts = taraScore(uN, pN);
  const taraKoot: KootDetail = {
    name: 'Tara',
    meaning: 'Birth star compatibility',
    pts: taraPts,
    maxPts: 3,
    status: taraPts >= 3 ? 'full' : taraPts > 0 ? 'partial' : 'miss',
    userVal: NAKSHATRA_NAMES[uN],
    prospectVal: NAKSHATRA_NAMES[pN],
    detail: taraPts >= 3 ? 'Excellent birth star compatibility' : taraPts > 0 ? 'Moderate star compatibility' : 'Unfavorable star placement',
    dosha: false,
  };

  // 4. Yoni (4 pts)
  const yoniPts = yoniScore(uN, pN);
  const yoniAnimalNames = ['Horse', 'Elephant', 'Sheep', 'Snake', 'Dog', 'Cat', 'Rat', 'Cow', 'Buffalo', 'Tiger', 'Hare', 'Monkey', 'Mongoose', 'Lion'];
  const yoniKoot: KootDetail = {
    name: 'Yoni',
    meaning: 'Physical compatibility',
    pts: yoniPts,
    maxPts: 4,
    status: yoniPts === 4 ? 'full' : yoniPts > 0 ? 'partial' : 'miss',
    userVal: yoniAnimalNames[YONI[uN]],
    prospectVal: yoniAnimalNames[YONI[pN]],
    detail: yoniPts === 4 ? 'Same yoni — excellent physical harmony' : yoniPts > 0 ? 'Compatible yoni animals' : 'Opposite yoni — physical incompatibility',
    dosha: false,
  };

  // 5. Graha Maitri (5 pts)
  const gruhaPts = gruhaMaitriScore(uR % 12, pR % 12);
  const rashiLordNames = ['', 'Sun', 'Mars', 'Moon', 'Mercury', 'Venus', 'Jupiter', 'Saturn'];
  const grahaKoot: KootDetail = {
    name: 'Graha Maitri',
    meaning: 'Planetary friendship',
    pts: gruhaPts,
    maxPts: 5,
    status: gruhaPts >= 4 ? 'full' : gruhaPts >= 2 ? 'partial' : 'miss',
    userVal: `${RASHI_SHORT[uR % 12]} (${rashiLordNames[RASHI_LORD[uR % 12]]})`,
    prospectVal: `${RASHI_SHORT[pR % 12]} (${rashiLordNames[RASHI_LORD[pR % 12]]})`,
    detail: gruhaPts >= 4 ? 'Strong planetary friendship' : gruhaPts >= 2 ? 'Neutral planetary relationship' : 'Planetary enmity present',
    dosha: false,
  };

  // 6. Gana (6 pts)
  const ganaU = GANA[uN];
  const ganaP = GANA[pN];
  const ganaNames = ['Deva', 'Manav', 'Rakshasa'];
  const ganaPts = GANA_TABLE[ganaU][ganaP];
  const ganaDosha = (ganaU === 0 && ganaP === 2) || (ganaU === 2 && ganaP === 0) ||
                    (ganaU === 1 && ganaP === 2) || (ganaU === 2 && ganaP === 1);
  const ganaKoot: KootDetail = {
    name: 'Gana',
    meaning: 'Temperament match',
    pts: ganaPts,
    maxPts: 6,
    status: ganaPts === 6 ? 'full' : ganaPts > 0 ? 'partial' : 'miss',
    userVal: ganaNames[ganaU],
    prospectVal: ganaNames[ganaP],
    detail: ganaPts === 6 ? 'Same temperament — excellent harmony' : ganaPts > 0 ? 'Compatible temperaments' : 'Gana dosha — temperament clash',
    dosha: ganaDosha,
  };

  // 7. Bhakut (7 pts)
  const bhakutPts = bhakutScore(uR % 12, pR % 12);
  const bhakutDosha = bhakutPts === 0;
  const bhakutKoot: KootDetail = {
    name: 'Bhakut',
    meaning: 'Moon sign distance',
    pts: bhakutPts,
    maxPts: 7,
    status: bhakutPts === 7 ? 'full' : bhakutPts > 0 ? 'partial' : 'miss',
    userVal: RASHI_SHORT[uR % 12],
    prospectVal: RASHI_SHORT[pR % 12],
    detail: bhakutPts === 7 ? 'Favorable moon sign placement' : bhakutPts > 0 ? 'Moderate moon sign relation' : 'Bhakut dosha — unfavorable rashi distance',
    dosha: bhakutDosha,
  };

  // 8. Nadi (8 pts)
  const nadiU = NADI[uN];
  const nadiP = NADI[pN];
  const nadiNames = ['Aadi (Vata)', 'Madhya (Pitta)', 'Antya (Kapha)'];
  const nadiDosha = nadiU === nadiP;
  const nadiPts = nadiDosha ? 0 : 8;
  const nadiKoot: KootDetail = {
    name: 'Nadi',
    meaning: 'Physiological compatibility',
    pts: nadiPts,
    maxPts: 8,
    status: nadiPts === 8 ? 'full' : 'miss',
    userVal: nadiNames[nadiU],
    prospectVal: nadiNames[nadiP],
    detail: nadiPts === 8 ? 'Excellent — different nadis indicate health compatibility' : 'Nadi dosha — same nadi can cause health issues',
    dosha: nadiDosha,
  };

  const koots = [varnaKoot, vashyaKoot, taraKoot, yoniKoot, grahaKoot, ganaKoot, bhakutKoot, nadiKoot];
  const total = Math.round(koots.reduce((s, k) => s + k.pts, 0));

  let interpretation: string;
  if (total >= 32) interpretation = 'Excellent match — highly auspicious';
  else if (total >= 24) interpretation = 'Good match — recommended';
  else if (total >= 18) interpretation = 'Average match — acceptable';
  else interpretation = 'Below average — consult a pandit';

  return {
    koots,
    total,
    interpretation,
    hasNadiDosha: nadiDosha,
    hasBhakutDosha: bhakutDosha,
    hasGanaDosha: ganaDosha,
  };
}
