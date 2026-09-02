'use client';
// ─────────────────────────────────────────────────────────────────────────────
// The rishta exactly as the family sees it.
//
// Used in two places: the family's own detail page, and the owner's
// "Preview mummy's view" inside the share sheet. Deliberately ONE component —
// if the preview were a separate mock-up it could drift from reality, and the
// whole feature rests on the owner trusting what it shows.
//
// This is the page where someone decides, so it is laid out as a dossier, not
// as an article: a hero that answers "who is he and does the kundli work", the
// facts in two scannable columns, and the verdict kept in reach on the right.
// Layout classes live in app/family/family.css; see the note there.
//
// Type is larger and targets are bigger than the rest of the app on purpose:
// the reader is often over 55 and on a phone in daylight.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, type ReactNode } from 'react';
import type { SharedProspect } from '@/types/family';
import { FAMILY_COPY, familyStageLabel, gunaVerdictWord, type FamilyLang } from '@/lib/family-copy';
import {
  C, BODY, title as titleStyle, heading, label as labelStyle, meta, faint, card, numeral,
} from '@/components/ui';

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

/**
 * A biodata row.
 *
 * Short values sit on the same line, right-aligned — the classic two-column
 * read. Long ones do NOT: a right-aligned value that wraps produces a ragged
 * block drifting back toward its own label, which is genuinely hard to scan.
 * Past ~34 characters the value drops onto its own line, left-aligned, with the
 * full width to breathe. Real biodata is full of these — a full job title, a
 * father's business address, three degrees with years.
 */
const LONG_VALUE = 34;

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value);
  const stacked = text.length > LONG_VALUE;

  return (
    <div style={{
      display: 'flex',
      flexDirection: stacked ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: stacked ? 'stretch' : 'baseline',
      gap: stacked ? 4 : 16,
      padding: '13px 0',
      borderBottom: '1px solid ' + C.lineSoft,
    }}>
      <span style={{ ...meta, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontFamily: BODY, fontSize: '0.95rem', fontWeight: 500,
        color: C.ink, textAlign: stacked ? 'left' : 'right',
        lineHeight: 1.5,
      }}>{text}</span>
    </div>
  );
}

/**
 * A section within the biodata card.
 *
 * These used to be three separate floating cards. Stacked boxes of label/value
 * rows is the most generic layout there is, and it made the page feel longer
 * than it was. One card with titled sections reads as a single document — which
 * is what a biodata actually is.
 */
function Section({ title, first, children }: {
  title: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <section style={{
      padding: first ? '20px 20px 8px' : '26px 20px 8px',
      borderTop: first ? undefined : `1px solid ${C.line}`,
    }}>
      <p style={{ ...SECTION_TITLE, marginBottom: 4 }}>{title}</p>
      {children}
    </section>
  );
}

