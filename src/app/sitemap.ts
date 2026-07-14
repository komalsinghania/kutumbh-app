import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/og';
import { BLOG_POSTS_SORTED } from '@/lib/blogs';

// Date of the last meaningful content update on static pages.
// Update this string whenever a static page copy or structure changes.
const STATIC_LAST_MODIFIED = new Date('2026-07-14');

/**
 * Generates /sitemap.xml for RokaMaybe.
 *
 * Why this matters:
 *   A sitemap tells search engines the canonical URL and freshness of every
 *   public page on the site, so they can crawl and index content efficiently
 *   without missing pages that have few inbound links.
 *
 * Static pages
 *   The marketing and informational pages are listed with a 'weekly' or
 *   'monthly' change frequency and a priority that reflects how important
 *   they are for discovery (home = 1.0, legal pages = 0.3).
 *   lastModified is a fixed date (STATIC_LAST_MODIFIED) rather than the
 *   current timestamp, so search engines are not told content changed on
 *   every request when it hasn't.
 *
 * Blog posts (dynamic)
 *   Blog posts are generated from the BLOG_POSTS_SORTED array so the
 *   sitemap always reflects the live set of posts without manual updates.
 *   Each post uses its publishedAt date as lastModified and changeFrequency
 *   'never' because articles are not edited after publication.
 *
 * Excluded pages
 *   Authenticated app routes (/dashboard, /prospects, /profile, /onboarding)
 *   and API routes are intentionally omitted — they are blocked in robots.ts
 *   as well and contain no publicly indexable content.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/features`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/how-it-works`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/mummy-mode`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/compare`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  const blogPages: MetadataRoute.Sitemap = BLOG_POSTS_SORTED.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'never',
    priority: 0.7,
  }));

  return [...staticPages, ...blogPages];
}
