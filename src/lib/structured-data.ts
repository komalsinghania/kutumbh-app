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
import { pricingOffer } from '@/lib/pricing';
import { BLOG_AUTHOR, postWordCount, type BlogPost } from '@/lib/blogs';

/** Stable @id anchors so the graph nodes can reference each other. */
const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

/** The one-paragraph description of the product, reused wherever it is stated. */
export const SITE_DESCRIPTION =
  'RokaMaybe is a private arranged marriage tracker for an Indian rishta search. ' +
  'It reads biodatas with AI, runs full 36-point Ashtakoot kundli matching, ' +
  'logs calls and meetings, records red flags, and compares prospects side by side.';

/** What the product does, in plain sentences. Reused by /llms.txt. */
export const FEATURE_LIST = [
  'AI biodata reader — upload a PDF, Word doc, or photo and the profile fills itself in',
  'Kundli matching — full 36-point Ashtakoot computed from real Vedic astronomy',
  'Prospect tracker — every rishta, its status, and where it stands in one dashboard',
  'Call and meeting notes with a running timeline per prospect',
  'Red-flag and green-flag notes you can actually search later',
  'Side-by-side comparison of shortlisted prospects',
  'Mummy Mode — share a sanitised view of your search with family',
  'Partner preferences and match scoring against what you actually want',
];

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORG_ID,
  name: LEGAL.appName,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  email: LEGAL.contactEmail,
  description: SITE_DESCRIPTION,
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
  description: SITE_DESCRIPTION,
  inLanguage: 'en-IN',
  publisher: { '@id': ORG_ID },
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
  description: SITE_DESCRIPTION,
  inLanguage: 'en-IN',
  author: { '@type': 'Person', name: 'Komal Singhania' },
  publisher: { '@id': ORG_ID },
  isPartOf: { '@id': SITE_ID },
  featureList: FEATURE_LIST,
  // The Offer is derived from src/lib/pricing.ts so the price advertised to
  // answer engines is the same one the pages state in prose.
  offers: pricingOffer,
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

// ─────────────────────────────────────────────────────────────────────────────
// Blog structured data.
//
// The blog is the surface answer engines are most likely to quote from, and it
// was the least legible part of the site: posts carried only the site-wide
// Organization and WebSite nodes, so an engine could see that RokaMaybe
// published *something* at that URL but not that it was an article, who wrote
// it, or when. Everything below is derived from the post record itself, so a
// new post in src/lib/blogs.ts is fully described the moment it is added.
// ─────────────────────────────────────────────────────────────────────────────

/** Stable @id for the blog itself, referenced by every post. */
const BLOG_ID = `${SITE_URL}/blog#blog`;

/** Stable @id for the author, so every post references one Person node. */
const AUTHOR_ID = `${SITE_URL}/about#author`;

export const authorJsonLd = {
  '@type': 'Person',
  '@id': AUTHOR_ID,
  name: BLOG_AUTHOR.name,
  jobTitle: BLOG_AUTHOR.role,
  url: `${SITE_URL}/about`,
  worksFor: { '@id': ORG_ID },
};

/** The Article node for a single blog post. */
export function blogPostingJsonLd(post: BlogPost) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    headline: post.title,
    description: post.excerpt,
    articleSection: post.category,
    // Dates are date-only in the source, so they are emitted as such rather
    // than inventing a publication time we do not know.
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: authorJsonLd,
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': BLOG_ID },
    inLanguage: 'en-IN',
    wordCount: postWordCount(post),
    timeRequired: `PT${post.readingMinutes}M`,
    image: `${SITE_URL}/opengraph-image`,
  };
}

/** The Blog node for /blog, listing the posts it holds. */
export function blogJsonLd(posts: BlogPost[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': BLOG_ID,
    url: `${SITE_URL}/blog`,
    name: `${LEGAL.appName} Blog`,
    description:
      'Honest, practical writing on the rishta search — staying organized, spotting red flags, and making a calm decision.',
    inLanguage: 'en-IN',
    publisher: { '@id': ORG_ID },
    author: authorJsonLd,
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      '@id': `${SITE_URL}/blog/${post.slug}#article`,
      url: `${SITE_URL}/blog/${post.slug}`,
      headline: post.title,
      description: post.excerpt,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
    })),
  };
}

/**
 * A BreadcrumbList for a nested page.
 *
 * Pass the trail without the site root — it is prepended here — e.g.
 * `[{ name: 'Blog', path: '/blog' }, { name: post.title, path: `/blog/${slug}` }]`.
 */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  const items = [{ name: 'Home', path: '/' }, ...trail];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path === '/' ? '' : item.path}`,
    })),
  };
}
