import type { MetadataRoute } from 'next';
import { BLOG_POSTS_SORTED } from '@/lib/blogs';

const BASE_URL = 'https://rokamaybe.com';

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
 *
 * Blog posts (dynamic)
 *   Blog posts are generated from the BLOG_POSTS_SORTED array so the
 *   sitemap always reflects the live set of posts without manual updates.
 *   Each post uses its publishedAt date as lastModified.
 *
 * Excluded pages
 *   Authenticated app routes (/dashboard, /prospects, /profile, /onboarding)
 *   and API routes are intentionally omitted — they are blocked in robots.txt
 *   as well and contain no publicly indexable content.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/features`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/mummy-mode`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/compare`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  const blogPages: MetadataRoute.Sitemap = BLOG_POSTS_SORTED.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticPages, ...blogPages];
}
