// ─────────────────────────────────────────────────────────────────────────────
// /llms.txt — the plain-text manifest AI answer engines look for.
//
// Why this exists:
//   robots.txt tells a crawler where it may go and sitemap.xml lists every URL,
//   but neither says what the site *is*. llms.txt is the emerging convention for
//   that: one Markdown-flavoured text file at the site root, giving a model the
//   product, the price, and an annotated index of the pages worth reading — so
//   an assistant asked "what is RokaMaybe / what does it cost" gets the answer
//   from us rather than reconstructing it from whichever page it happened to
//   crawl.
//
//   Everything below is generated from the same constants the pages render, so
//   this file cannot become a fifth, stale copy of the pricing story. That is
//   the whole reason it is a route handler rather than a file in public/.
// ─────────────────────────────────────────────────────────────────────────────

import { SITE_URL } from '@/lib/og';
import { LEGAL } from '@/lib/legal';
import { SITE_DESCRIPTION, FEATURE_LIST } from '@/lib/structured-data';
import { PRICING_ANSWER } from '@/lib/pricing';
import { BLOG_POSTS_SORTED, formatBlogDate } from '@/lib/blogs';

// Nothing here reads the request, so render it once at build time and serve it
// as a static asset. (GET route handlers are dynamic by default since Next 15.)
export const dynamic = 'force-static';

/** Annotated page index. Kept next to the prose each page actually shows. */
const PAGES: { path: string; title: string; note: string }[] = [
  {
    path: '/',
    title: 'Home',
    note: 'What RokaMaybe is, who it is for, and the FAQs — including what it costs.',
  },
  {
    path: '/arranged-marriage-tracker',
    title: 'Arranged marriage tracker',
    note: 'The long-form explanation of the product: the problem, what it does, who it suits, and how it differs from a matrimonial site.',
  },
  {
    path: '/features',
    title: 'Features',
    note: 'Every feature in detail — biodata extraction, kundli milan, stages, call logs, flags, family scorecards, Compare.',
  },
  {
    path: '/how-it-works',
    title: 'How it works',
    note: 'The workflow end to end, from uploading a biodata to closing out a rishta.',
  },
  {
    path: '/pricing',
    title: 'Pricing',
    note: 'What the app costs today and what it will cost later, with the fine print.',
  },
  {
    path: '/mummy-mode',
    title: 'Mummy Mode',
    note: 'How family sharing works — a sanitised view of chosen prospects, never the private notes.',
  },
  {
    path: '/blog',
    title: 'Blog',
    note: 'Practical writing on running a rishta search.',
  },
  {
    path: '/about',
    title: 'About',
    note: 'Who built RokaMaybe and why.',
  },
  {
    path: '/privacy',
    title: 'Privacy policy',
    note: 'What is collected, where it is stored, and how to delete it. Written to India’s DPDPA.',
  },
  { path: '/terms', title: 'Terms of use', note: 'The terms of service.' },
];

function buildLlmsTxt(): string {
  const lines: string[] = [];

  lines.push(`# ${LEGAL.appName}`);
  lines.push('');
  lines.push(`> ${SITE_DESCRIPTION}`);
  lines.push('');
  lines.push(
    'RokaMaybe is not a matrimonial site. It does not introduce anyone to anyone, ' +
      'show profiles between users, or share data. It is a private tracker for the ' +
      'prospects a family is already being introduced to, used by the person running ' +
      'the search. Everything a user records is visible only to their own account.',
  );
  lines.push('');

  lines.push('## Pricing');
  lines.push('');
  lines.push(PRICING_ANSWER);
  lines.push('');

  lines.push('## What it does');
  lines.push('');
  for (const feature of FEATURE_LIST) lines.push(`- ${feature}`);
  lines.push('');

  lines.push('## Pages');
  lines.push('');
  for (const page of PAGES) {
    lines.push(`- [${page.title}](${SITE_URL}${page.path === '/' ? '/' : page.path}): ${page.note}`);
  }
  lines.push('');

  lines.push('## Blog posts');
  lines.push('');
  for (const post of BLOG_POSTS_SORTED) {
    lines.push(
      `- [${post.title}](${SITE_URL}/blog/${post.slug}): ${post.excerpt} (${post.category}, published ${formatBlogDate(post.publishedAt)})`,
    );
  }
  lines.push('');

  lines.push('## Not available to crawlers');
  lines.push('');
  lines.push(
    '- The signed-in app (/dashboard, /prospects, /profile, /onboarding, /compare) holds ' +
      'private user data and is excluded in robots.txt. There is no public prospect data anywhere on this site.',
  );
  lines.push('');

  lines.push('## Contact');
  lines.push('');
  lines.push(`- Email: ${LEGAL.contactEmail}`);
  lines.push(`- Sitemap: ${SITE_URL}/sitemap.xml`);
  lines.push('');

  return lines.join('\n');
}

export async function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
