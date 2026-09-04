// ─────────────────────────────────────────────────────────────────────────────
// What RokaMaybe costs — the single source of truth.
//
// Why this exists:
//   Every price claim on the site used to be written by hand in the page that
//   showed it. When PAYMENTS_ENABLED was flipped off, the dynamic surfaces
//   (structured data, the nav link, the pricing banner) followed the flag but
//   the static marketing copy did not, so the site simultaneously claimed
//   "free forever for the basics", "free for your first 3 prospects", "every
//   feature free", and "₹99 once". Search and AI answer engines read all four
//   and can't tell which is true, so they stop quoting any of them.
//
//   Everything that states a price now derives it from here. Flipping
//   PAYMENTS_ENABLED rewrites the whole site's pricing story in one move —
//   including the pre-generated marketing HTML, via applyPricingCopy() below.
//
// Note on the free tier: the 3-prospect limit and the 7-day Compare trial are
// the *planned* model. Neither is enforced in the app today — while payments
// are off, everyone has unlimited prospects and Compare. The copy below says
// so, because claiming a limit we don't enforce is the same kind of drift.
// ─────────────────────────────────────────────────────────────────────────────

import { PAYMENTS_ENABLED } from '@/lib/config';

export const PRICING = {
  /** Whether we are charging anyone right now. Mirrors PAYMENTS_ENABLED. */
  enabled: PAYMENTS_ENABLED,
  currency: 'INR',
  /** What a visitor actually pays today, in rupees. Zero during early access. */
  currentPrice: PAYMENTS_ENABLED ? 99 : 0,
  /** The one-time Roka Ready price, charged once payments are switched on. */
  plannedPrice: 99,
  /** Prospects included in the free tier once payments are switched on. */
  plannedFreeProspects: 3,
  /** Length of the free Compare trial once payments are switched on. */
  compareTrialDays: 7,
} as const;

/** Price as a display string — "Free" or "₹99". */
export const PRICE_LABEL = PRICING.enabled ? `₹${PRICING.plannedPrice}` : 'Free';

/**
 * The short badge shown above the fold on the landing and tracker pages.
 * Keep it under ~50 characters — it renders on one line on mobile.
 */
export const PRICING_BADGE = PRICING.enabled
  ? `Free for ${PRICING.plannedFreeProspects} prospects — no card needed`
  : 'Early access — every feature free, no card needed';

/** One line, used under final CTAs where there is room for a sentence. */
export const PRICING_LINE = PRICING.enabled
  ? `Free for your first ${PRICING.plannedFreeProspects} prospects. Set up before your chai gets cold.`
  : 'Free while we are in early access. Set up before your chai gets cold.';

/** The meta description and social card text for /pricing. */
export const PRICING_DESCRIPTION = PRICING.enabled
  ? `Free for your first ${PRICING.plannedFreeProspects} prospects. Compare opens with a ${PRICING.compareTrialDays}-day free trial, then ₹${PRICING.plannedPrice} once — valid till your roka. No subscription, no auto-renew.`
  : 'Free during early access — every feature unlocked, including Compare. No card, no subscription, no auto-renew.';

/**
 * The full answer to "how much does RokaMaybe cost?" — the question an answer
 * engine is most likely to be asked about us. Used verbatim in the homepage
 * FAQ (and so in FAQPage structured data) and in /llms.txt, so the same
 * sentences are what gets quoted wherever the question is picked up.
 */
export const PRICING_ANSWER = PRICING.enabled
  ? `RokaMaybe is free for your first ${PRICING.plannedFreeProspects} prospects, with every feature included except Compare. Compare opens with a ${PRICING.compareTrialDays}-day free trial that needs no card. After that, Roka Ready is a one-time ₹${PRICING.plannedPrice} that stays valid until your roka — there is no subscription, no renewal, and no auto-debit at any point.`
  : `RokaMaybe is free right now. Every feature is unlocked for everyone during early access — unlimited prospects, kundli matching, and Compare — with no card and no subscription. When we do start charging, Roka Ready will be a one-time ₹${PRICING.plannedPrice} that stays valid until your roka. It will never be a recurring charge.`;

