// ─────────────────────────────────────────────────────────────────────────────
// Schema.org structured data (JSON-LD).
//
// Why this exists:
//   Search engines and AI answer engines (ChatGPT, Claude, Perplexity, Google's
//   AI Overviews) read a page's JSON-LD to work out *what* the site is, who
//   runs it, and what it costs — facts they otherwise have to guess at from
//   prose. Without it we're an unlabelled page; with it we're a named product
//   with a category, a publisher, and answerable FAQs.
//
//   Emitted as <script type="application/ld+json"> via <JsonLd>, following the
//   Next.js recommendation to render structured data from the page/layout.
// ─────────────────────────────────────────────────────────────────────────────

import { SITE_URL } from '@/lib/og';
import { LEGAL } from '@/lib/legal';
import { PAYMENTS_ENABLED } from '@/lib/config';

/** Stable @id anchors so the graph nodes can reference each other. */
const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

const DESCRIPTION =
  'RokaMaybe is a private arranged marriage tracker for an Indian rishta search. ' +
  'It reads biodatas with AI, runs full 36-point Ashtakoot kundli matching, ' +
  'logs calls and meetings, records red flags, and compares prospects side by side.';

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORG_ID,
  name: LEGAL.appName,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  email: LEGAL.contactEmail,
  description: DESCRIPTION,
  founder: {
    '@type': 'Person',
    name: 'Komal Singhania',
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Ghatshila',
    addressRegion: 'Jharkhand',
    addressCountry: 'IN',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: LEGAL.contactEmail,
    areaServed: 'IN',
    availableLanguage: ['English', 'Hindi'],
  },
};

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': SITE_ID,
  name: LEGAL.appName,
  alternateName: 'Roka Maybe',
  url: SITE_URL,
  description: DESCRIPTION,
  inLanguage: 'en-IN',
  publisher: { '@id': ORG_ID },
};

// Offer mirrors src/lib/config.ts: while PAYMENTS_ENABLED is false the whole
// app is free, so we must not advertise a price we don't charge. Re-enabling
// payments means putting the real price back here as well.
const offer = PAYMENTS_ENABLED
  ? undefined
  : {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      description: 'Free during early access — every feature unlocked, no card needed.',
    };

export const webApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: LEGAL.appName,
  url: SITE_URL,
  applicationCategory: 'LifestyleApplication',
  applicationSubCategory: 'Arranged marriage / rishta tracker',
  operatingSystem: 'Any (web browser)',
  browserRequirements: 'Requires JavaScript. Works on modern mobile and desktop browsers.',
  description: DESCRIPTION,
  inLanguage: 'en-IN',
  author: { '@type': 'Person', name: 'Komal Singhania' },
  publisher: { '@id': ORG_ID },
  isPartOf: { '@id': SITE_ID },
  featureList: [
    'AI biodata reader — upload a PDF, Word doc, or photo and the profile fills itself in',
    'Kundli matching — full 36-point Ashtakoot computed from real Vedic astronomy',
    'Prospect tracker — every rishta, its status, and where it stands in one dashboard',
    'Call and meeting notes with a running timeline per prospect',
    'Red-flag and green-flag notes you can actually search later',
    'Side-by-side comparison of shortlisted prospects',
    'Mummy Mode — share a sanitised view of your search with family',
    'Partner preferences and match scoring against what you actually want',
  ],
  ...(offer ? { offers: offer } : {}),
};

/** Builds the FAQPage node from the FAQs already shown on the page. */
export function faqPageJsonLd(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
