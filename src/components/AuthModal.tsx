'use client';

import { useState, useEffect } from 'react';
import {
  signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { Logo } from '@/components/Logo';
import { track } from '@/lib/analytics';

function errCode(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return String((err as { code: unknown }).code ?? '');
  }
  return '';
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.2 0-9.6-3-11.3-7.3l-6.6 4.8C9.6 39.5 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C41.1 35.6 44 30.2 44 24c0-1.3-.1-2.7-.4-4z" />
    </svg>
  );
}

export default function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Handle redirect result on mount (fires after signInWithRedirect returns from Google)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => { if (result?.user) { track('logged_in', { method: 'google' }); onSuccess(); } })
      .catch((err: unknown) => {
        const code = errCode(err);
        if (code) toast.error(`Sign-in error: ${code}`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      track('logged_in', { method: 'google' });
      onSuccess();
      return;
    } catch (err: unknown) {
      const code = errCode(err);
      // Popup blocked or closed — fall back to redirect (common on mobile/Safari)
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        try {
          await signInWithRedirect(auth, new GoogleAuthProvider());
          return; // page redirects away — no finally needed
        } catch (redirectErr: unknown) {
          toast.error(errCode(redirectErr) || 'Google sign-in failed.');
        }
      } else {
        toast.error(code ? `Sign-in failed: ${code}` : 'Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
      track(isSignUp ? 'signed_up' : 'logged_in', { method: 'email' });
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed.');
    } finally { setSubmitting(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(20,16,12,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl p-7 relative"
        style={{ border: '1px solid #d6c9b0', boxShadow: '0 30px 80px rgba(0,0,0,0.35)', animation: 'lpRise 0.35s cubic-bezier(0.22,1,0.36,1) both' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl leading-none"
          style={{ color: '#6b5e4d' }}
          aria-label="Close"
        >×</button>

        <div className="text-center mb-6">
          <Logo style={{ fontSize: '2rem' }} />
          <p style={{ fontFamily: 'var(--font-instrument, serif)', fontSize: '1rem', color: '#6b5e4d', fontStyle: 'italic' }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 bg-white rounded-xl py-3.5 px-6 font-semibold transition-all hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ border: '1.5px solid #d6c9b0', color: '#1a1410', fontSize: '0.9rem' }}
        >
          {googleLoading
            ? <span className="gold-spinner" style={{ borderColor: 'rgba(193,62,42,0.2)', borderTopColor: '#c13e2a', width: '18px', height: '18px' }} />
            : <GoogleIcon />
          }
          {googleLoading ? 'Signing in…' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: '#d6c9b0' }} />
          <span className="text-xs font-medium" style={{ color: '#6b5e4d' }}>or</span>
          <div className="flex-1 h-px" style={{ background: '#d6c9b0' }} />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50 mt-1">
            {submitting
              ? <span className="gold-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
              : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-4" style={{ color: '#9b8e7e', fontSize: '0.72rem', lineHeight: 1.5 }}>
          By continuing, you agree to our{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#c13e2a' }}>Terms</a>{' '}
          and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#c13e2a' }}>Privacy Policy</a>.
        </p>

        <p className="text-center text-sm mt-4" style={{ color: '#6b5e4d' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => setIsSignUp(!isSignUp)} className="font-semibold underline" style={{ color: '#c13e2a' }}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}
