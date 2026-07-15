import { PAYMENTS_ENABLED } from '@/lib/config';

export type MarketingLink = { href: string; label: string };

// The site-wide marketing / info pages, in nav order. Single source of truth
// shared by the marketing SiteHeader and the in-app dashboard nav so the two
// never drift. Pricing is hidden while payments are disabled (early access)
// and returns automatically when PAYMENTS_ENABLED is flipped back on.
export const MARKETING_LINKS: MarketingLink[] = [
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How it works' },
  ...(PAYMENTS_ENABLED ? [{ href: '/pricing', label: 'Pricing' }] : []),
  { href: '/mummy-mode', label: 'Mummy Mode' },
  { href: '/blog', label: 'Blog' },
];
