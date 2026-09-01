'use client';
// ─────────────────────────────────────────────────────────────────────────────
// The rishta exactly as the family sees it.
//
// Used in two places: the family's own detail page, and the owner's
// "Preview mummy's view" inside the share sheet. Deliberately ONE component —
// if the preview were a separate mock-up it could drift from reality, and the
// whole feature rests on the owner trusting what it shows.
//
// Type is larger and targets are bigger than the rest of the app on purpose:
// the reader is often over 55 and on a phone in daylight.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import type { SharedProspect } from '@/types/family';
import { FAMILY_COPY, familyStageLabel, gunaVerdictWord, type FamilyLang } from '@/lib/family-copy';
import { C, BODY, title as titleStyle, heading, label as labelStyle, meta, card, numeral } from '@/components/ui';

const CARD = card;
const SECTION_TITLE = labelStyle;

function scoreColor(score: number): string {
  if (score >= 28) return C.success;
  if (score >= 21) return '#7a8b3f';
  if (score >= 18) return C.gold;
  return C.danger;
}

/** The app stores income as a bare band ("20-35"). On its own that reads as
 *  nonsense to someone who has never seen the form it came from. */
function incomeLabel(v?: string): string | undefined {
  if (!v) return undefined;
  return /lpa|lakh|crore/i.test(v) ? v : `${v} LPA`;
}

/** "1997-03-14" is a developer's date. Show "14 March 1997". */
function prettyDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      gap: 16, padding: '13px 0', borderBottom: '1px solid ' + C.lineSoft,
    }}>
      <span style={{ ...meta, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontFamily: BODY, fontSize: '0.95rem', fontWeight: 500,
        color: C.ink, textAlign: 'right',
      }}>{String(value)}</span>
    </div>
  );
}

export default function SharedRishtaView({
  share, photos, lang,
}: {
  share: SharedProspect;
  photos: string[];
  lang: FamilyLang;
}) {
  const t = FAMILY_COPY[lang];
  const f = t.fields;
  const [lightbox, setLightbox] = useState<string | null>(null);

  const hasFamilyDetails = !!(share.fatherOcc || share.motherOcc || share.siblings || share.property);
  const showBirth = share.includeBirthDetails && (share.dobDate || share.dobTime || share.dobPlace);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 14, objectFit: 'contain' }} />
          <button
            onClick={() => setLightbox(null)}
            aria-label="Close"
            style={{
              position: 'absolute', top: 16, right: 16, width: 48, height: 48,
              borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.15)',
              color: 'white', fontSize: '1.8rem', lineHeight: 1, cursor: 'pointer',
            }}
          >×</button>
        </div>
      )}

      {/* ── Photos ── */}
      {photos.length > 0 && (
        <div style={{
          display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4,
          scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
        }}>
          {photos.map((src, i) => (
            <button
              key={i}
              onClick={() => setLightbox(src)}
              style={{
                flex: photos.length === 1 ? '1 1 100%' : '0 0 78%',
                scrollSnapAlign: 'start', padding: 0,
                border: `1px solid ${C.line}`,
                borderRadius: 12, overflow: 'hidden', cursor: 'zoom-in',
                background: C.cardQuiet, aspectRatio: '4 / 5',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      )}

      {/* ── Name + headline ── */}
      <div style={{ ...CARD, padding: '20px 20px 16px' }}>
        <h1 style={titleStyle}>{share.name}</h1>
        <p style={{ ...meta, fontSize: '0.98rem', marginTop: 7 }}>
          {[share.age ? `${share.age} yrs` : null, share.profession, share.city, share.gotra, share.diet]
            .filter(Boolean).join(' · ')}
        </p>
      </div>

      {/* ── Kundli ── */}
      {share.gunaScore !== null && share.gunaScore !== undefined && (
        <div style={{ ...CARD, padding: '18px 20px 20px' }}>
          <p style={SECTION_TITLE}>{t.kundliMilan}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%', flexShrink: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${scoreColor(share.gunaScore)}`,
              background: C.card,
            }}>
              <span style={{
                ...numeral, fontSize: '1.55rem', lineHeight: 1,
                color: scoreColor(share.gunaScore),
              }}>{share.gunaScore}</span>
              <span style={{ fontFamily: BODY, fontSize: '0.68rem', color: C.faint, marginTop: 3 }}>/ 36</span>
            </div>
            <div>
              <p style={{ ...heading, color: scoreColor(share.gunaScore) }}>
                {gunaVerdictWord(share.gunaScore, lang)}
              </p>
              <p style={{ ...meta, marginTop: 6 }}>{t.kundliDisclaimer}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Parichay ── */}
      <div style={{ ...CARD, padding: '18px 20px 8px' }}>
        <p style={{ ...SECTION_TITLE, marginBottom: 4 }}>{t.parichay}</p>
        <Row label={f.age} value={share.age} />
        <Row label={f.height} value={share.height} />
        <Row label={f.education} value={share.education} />
        <Row label={f.profession} value={share.profession} />
        <Row label={f.income} value={incomeLabel(share.income)} />
        <Row label={f.city} value={share.city} />
        <Row label={f.diet} value={share.diet} />
        <Row label={f.manglik} value={share.manglik} />
        <Row label={f.gotra} value={share.gotra} />
        <Row label={f.rashi} value={share.rashi} />
        <Row label={f.familyType} value={share.familyType} />
        <Row label={f.hobbies} value={share.hobbies?.length ? share.hobbies.join(', ') : undefined} />
      </div>

      {/* ── Ghar-parivar ── */}
      {hasFamilyDetails && (
        <div style={{ ...CARD, padding: '18px 20px 8px' }}>
          <p style={{ ...SECTION_TITLE, marginBottom: 4 }}>{t.familyDetails}</p>
          <Row label={f.fatherOcc} value={share.fatherOcc} />
          <Row label={f.motherOcc} value={share.motherOcc} />
          <Row label={f.siblings} value={share.siblings} />
          <Row label={f.property} value={share.property} />
        </div>
      )}

      {/* ── Birth details (opt-in, "for pandit ji") ── */}
      {showBirth && (
        <div style={{ ...CARD, padding: '18px 20px 8px' }}>
          <p style={{ ...SECTION_TITLE, marginBottom: 4 }}>{t.birthDetails}</p>
          <Row label={f.dobDate} value={prettyDate(share.dobDate)} />
          <Row label={f.dobTime} value={share.dobTime} />
          <Row label={f.dobPlace} value={share.dobPlace} />
        </div>
      )}

      {/* ── Where things stand ── */}
      <div style={{ ...CARD, padding: '18px 20px 20px' }}>
        <p style={SECTION_TITLE}>{t.whereThingsStand}</p>
        <p style={{ ...heading, marginTop: 10 }}>{familyStageLabel(share.stage, lang)}</p>
      </div>
    </div>
  );
}
