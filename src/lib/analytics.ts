// ─────────────────────────────────────────────────────────────────────────────
// Product analytics (PostHog EU) — privacy-first wrapper.
//
// Hard rules baked in here so we can never accidentally leak prospect PII:
//   • autocapture is OFF  → PostHog never reads text from inputs/DOM.
//   • person_profiles 'identified_only' → no anonymous profile spam.
//   • session recording OFF.
//   • we identify users by Firebase uid ONLY — never email/name/phone.
//   • analytics only starts after the user accepts "all" cookies.
//
// If NEXT_PUBLIC_POSTHOG_KEY is unset, every function here is a safe no-op,
// so the app runs fine locally / before you create a PostHog project.
// ─────────────────────────────────────────────────────────────────────────────
import posthog from 'posthog-js';

// Accept either our canonical name or PostHog's suggested NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
const CONSENT_KEY = 'rm_cookie_consent';

let started = false;

export function analyticsConsented(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'all';
  } catch {
    return false;
  }
}

export function isStarted(): boolean {
  return started;
}

export function initAnalytics(): void {
  if (started || typeof window === 'undefined') return;
  if (!KEY || !analyticsConsented()) return;

  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,        // we send pageviews manually on route change
    capture_pageleave: true,
    autocapture: false,             // never scrape DOM/input text (would be PII)
    disable_session_recording: true,
    person_profiles: 'identified_only',
  });
  started = true;
}

export function trackPageview(path: string): void {
  if (!started) return;
  posthog.capture('$pageview', { $current_url: path });
}

/** Track a product event. Pass ONLY non-identifying props (no names/phones/emails). */
export function track(event: string, props?: Record<string, unknown>): void {
  if (!started) return;
  posthog.capture(event, props);
}

/** Identify by Firebase uid only — never PII. */
export function identifyUser(uid: string): void {
  if (!started || !uid) return;
  posthog.identify(uid);
}

export function resetAnalytics(): void {
  if (!started) return;
  posthog.reset();
}
