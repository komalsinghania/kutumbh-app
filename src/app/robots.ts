import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/og';

/**
 * Generates /robots.txt for RokaMaybe.
 *
 * Why each section exists:
 *
 * Allow '/'
 *   All marketing and public-content pages are open to crawlers so they
 *   show up in search results — home, about, pricing, features, blog, etc.
 *
 * Disallow '/dashboard', '/prospects', '/profile', '/onboarding'
 *   These are authenticated app pages that contain private user data.
 *   Indexing them is both a privacy risk and useless to visitors who are
 *   not logged in (they would just hit a redirect or empty state).
 *
 * Disallow '/api/'
 *   API routes serve JSON, never user-readable HTML, so there is nothing
 *   useful to index — and exposing them to scrapers is unnecessary.
 *
 * sitemap
 *   Pointing search engines at the sitemap URL lets them discover every
 *   public page quickly without relying solely on link crawling.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/prospects', '/profile', '/onboarding', '/compare', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
