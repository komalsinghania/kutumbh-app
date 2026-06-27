'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  initAnalytics, trackPageview, identifyUser, resetAnalytics,
  isStarted, analyticsConsented,
} from '@/lib/analytics';

/**
 * Boots PostHog once the user has consented, tracks page views on route change,
 * and ties the session to the Firebase uid (pseudonymous). Renders nothing.
 */
export default function AnalyticsProvider() {
  const { user } = useAuth();
  const pathname = usePathname();

  // Start when consent is present; also react to the cookie-banner choice.
  useEffect(() => {
    if (analyticsConsented()) {
      initAnalytics();
      if (pathname) trackPageview(pathname);
    }
    const onConsentChange = () => {
      if (analyticsConsented()) {
        initAnalytics();
        if (pathname) trackPageview(pathname);
        if (user?.uid) identifyUser(user.uid);
      }
    };
    window.addEventListener('rm-consent-changed', onConsentChange);
    return () => window.removeEventListener('rm-consent-changed', onConsentChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Page views on client-side navigation.
  useEffect(() => {
    if (pathname) trackPageview(pathname);
  }, [pathname]);

  // Identify on login, reset on logout.
  useEffect(() => {
    if (!isStarted()) return;
    if (user?.uid) identifyUser(user.uid);
    else resetAnalytics();
  }, [user?.uid]);

  return null;
}