export default function SharedRishtaView({
  share, photos, lang, aside, narrow = false,
}: {
  share: SharedProspect;
  photos: string[];
  lang: FamilyLang;
  /** The verdict block, pinned beside the details on a wide screen. Omitted by
   *  the owner's preview, which has no verdict to give. */
  aside?: ReactNode;
  /** Set when rendering inside a narrow container (the owner's preview sheet).
   *  The layout queries are viewport-based, so without this the sheet would be
   *  handed the two-column desktop grid and overflow. */
  narrow?: boolean;
}) {
  const t = FAMILY_COPY[lang];
  const f = t.fields;
  const [lightbox, setLightbox] = useState<string | null>(null);

  const hasFamilyDetails = !!(share.fatherOcc || share.motherOcc || share.siblings || share.property);
  const showBirth = share.includeBirthDetails && (share.dobDate || share.dobTime || share.dobPlace);
  const hasScore = share.gunaScore !== null && share.gunaScore !== undefined;
  const [lead, ...rest] = photos;
  const hasPhotos = photos.length > 0;

  /**
   * The one-line summary under the name. Deliberately short facts only.
   * A full job title ("Chief Manager - Wealth Management at AUM Capital Pvt.
   * Ltd, Kolkata") swamps the line AND repeats the city that follows it —
   * "... Kolkata · Kolkata · Singhal". The full title is one row down in the
   * introduction, where it belongs.
   */
  const headline = [
    share.age ? `${share.age} yrs` : null,
    share.city,
    share.gotra,
    share.diet,
  ].filter(Boolean).join(' · ');

  const photoStyle: React.CSSProperties = {
    width: '100%', display: 'block', border: 0, padding: 0, cursor: 'zoom-in',
    borderRadius: 12, overflow: 'hidden', background: C.cardQuiet,
  };

  return (
    <div className={narrow ? 'fam-view fam-view--narrow' : 'fam-view'}>
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12, objectFit: 'contain' }} />
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

      {/* ── Hero: face, name, and whether the kundli works ──
          With no photos there is no media column at all: an empty 4:5 tile is a
          lot of dead height, and the identity and kundli read better full-width. */}
      <div className={hasPhotos ? 'fam-hero' : undefined}>
        {hasPhotos && (
        <div className="fam-hero__media">
          {lead ? (
            <button onClick={() => setLightbox(lead)} style={{ ...photoStyle, aspectRatio: '4 / 5', border: `1px solid ${C.line}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lead} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ) : null}

          {rest.length > 0 && (
            <div className="fam-thumbs">
              {rest.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setLightbox(src)}
                  style={{ ...photoStyle, aspectRatio: '1 / 1', border: `1px solid ${C.line}` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          )}
        </div>
        )}

        <div className="fam-hero__body">
          <div style={{ ...CARD, padding: '20px 20px 18px' }}>
            <h1 style={titleStyle}>{share.name}</h1>
            <p style={{ ...meta, fontSize: '0.98rem', marginTop: 7 }}>{headline}</p>
          </div>

          {hasScore && (
            <div style={{ ...CARD, padding: '18px 20px 20px' }}>
              <p style={SECTION_TITLE}>{t.kundliMilan}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
                <div style={{
                  width: 76, height: 76, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  border: `1.5px solid ${scoreColor(share.gunaScore as number)}`,
                  background: C.card,
                }}>
                  <span style={{
                    ...numeral, fontSize: '1.55rem', lineHeight: 1,
                    color: scoreColor(share.gunaScore as number),
                  }}>{share.gunaScore}</span>
                  <span style={{ fontFamily: BODY, fontSize: '0.68rem', color: C.faint, marginTop: 3 }}>/ 36</span>
                </div>
                <div>
                  <p style={{ ...heading, color: scoreColor(share.gunaScore as number) }}>
                    {gunaVerdictWord(share.gunaScore, lang)}
                  </p>
                  <p style={{ ...meta, marginTop: 6 }}>{t.kundliDisclaimer}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Details left, decision tools right ── */}
      <div className="fam-detail">
        <div className="fam-detail__main">
          <div style={{ ...CARD }}>
            <Section title={t.parichay} first>
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
            </Section>

            {hasFamilyDetails && (
              <Section title={t.familyDetails}>
                <Row label={f.fatherOcc} value={share.fatherOcc} />
                <Row label={f.motherOcc} value={share.motherOcc} />
                <Row label={f.siblings} value={share.siblings} />
                <Row label={f.property} value={share.property} />
              </Section>
            )}

            {showBirth && (
              <Section title={t.birthDetails}>
                <Row label={f.dobDate} value={prettyDate(share.dobDate)} />
                <Row label={f.dobTime} value={share.dobTime} />
                <Row label={f.dobPlace} value={share.dobPlace} />
              </Section>
            )}
          </div>
        </div>

        <div className="fam-detail__rail">
          <div style={{ ...CARD, padding: '18px 20px 20px' }}>
            <p style={SECTION_TITLE}>{t.whereThingsStand}</p>
            <p style={{ ...heading, marginTop: 10 }}>{familyStageLabel(share.stage, lang)}</p>
            {share.syncedAt && (
              <p style={{ ...faint, marginTop: 8 }}>
                {lang === 'hi' ? 'Jab bhi kuch badlega, yahin update ho jayega.' : 'This updates whenever anything changes.'}
              </p>
            )}
          </div>
          {aside}
        </div>
      </div>
    </div>
  );
}
