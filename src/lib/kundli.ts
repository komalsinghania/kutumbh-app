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
// Lahiri (Chitrapaksha) ayanamsa, anchored to the ICRC/Swiss-Ephemeris standard
// value of exactly 23.853222° at J2000.0 (JD 2451545.0) and advanced by
// precession (~50.29"/year → ~1.3969°/century). Using the precise J2000 anchor
// rather than a rounded 23.85° keeps placements correct near nakshatra/rashi
// boundaries. For reference this yields ~24°07′ around 2026, matching published
// Lahiri values.
function lahiriAyanamsa(julianDate: number): number {
  const J2000 = 2451545.0;
  const T = (julianDate - J2000) / 36525.0; // Julian centuries from J2000
  const ayanamsa = 23.853222 + 1.396819 * T + 0.0003086 * T * T;
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

// Varna: 0=Brahmin, 1=Kshatriya, 2=Vaishya, 3=Shudra (0 = highest).
// Ashtakoot Varna is a function of the Moon SIGN (rashi), not the nakshatra:
//   Brahmin  = Cancer, Scorpio, Pisces
//   Kshatriya= Aries, Leo, Sagittarius
//   Vaishya  = Taurus, Virgo, Capricorn
//   Shudra   = Gemini, Libra, Aquarius
// Indexed by rashi 0-11 (Aries…Pisces).
const VARNA_RASHI: number[] = [1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0];

// Vashya: 0=Chatushpad, 1=Manav, 2=Vanchar, 3=Jalchar, 4=Keet
// Based on rashi (0-11). Split signs use their first-half designation:
// Sagittarius (1st half human) → Manav; Capricorn (1st half quadruped) → Chatushpad.
const VASHYA_RASHI: number[] = [0, 0, 1, 3, 2, 1, 1, 4, 1, 0, 1, 3];

// Compatibility table for Vashya [a][b] = points (0, 0.5, 1, 1.5, 2)
const VASHYA_TABLE: number[][] = [
  [2, 1, 0, 1, 1], // Chatushpad
  [0, 2, 0, 0, 0], // Manav
  [1, 0, 2, 0, 1], // Vanchar
  [1, 0, 0, 2, 0], // Jalchar
  [0, 0, 1, 0, 2], // Keet
];

// Gana: 0=Deva, 1=Manav (Manushya), 2=Rakshasa. Indexed by nakshatra 0-26.
//   Deva:     Ashwini, Mrigashira, Punarvasu, Pushya, Hasta, Swati, Anuradha, Shravana, Revati
//   Manushya: Bharani, Rohini, Ardra, P/U Phalguni, P/U Ashadha, P/U Bhadrapada
//   Rakshasa: Krittika, Ashlesha, Magha, Chitra, Vishakha, Jyeshtha, Mula, Dhanishta, Shatabhisha
const GANA: number[] = [
  0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1,
  0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2,
  1, 1, 0,
];

// [bride/user gana][groom/prospect gana]. Extremes are agreed (same = 6,
// Deva↔Rakshasa = 0); Deva↔Manushya = 5 and Manushya↔Rakshasa = 1 follow the
// widely reproduced simplified convention.
const GANA_TABLE: number[][] = [
  [6, 5, 0], // Deva
  [5, 6, 1], // Manav
  [0, 1, 6], // Rakshasa
];

// Nadi: 0=Aadi (Vata), 1=Madhya (Pitta), 2=Antya (Kapha). Indexed by nakshatra 0-26.
//   Aadi:   Ashwini, Ardra, Punarvasu, U Phalguni, Hasta, Jyeshtha, Mula, Shatabhisha, P Bhadrapada
//   Madhya: Bharani, Mrigashira, Pushya, P Phalguni, Chitra, Anuradha, P Ashadha, Dhanishta, U Bhadrapada
//   Antya:  Krittika, Rohini, Ashlesha, Magha, Swati, Vishakha, U Ashadha, Shravana, Revati
const NADI: number[] = [
  0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0,
  0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0,
  0, 1, 2,
];

// Yoni: animal symbol for each nakshatra
// 0=Horse, 1=Elephant, 2=Sheep, 3=Snake, 4=Dog, 5=Cat, 6=Rat, 7=Cow,
// 8=Buffalo, 9=Tiger, 10=Hare/Deer, 11=Monkey, 12=Mongoose, 13=Lion
const YONI: number[] = [
  0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7,
  8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0,
  13, 7, 1,
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

// Classical Parashari natural (naisargika) friendship. Anything not listed as a
// friend or enemy is neutral. Keyed by planet code (1=Sun … 7=Saturn).
const PLANET_FRIENDS: Record<number, number[]> = {
  1: [2, 3, 6],      // Sun: Mars, Moon, Jupiter
  2: [1, 3, 6],      // Mars: Sun, Moon, Jupiter
  3: [1, 4],         // Moon: Sun, Mercury
  4: [1, 5],         // Mercury: Sun, Venus
  5: [4, 7],         // Venus: Mercury, Saturn
  6: [1, 2, 3],      // Jupiter: Sun, Mars, Moon
  7: [4, 5],         // Saturn: Mercury, Venus
};

const PLANET_ENEMIES: Record<number, number[]> = {
  1: [5, 7],         // Sun: Venus, Saturn
  2: [4],            // Mars: Mercury
  3: [],             // Moon: no natural enemies
  4: [3],            // Mercury: Moon
  5: [1, 3],         // Venus: Sun, Moon
  6: [4, 5],         // Jupiter: Mercury, Venus
  7: [1, 2, 3],      // Saturn: Sun, Mars, Moon
};

type Relation = 'friend' | 'enemy' | 'neutral';
function planetRelation(a: number, b: number): Relation {
  if ((PLANET_FRIENDS[a] ?? []).includes(b)) return 'friend';
  if ((PLANET_ENEMIES[a] ?? []).includes(b)) return 'enemy';
  return 'neutral';
}

function gruhaMaitriScore(rashiA: number, rashiB: number): number {
  const lordA = RASHI_LORD[rashiA];
  const lordB = RASHI_LORD[rashiB];
  if (lordA === lordB) return 5;
  const rA = planetRelation(lordA, lordB); // A's lord toward B's lord
  const rB = planetRelation(lordB, lordA); // B's lord toward A's lord
  if (rA === 'friend' && rB === 'friend') return 5;
  if ((rA === 'friend' && rB === 'neutral') || (rA === 'neutral' && rB === 'friend')) return 4;
  if (rA === 'neutral' && rB === 'neutral') return 3;
  if ((rA === 'friend' && rB === 'enemy') || (rA === 'enemy' && rB === 'friend')) return 1;
  if ((rA === 'neutral' && rB === 'enemy') || (rA === 'enemy' && rB === 'neutral')) return 0.5;
  return 0; // mutual enemies
}

// Bhakut/Rashikoot: purely the angular relationship between the two Moon signs.
// Auspicious 1/1, 1/7, 3/11, 4/10 → 7 points. The three dosha axes score 0:
//   2/12 (Dwirdwadash), 5/9 (Nav-Pancham), 6/8 (Shadashtak).
function bhakutScore(rashiA: number, rashiB: number): number {
  const raw = Math.abs(rashiA - rashiB);
  const d = Math.min(raw, 12 - raw); // normalized separation 0..6
  if (d === 1 || d === 4 || d === 5) return 0; // 2/12, 5/9, 6/8 doshas
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

  // 1. Varna (1 pt) — derived from Moon sign (rashi), not nakshatra
  const varnaU = VARNA_RASHI[uR % 12];
  const varnaP = VARNA_RASHI[pR % 12];
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
  // True Gana dosha is only the Deva↔Rakshasa clash (0 points). A Manushya↔
  // Rakshasa pairing is a weaker mismatch (1 point), not a full dosha.
  const ganaDosha = (ganaU === 0 && ganaP === 2) || (ganaU === 2 && ganaP === 0);
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
  if (total >= 33) interpretation = 'Excellent match — highly auspicious';
  else if (total >= 25) interpretation = 'Very good match — recommended';
  else if (total >= 18) interpretation = 'Acceptable match — average';
  else interpretation = 'Below 18 — not traditionally recommended';

  return {
    koots,
    total,
    interpretation,
    hasNadiDosha: nadiDosha,
    hasBhakutDosha: bhakutDosha,
    hasGanaDosha: ganaDosha,
  };
}
