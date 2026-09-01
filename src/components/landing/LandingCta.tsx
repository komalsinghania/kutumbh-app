'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { track } from '@/lib/analytics';
import AuthModal from '@/components/AuthModal';

/**
 * A "Start Free" button plus the sign-in modal it opens.
 *
 * The landing page itself is a Server Component, so the auth subscription and
 * the modal live here rather than at the top of the page — which is what keeps
 * the marketing copy out of the JavaScript bundle and, more importantly, stops
 * the page from ever being gated on auth state again. The copy renders on the
 * server no matter what Firebase is doing.
 *
 * A press that lands before Firebase has restored the session is parked in a
 * ref and replayed once the visitor is known, so a signed-in user goes to the
 * dashboard instead of being shown the sign-in modal.
 */
export default function LandingCta({
  placement, className, children,
}: {
  placement: string;
  className: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const pendingCta = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setLoggedIn(!!user);
      setAuthLoading(false);
      if (pendingCta.current) {
        pendingCta.current = false;
        if (user) router.push('/dashboard');
        else setShowModal(true);
      }
    });
    return unsub;
  }, [router]);

  const onClick = () => {
    track('cta_clicked', { placement });
    if (authLoading) { pendingCta.current = true; return; }
    if (loggedIn) router.push('/dashboard');
    else setShowModal(true);
  };

  return (
    <>
      {showModal && (
        <AuthModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); router.push('/dashboard'); }}
        />
      )}
      <button className={className} onClick={onClick}>{children}</button>
    </>
  );
}
