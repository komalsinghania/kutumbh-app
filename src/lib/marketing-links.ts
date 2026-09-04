export type MarketingLink = { href: string; label: string };

// The site-wide marketing / info pages, in nav order. Single source of truth
// shared by the marketing SiteHeader and the in-app dashboard nav so the two
// never drift.
//
// Pricing stays in the nav even while payments are disabled. "How much does it
// cost?" is the first thing anyone — person or answer engine — asks about a
// product, and an unanswerable question is worse than "free right now". The
// page states whatever src/lib/pricing.ts says is currently true.
export const MARKETING_LINKS: MarketingLink[] = [
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/mummy-mode', label: 'Mummy Mode' },
  { href: '/blog', label: 'Blog' },
];