/** The schema.org Offer for the WebApplication node. Mirrors the copy above. */
export const pricingOffer = {
  '@type': 'Offer',
  price: String(PRICING.currentPrice),
  priceCurrency: PRICING.currency,
  availability: 'https://schema.org/InStock',
  description: PRICING_ANSWER,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Rewriting the pre-generated marketing HTML.
//
// /pricing, /features and /how-it-works ship their body as one pre-generated
// HTML string (src/app/*/content.ts). Rather than regenerate those files every
// time the pricing model changes, the price claims inside them are patched at
// render time from the constants above. Each replacement is an exact string
// match, so a wording change in the source HTML makes the replacement a no-op
// rather than producing something wrong — and PRICING.enabled restores the
// original copy untouched.
// ─────────────────────────────────────────────────────────────────────────────

/** [find, replace] pairs applied to the marketing HTML while payments are off. */
const EARLY_ACCESS_REPLACEMENTS: [string, string][] = [
  // ── /pricing hero ──────────────────────────────────────────────────────
  [
    '<span class="eyebrow">Pricing · One price. No subscriptions.</span>',
    '<span class="eyebrow">Pricing · Free right now. No subscriptions, ever.</span>',
  ],
  [
    '<h1>Pay once.<br><em>Never again.</em></h1>',
    '<h1>Free today.<br><em>₹99 once, later.</em></h1>',
  ],
  [
    `<p class="sub">Start free. When you're ready to compare, it's ₹99 — one time, valid till your roka. That's the whole pricing page. The rest is detail.</p>`,
    `<p class="sub">Everything is free during early access — every feature, including Compare, with no card. The plan below is what we intend to charge later: ₹99, one time, valid till your roka. Never a subscription.</p>`,
  ],
  // Hero summary cells: 3 prospects / 7-day trial / ₹99 describe the future
  // model, so restate them as what is actually true today.
  [
    `<div class="n">3</div>\n        <div class="l">Prospects free ·<br>everything included</div>`,
    `<div class="n">All</div>\n        <div class="l">Prospects free ·<br>no limit right now</div>`,
  ],
  [
    `<div class="n">7 days</div>\n        <div class="l">Free Compare trial ·<br>no card needed</div>`,
    `<div class="n">Compare</div>\n        <div class="l">Unlocked for everyone ·<br>no trial to start</div>`,
  ],
  [
    `<div class="n">₹99</div>\n        <div class="l">Once · valid till<br>your roka</div>`,
    `<div class="n">₹0</div>\n        <div class="l">Today · ₹99 once<br>when we start charging</div>`,
  ],
  // ── /pricing comparison strip ──────────────────────────────────────────
  [
    '<div class="a-item us">RokaMaybe, till your roka<strong>₹99. Once.</strong></div>',
    '<div class="a-item us">RokaMaybe, right now<strong>₹0. Free.</strong></div>',
  ],
  // ── /pricing plan cards ────────────────────────────────────────────────
  [
    '<div class="plan-for">Start here · free forever</div>',
    '<div class="plan-for">Start here · free during early access</div>',
  ],
  [
    '<li><strong>Track 3 prospects</strong> across all 5 stages</li>',
    '<li><strong>Track unlimited prospects</strong> across all 5 stages</li>',
  ],
  [
    '<li class="na">Compare — tap it once to start your free 7-day trial</li>',
    '<li>Compare — unlocked for everyone during early access</li>',
  ],
  [
    '<div class="plan-badge">One payment · No renewals</div>',
    '<div class="plan-badge">Free during early access</div>',
  ],
  [
    '<div class="plan-price">₹99 <span class="per">once</span></div>',
    '<div class="plan-price">₹0 <span class="per">for now</span></div>',
  ],
  [
    '<div class="plan-price-note">Valid till your roka. However long that takes.</div>',
    '<div class="plan-price-note">₹99 once when we start charging. Valid till your roka.</div>',
  ],
  [
    '<a class="btn btn-gold" href="#">Get Roka Ready — ₹99</a>',
    '<a class="btn btn-gold" href="/">Get Roka Ready — free</a>',
  ],
  [
    '<p class="plans-fine">UPI, cards &amp; net banking accepted · Prices include GST · No auto-debit mandates, ever</p>',
    '<p class="plans-fine">Nothing to pay during early access · When we do charge: UPI, cards &amp; net banking, GST included · No auto-debit mandates, ever</p>',
  ],
  // ── /pricing "how Compare unlocks" ─────────────────────────────────────
  [
    `<p class="sec-lede">Compare is the paid feature — the side-by-side matrix that ends the 1 AM mental debates. But you don't buy it blind. Here's exactly how it works, start to finish.</p>`,
    `<p class="sec-lede">Compare is the side-by-side matrix that ends the 1 AM mental debates. It is open to everyone during early access — nothing below is charged today. This is how it will work once we start charging.</p>`,
  ],
  ['<p>Pay ₹99 once, or earn it by referral. Both below.</p>', '<p>Free today. Later: ₹99 once, or earn it by referral. Both below.</p>'],
  // The two "doors" out of the trial describe a model that isn't running yet —
  // neither the one-time payment nor the referral unlock is live today.
  [
    '<div class="d-tag">Door 1 · Pay once</div>',
    '<div class="d-tag">Door 1 · Pay once (not yet live)</div>',
  ],
  [
    '<p>One payment unlocks Roka Ready: Compare, unlimited prospects, the detailed kundli report, everything. No renewals to remember, no subscription quietly draining your account.</p>',
    '<p>One payment will unlock Roka Ready: Compare, unlimited prospects, the detailed kundli report, everything. No renewals to remember, no subscription quietly draining your account. Today you already have all of it, free.</p>',
  ],
  [
    '<div class="d-tag">Door 2 · The jugaad route</div>',
    '<div class="d-tag">Door 2 · The jugaad route (not yet live)</div>',
  ],
  [
    '<p>You know people in the rishta market. Send them your link from the app — when 2 of them sign up, Compare unlocks for 30 days, free. Repeatable, so yes, you can keep referring.</p>',
    '<p>You know people in the rishta market. Once referrals launch, you will send them your link from the app — when 2 of them sign up, Compare unlocks for 30 days, free. Repeatable, so yes, you will be able to keep referring.</p>',
  ],
  [
    `<div class="a">Share your referral link from the app. When 2 friends sign up using it, Compare unlocks for you for 30 days — free. It's repeatable: another 2 sign-ups, another month. In this market, running out of people to refer is not a realistic risk.</div>`,
    '<div class="a">Referrals are not live yet — while everything is free there is nothing to unlock. The plan: share your referral link from the app, and when 2 friends sign up using it, Compare unlocks for you for 30 days, free. Repeatable: another 2 sign-ups, another month. In this market, running out of people to refer is not a realistic risk.</div>',
  ],
  // ── /pricing FAQ answers ───────────────────────────────────────────────
  [
    `<div class="a">Everything except Compare, for up to 3 prospects: AI biodata extraction, all 5 stages, full kundli milan, call logs, flags, family scorecards, meeting planner. It's the complete app — the free plan isn't a demo, it's a working tool. Compare is the one feature that waits.</div>`,
    `<div class="a">Everything, for as many prospects as you like — including Compare. During early access there is no paid tier and no limit: AI biodata extraction, all 5 stages, full kundli milan, call logs, flags, family scorecards, meeting planner, and the side-by-side Compare view. Once we start charging, the free plan keeps all of that for 3 prospects and Compare becomes the paid feature.</div>`,
  ],
  [
    `<div class="a">Roka Ready is a one-time ₹99 payment that stays active for the length of your search — whether that's two months or two years. When you close your search, the plan has done its job. No renewals, no auto-debit mandates, no subscription lurking on your bank statement. <em>Pay once. We're rooting for you to stop needing us.</em></div>`,
    `<div class="a">Nothing is being charged during early access, so nothing expires. When Roka Ready does go live it will be a one-time ₹99 payment that stays active for the length of your search — whether that's two months or two years. No renewals, no auto-debit mandates, no subscription lurking on your bank statement. <em>Pay once. We're rooting for you to stop needing us.</em></div>`,
  ],
  [
    `<div class="a">No — and it's not possible even by accident, because we never take a card to start the trial. When the 7 days end, Compare simply locks again. Everything you logged during the trial stays safe in your account, visible the moment you unlock it again.</div>`,
    `<div class="a">No. There is no trial running today because Compare is simply open to everyone, and we have never taken a card. If that changes we will say so here first — and even then, a trial ending would only lock Compare again. Everything you logged stays safe in your account either way.</div>`,
  ],
  [
    `<div class="a">Absolutely — send them the payment link and they can pay by UPI directly. Papa is already funding a matrimonial-site premium; this is the cheaper line item that actually organises the results.</div>`,
    `<div class="a">There is nothing to pay right now, so nobody needs to. When Roka Ready goes live you will be able to send them the payment link and they can pay by UPI directly. Papa is already funding a matrimonial-site premium; this will be the cheaper line item that actually organises the results.</div>`,
  ],
  [
    `<div class="a">Then ₹99 was the best money spent in the entire wedding budget — and comfortably the smallest. Congratulations. Your account keeps read access to your history, because one day the story of the whole search will be worth retelling.</div>`,
    `<div class="a">Then you got the whole thing free, which is the best possible outcome for both of us. Congratulations. Your account keeps read access to your history, because one day the story of the whole search will be worth retelling.</div>`,
  ],
  [
    '<p>3 prospects free · 7-day Compare trial · ₹99 once, till your roka.</p>',
    '<p>Everything free during early access · No card · ₹99 once, later.</p>',
  ],
  // ── /features and /how-it-works ────────────────────────────────────────
  [
    '<span class="eyebrow">Free for your first 3 prospects</span>',
    '<span class="eyebrow">Free during early access — every feature</span>',
  ],
  [
    '<span class="eyebrow">Free for 3 prospects · No card</span>',
    '<span class="eyebrow">Free during early access · No card</span>',
  ],
];

/**
 * Patches the price claims in a pre-generated marketing HTML string so they
 * match what we actually charge. A no-op while payments are enabled, because
 * the source HTML was written for that state.
 */
export function applyPricingCopy(html: string): string {
  if (PRICING.enabled) return html;
  return EARLY_ACCESS_REPLACEMENTS.reduce(
    (acc, [find, replace]) => acc.split(find).join(replace),
    html,
  );
}

/**
 * Pulls the FAQ question/answer pairs out of a marketing HTML string.
 *
 * The pricing page renders its FAQs as <details class="faq"> blocks inside the
 * pre-generated HTML. Reading them back out — after applyPricingCopy() has run
 * — means the FAQPage structured data is guaranteed to quote the same words the
 * visitor sees, which is what Google requires and what stops the JSON-LD from
 * drifting away from the page the way the price claims did.
 */
export function extractFaqs(html: string): { q: string; a: string }[] {
  const block = /<details class="faq">\s*<summary>([\s\S]*?)<\/summary>\s*<div class="a">([\s\S]*?)<\/div>/g;
  const faqs: { q: string; a: string }[] = [];
  for (const [, q, a] of html.matchAll(block)) {
    faqs.push({ q: toPlainText(q), a: toPlainText(a) });
  }
  return faqs;
}

/** Strips tags and decodes the handful of entities the marketing HTML uses. */
function toPlainText(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&rsquo;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
