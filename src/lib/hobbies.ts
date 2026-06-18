// Coerce AI-extracted hobbies (which may arrive as a string or an array) into a
// clean string[] — split on commas / "and", trim, drop empties, dedupe.
export function normalizeHobbies(raw: unknown): string[] {
  if (!raw) return [];
  const parts = Array.isArray(raw)
    ? raw.flatMap(v => String(v).split(/,|\band\b/i))
    : String(raw).split(/,|\band\b/i);
  const cleaned = parts.map(s => s.trim()).filter(Boolean);
  return Array.from(new Set(cleaned));
}
