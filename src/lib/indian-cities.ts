import RAW from './indian-cities-data.json';

export interface CityData {
  name: string;
  state: string;
  lat: number;
  lng: number;
  tz: number; // UTC offset in hours (IST = +5.5)
}

// All of India observes a single timezone, IST (+5.5). Since every city in the
// dataset is Indian, timezone is constant — and it's the field that actually
// matters for the nakshatra calculation (the Moon's ecliptic longitude barely
// depends on the observer's lat/lng, but strongly on the local-time → UT
// conversion, i.e. the timezone).
const IST = 5.5;

// ~3,750 Indian cities/towns (GeoNames, population > 15,000), sorted by
// population so the most likely matches surface first in autocomplete. Stored
// as compact [name, state, lat, lng] tuples to keep the payload small.
type CityTuple = [string, string, number, number];

export const INDIAN_CITIES: CityData[] = (RAW as CityTuple[]).map(
  ([name, state, lat, lng]) => ({ name, state, lat, lng, tz: IST }),
);

/** Lowercase, strip diacritics and punctuation → a stable key for matching.
 *  "Bengalūru", "bengaluru", "BENGALURU " all collapse to "bengaluru". */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritics
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Well-known historical / spelling variants → the canonical name used in the
// dataset. Keeps common inputs like "Bombay" or "Bangalore" matching.
const ALIASES: Record<string, string> = {
  bombay: 'mumbai',
  bangalore: 'bengaluru',
  calcutta: 'kolkata',
  madras: 'chennai',
  poona: 'pune',
  baroda: 'vadodara',
  mysore: 'mysuru',
  trivandrum: 'thiruvananthapuram',
  cochin: 'kochi',
  gurgaon: 'gurugram',
  gauhati: 'guwahati',
  pondicherry: 'puducherry',
  vizag: 'visakhapatnam',
  benares: 'varanasi',
  banaras: 'varanasi',
  allahabad: 'prayagraj',
  cawnpore: 'kanpur',
};

function canonical(query: string): string {
  const n = normalize(query);
  return ALIASES[n] ?? n;
}

// Exact-name index (first occurrence wins, and the array is population-sorted,
// so the biggest city for a given name is preferred).
const BY_NAME = new Map<string, CityData>();
for (const c of INDIAN_CITIES) {
  const k = normalize(c.name);
  if (!BY_NAME.has(k)) BY_NAME.set(k, c);
}

/** Typeahead search: prefix matches first, then substring, then state matches.
 *  Population order is preserved within each tier. */
export function searchCities(query: string): CityData[] {
  if (!query || query.trim().length < 2) return [];
  const q = canonical(query);
  const prefix: CityData[] = [];
  const substr: CityData[] = [];
  const byState: CityData[] = [];
  for (const c of INDIAN_CITIES) {
    const name = normalize(c.name);
    if (name.startsWith(q)) prefix.push(c);
    else if (name.includes(q)) substr.push(c);
    else if (normalize(c.state).includes(q)) byState.push(c);
    if (prefix.length >= 8) break;
  }
  return [...prefix, ...substr, ...byState].slice(0, 8);
}

/** Resolve a typed place to a known city (exact, then alias, then best fuzzy
 *  prefix/substring match). Returns undefined only when nothing plausible
 *  matches — callers should fall back to {@link resolveBirthPlace}. */
export function getCityByName(name: string): CityData | undefined {
  if (!name) return undefined;
  const q = canonical(name);
  const exact = BY_NAME.get(q);
  if (exact) return exact;
  // Fuzzy: a prefix match is a strong signal ("bengal" → Bengaluru); fall back
  // to substring. Population order means the largest candidate wins.
  let substr: CityData | undefined;
  for (const c of INDIAN_CITIES) {
    const n = normalize(c.name);
    if (n.startsWith(q)) return c;
    if (!substr && q.length >= 4 && n.includes(q)) substr = c;
  }
  return substr;
}

// ── Approximate-location fallback ────────────────────────────────────────────
// Coordinates aren't fabricated: state centroids are the mean of that state's
// cities in the dataset, and the national centroid is the mean of all cities.
// Since nakshatra is largely insensitive to lat/lng (timezone is what matters,
// and it's IST everywhere), an approximate Indian location still yields a
// reliable nakshatra when the exact town isn't listed.

type LatLng = { lat: number; lng: number };

const STATE_CENTROID = new Map<string, LatLng>();

const INDIA_CENTROID: LatLng = (() => {
  const agg = new Map<string, { lat: number; lng: number; n: number }>();
  let totLat = 0, totLng = 0;
  for (const c of INDIAN_CITIES) {
    const k = normalize(c.state);
    const a = agg.get(k) ?? { lat: 0, lng: 0, n: 0 };
    a.lat += c.lat; a.lng += c.lng; a.n += 1;
    agg.set(k, a);
    totLat += c.lat; totLng += c.lng;
  }
  for (const [k, a] of agg) STATE_CENTROID.set(k, { lat: a.lat / a.n, lng: a.lng / a.n });
  return { lat: totLat / INDIAN_CITIES.length, lng: totLng / INDIAN_CITIES.length };
})();

export interface BirthPlace {
  lat: number;
  lng: number;
  tz: number;
  /** True when we couldn't match the exact town and used a state/national
   *  centroid instead — the nakshatra is still reliable, but callers may want
   *  to let the user confirm or override. */
  approximate: boolean;
  /** The matched city name when exact, else undefined. */
  city?: string;
}

/** Always resolves a birth place to usable coordinates for an Indian birth:
 *  exact/fuzzy city → precise; a recognizable state name → that state's
 *  centroid; otherwise the national centroid. Timezone is always IST. */
export function resolveBirthPlace(place: string): BirthPlace {
  const city = getCityByName(place);
  if (city) return { lat: city.lat, lng: city.lng, tz: IST, approximate: false, city: city.name };

  // Look for a known state name anywhere in the typed string.
  const q = normalize(place);
  for (const [stateKey, ctr] of STATE_CENTROID) {
    if (q.includes(stateKey)) return { lat: ctr.lat, lng: ctr.lng, tz: IST, approximate: true };
  }
  return { lat: INDIA_CENTROID.lat, lng: INDIA_CENTROID.lng, tz: IST, approximate: true };
}
