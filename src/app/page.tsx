'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { Logo } from '@/components/Logo';

// ── Auth Modal ─────────────────────────────────────────────────────────────────

function AuthModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Handle redirect result on mount (fires after signInWithRedirect returns from Google)
  useEffect(() => {
    getRedirectResult(auth).catch((err: any) => {
      if (err?.code) toast.error(`Sign-in error: ${err.code}`);
    });
  }, []);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: any) {
      const code: string = err?.code ?? '';
      // Popup blocked or closed — fall back to redirect (common on mobile/Safari)
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        try {
          await signInWithRedirect(auth, new GoogleAuthProvider());
          return; // page redirects away — no finally needed
        } catch (redirectErr: any) {
          toast.error(redirectErr?.code ?? 'Google sign-in failed.');
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
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed.');
    } finally { setSubmitting(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl p-7 relative"
        style={{ border: '1px solid #d6c9b0', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
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

        <p className="text-center text-sm mt-5" style={{ color: '#6b5e4d' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => setIsSignUp(!isSignUp)} className="font-semibold underline" style={{ color: '#c13e2a' }}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Google Icon ────────────────────────────────────────────────────────────────

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

// ── WhatsApp Icon ─────────────────────────────────────────────────────────────

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ── Scroll-fade hook ───────────────────────────────────────────────────────────

function useFadeIn() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function FadeSection({
  children, className, style, id,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}) {
  const { ref, visible } = useFadeIn();
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      id={id}
      className={className}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: 'opacity 0.65s ease, transform 0.65s ease',
      }}
    >
      {children}
    </section>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: 'var(--font-fraunces, sans-serif)',
      fontSize: '0.68rem',
      fontWeight: 700,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: '#c13e2a',
      marginBottom: '12px',
    }}>
      {children}
    </p>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, body, surface = 'paper' }: {
  icon: React.ReactNode;
  title: string;
  body: string;
  surface?: 'paper' | 'white';
}) {
  const [hovered, setHovered] = useState(false);
  const bg = surface === 'white' ? '#faf4e8' : '#ffffff';
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: bg,
        border: '1px solid #d6c9b0',
        borderRadius: '8px',
        padding: '32px',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 10px 28px rgba(26,20,16,0.10)' : '0 1px 4px rgba(26,20,16,0.04)',
      }}
    >
      <div style={{ color: '#c13e2a', marginBottom: 16, display: 'inline-flex' }}>
        {icon}
      </div>
      <div style={{
        fontFamily: 'var(--font-fraunces, serif)',
        fontSize: '22px',
        fontWeight: 600,
        color: '#1a1410',
        marginBottom: '10px',
        lineHeight: 1.3,
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: 'var(--font-dm-sans, sans-serif)',
        fontSize: '15px',
        color: '#6b5e4d',
        lineHeight: 1.65,
      }}>
        {body}
      </div>
    </div>
  );
}

// ── Line icons (sindoor, 32px) ────────────────────────────────────────────────

const iconProps = {
  width: 32, height: 32, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
};

const IconDoc = () => (
  <svg {...iconProps}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>
);
const IconSparkle = () => (
  <svg {...iconProps}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/></svg>
);
const IconTarget = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
);
const IconPhone = () => (
  <svg {...iconProps}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
);
const IconFamily = () => (
  <svg {...iconProps}><circle cx="9" cy="7" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5"/><path d="M14 20c.2-2 2-3.5 4-3.5s3.8 1.5 4 3.5"/></svg>
);
const IconCompare = () => (
  <svg {...iconProps}><rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/><path d="M6.5 9h1M6.5 13h1M17.5 9h1M17.5 13h1"/></svg>
);
const IconLock = () => (
  <svg {...iconProps}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
);
const IconNoAds = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/></svg>
);
const IconExport = () => (
  <svg {...iconProps}><path d="M12 3v13"/><path d="M7 8l5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
);
const IconTrash = () => (
  <svg {...iconProps}><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></svg>
);
const IconIndia = () => (
  <svg {...iconProps}><path d="M5 3v18"/><path d="M5 4h13l-3 4 3 4H5"/></svg>
);
const IconFlag = () => (
  <svg {...iconProps}><path d="M5 3v18"/><path d="M5 4h12l-2 3 2 3H5"/></svg>
);

// ── Data ──────────────────────────────────────────────────────────────────────

const RED_FLAGS_LIST = [
  "Said he wants a 'homely but career-oriented' wife. Pick one.",
  "His mother sent me a list of things I need to learn to cook before marriage.",
  "He asked my salary before my name.",
  "Said her family is very modern. Then asked my caste in the second call.",
  "His first question on the call was 'do you do fast on karwa chauth?'",
  "Told me women who work after marriage 'lose their family values'.",
  "Mom said we'll figure out career after wedding. Didn't even ask me.",
  "Asked for salary slips before the first meeting. Excuse me?",
  "Said he's progressive. Then told me his wife will live with his parents 'of course'.",
  "His family asked if I could 'adjust' and not work in Bangalore.",
];

const FAQS: { cat: 'PRODUCT' | 'PRIVACY' | 'BILLING' | 'FOR PARENTS'; q: string; a: string }[] = [
  {
    cat: 'PRODUCT',
    q: "Is this like a matrimonial app?",
    a: "No. RokaMaybe doesn't show you new matches or connect you with other users. It's a personal tracker for the prospects you're already meeting — whether they come from matrimonial sites, pandits, relatives, or family friends. Think of it as your private dashboard for your own search.",
  },
  {
    cat: 'PRODUCT',
    q: "Do I need to download an app?",
    a: "Nope. RokaMaybe runs in your browser — phone or laptop, doesn't matter. On your phone, you can 'Add to Home Screen' so it feels exactly like a regular app.",
  },
  {
    cat: 'PRODUCT',
    q: "How does the biodata AI thing work?",
    a: "You upload a biodata PDF, Word doc, or photo. AI reads it and fills in the form — name, age, family details, kundli info, all of it. Saves you a lot of typing. You can review and edit anything before saving.",
  },
  {
    cat: 'PRODUCT',
    q: "Is the kundli matching reliable?",
    a: "The calculations are based on real Vedic astronomy — we compute the Moon's position from the birth details and run the full 36-point Ashtakoot. It's accurate for reference. That said, astrology is a deep subject and we always recommend consulting a qualified pandit before making any final decisions. Think of RokaMaybe's kundli score as a starting point, not the final word.",
  },
  {
    cat: 'PRODUCT',
    q: "Who built this?",
    a: "Me — Komal. I built RokaMaybe because I was going through my own rishta search and couldn't find anything that actually helped. If you have feedback or run into issues, email me directly: komal.singhania1222@gmail.com",
  },
  {
    cat: 'PRIVACY',
    q: "Is my data actually safe?",
    a: "Yes. Your data lives on secure encrypted servers, and only you can see it. We don't share profiles between users, we don't sell data, and we don't show your information to anyone. You can delete your account and all your data any time you want.",
  },
  {
    cat: 'BILLING',
    q: "Can I cancel Premium?",
    a: "Of course. Cancel anytime — Premium stays active until the end of whatever period you paid for, then you go back to the free tier. You keep all your data.",
  },
  {
    cat: 'FOR PARENTS',
    q: "Can my parents use it with me?",
    a: "Right now it's a single-user tracker. Shared family access (Mummy Mode) is coming soon. For now, many people just sign in from their laptop when parents want to review together.",
  },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [chaosChecked, setChaosChecked] = useState<boolean[]>([false, false, false]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [mummyEmail, setMummyEmail] = useState('');
  const [mummySaved, setMummySaved] = useState(false);
  const [shuffledFlags] = useState(() => [...RED_FLAGS_LIST].sort(() => Math.random() - 0.5));

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('rm.banner.dismissed') : null;
    setBannerDismissed(stored === '1');
  }, []);

  const dismissBanner = () => {
    setBannerDismissed(true);
    try { localStorage.setItem('rm.banner.dismissed', '1'); } catch {}
  };

  const handleMummyNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mummyEmail.trim()) return;
    try { localStorage.setItem('rm.mummy.email', mummyEmail.trim()); } catch {}
    setMummySaved(true);
    toast.success("We'll email you the moment Mummy Mode launches.");
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (user) router.replace('/dashboard');
      else setAuthLoading(false);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const waText = encodeURIComponent(
    'I know आपको रोज़ updates चाहिए. I know you\'re worried. I know अंकल की बेटी is already engaged.\n\nमैं ignore नहीं कर रही हूँ. I\'m being careful. यह मेरी ज़िन्दगी का सबसे बड़ा decision है, and I want to make it right — not fast.\n\nमैंने RokaMaybe use करना शुरू किया है. Every prospect is tracked. Every conversation logged. Every kundli matched. इस weekend साथ बैठते हैं, I\'ll show you everything.\n\nTry it: ' + (typeof window !== 'undefined' ? window.location.href : 'https://rokamaybe.in')
  );

  const bannerH = bannerDismissed ? 0 : 36;
  const navH = scrolled ? 56 : 64;
  const navTop = bannerDismissed ? 0 : 36;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5ede0' }}>
        <Logo style={{ fontSize: '2.5rem' }} />
      </div>
    );
  }

  return (
    <>
      {/* Global styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        html { scroll-behavior: smooth; }
        @keyframes marqueeScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .marquee-track:hover .marquee-inner { animation-play-state: paused !important; }
      `}} />

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}

      {/* 2. LAUNCH DISCOUNT BANNER */}
      {!bannerDismissed && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          height: '36px', background: '#1a1410',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 40px',
        }}>
          <p style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '13px', color: '#f5ede0', fontWeight: 500, textAlign: 'center',
            lineHeight: 1.2, margin: 0, whiteSpace: 'nowrap',
          }}>
            🎉 Launch offer: First 50 users get Premium at <span style={{ color: '#b8892b', fontWeight: 700 }}>₹299</span> for 3 months. Limited seats.
          </p>
          <button
            onClick={dismissBanner}
            aria-label="Dismiss banner"
            style={{
              position: 'absolute', right: '12px',
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#f5ede0', fontSize: '1.1rem', lineHeight: 1,
              background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, borderRadius: 6,
            }}
          >×</button>
        </div>
      )}

      {/* 1. STICKY NAVBAR */}
      <nav
        aria-label="Main navigation"
        style={{
          position: 'fixed', top: navTop, left: 0, right: 0, zIndex: 40,
          height: `${navH}px`, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: `0 ${scrolled ? 20 : 24}px`,
          background: '#c13e2a',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
          boxShadow: scrolled ? '0 2px 14px rgba(0,0,0,0.12)' : 'none',
          transition: 'height 0.25s ease, padding 0.25s ease, box-shadow 0.25s ease',
        }}
      >
        <Logo dark style={{ fontSize: scrolled ? '1.25rem' : '1.45rem', transition: 'font-size 0.25s ease' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: '14px', fontWeight: 500, color: '#ffffff',
              background: 'transparent', border: 'none',
              borderRadius: '8px', padding: '10px 14px', cursor: 'pointer',
              minHeight: 44,
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: '14px', fontWeight: 700, color: '#c13e2a',
              background: '#ffffff',
              border: 'none', borderRadius: '8px', padding: '10px 18px',
              cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
              minHeight: 44,
            }}
          >
            Start Free
          </button>
        </div>
      </nav>

      <main style={{ background: '#f5ede0', paddingTop: bannerH + navH }}>

        {/* 3. HERO */}
        <section style={{
          maxWidth: '860px', margin: '0 auto',
          padding: 'clamp(48px,8vw,80px) 24px clamp(40px,6vw,64px)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Radial sindoor glow */}
          <div style={{
            position: 'absolute', top: '18%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px', height: '400px',
            maxWidth: '100%',
            background: 'radial-gradient(ellipse at center, rgba(193,62,42,0.07) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          {/* Logotype */}
          <Logo style={{ fontSize: 'clamp(48px, 8vw, 100px)', display: 'block', marginBottom: '20px', lineHeight: 1.05 }} />
          <p style={{
            fontFamily: 'var(--font-instrument, serif)',
            fontSize: 'clamp(18px, 2.4vw, 22px)',
            color: '#6b5e4d', fontStyle: 'italic',
            marginBottom: '20px',
          }}>
            Before every roka, there&apos;s a year of maybes.
          </p>
          <p style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '16px',
            color: '#6b5e4d', lineHeight: 1.6,
            maxWidth: '520px', margin: '0 auto 28px',
          }}>
            The calm, private dashboard for your rishta search. Track every prospect, kundli, and conversation in one place.
          </p>

          {/* Single primary CTA */}
          <button
            onClick={() => setShowModal(true)}
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontWeight: 700, fontSize: '16px', color: '#c13e2a',
              background: '#ffffff',
              border: 'none', borderRadius: '12px', padding: '16px 36px',
              cursor: 'pointer', boxShadow: '0 6px 22px rgba(193,62,42,0.22)',
              letterSpacing: '0.01em',
              minHeight: 52, outline: '2px solid #c13e2a',
            }}
          >
            Start Free — No credit card needed
          </button>
          <p style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '13px', color: '#6b5e4d', marginTop: '12px',
          }}>
            Takes 2 minutes to set up · Cancel anytime · Private by default
          </p>

          {/* Product mockup — browser chrome */}
          <div style={{ marginTop: 48, position: 'relative' }}>
            <div style={{
              maxWidth: 720, margin: '0 auto',
              background: '#ffffff',
              border: '1px solid #d6c9b0',
              borderRadius: 14,
              boxShadow: '0 20px 60px rgba(26,20,16,0.12), 0 4px 14px rgba(26,20,16,0.06)',
              overflow: 'hidden',
              textAlign: 'left',
            }}>
              {/* Browser chrome */}
              <div style={{
                background: '#ece3d2', padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 6,
                borderBottom: '1px solid #d6c9b0',
              }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffbd2e' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840' }} />
                <span style={{
                  marginLeft: 12, flex: 1,
                  background: '#f5ede0', borderRadius: 6, padding: '3px 10px',
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: 11, color: '#6b5e4d',
                }}>rokamaybe.com/dashboard</span>
              </div>
              {/* App header in mockup */}
              <div style={{
                background: '#c13e2a', padding: '12px 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <Logo dark style={{ fontSize: 18 }} />
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: '#ffffff', color: '#1a1410',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 11, fontWeight: 700,
                }}>P</div>
              </div>
              {/* Stat cards */}
              <div style={{ padding: 18, background: '#f5ede0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'Prospects', value: '7', color: '#c13e2a' },
                    { label: 'Active', value: '5', color: '#1a1410' },
                    { label: 'Avg Match', value: '62%', color: '#2D6B4F' },
                  ].map((s) => (
                    <div key={s.label} style={{
                      background: '#ffffff', borderRadius: 8, padding: '10px 8px',
                      border: '1px solid #d6c9b0', borderTop: `3px solid ${s.color}`,
                      textAlign: 'center',
                    }}>
                      <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1 }}>
                        {s.value}
                      </div>
                      <div style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 10, color: '#6b5e4d', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Prospect rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { name: 'Aarav M.', meta: '28 · Bengaluru · Joint family', score: '78%', stage: 'Kundli matched', stageColor: '#c13e2a' },
                    { name: 'Rohan K.', meta: '30 · Mumbai · Nuclear', score: '64%', stage: 'Called', stageColor: '#1a1410' },
                    { name: 'Sneha P.', meta: '27 · Pune · Joint family', score: '52%', stage: 'New biodata', stageColor: '#6b5e4d' },
                  ].map((p) => (
                    <div key={p.name} style={{
                      background: '#ffffff', borderRadius: 8, padding: '10px 12px',
                      border: '1px solid #d6c9b0',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: '#f5ede0', border: '1px solid #d6c9b0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-fraunces, serif)', fontSize: 13, fontWeight: 600, color: '#c13e2a',
                      }}>{p.name[0]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 13, fontWeight: 600, color: '#1a1410' }}>
                          {p.name}
                        </div>
                        <div style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 11, color: '#6b5e4d' }}>
                          {p.meta}
                        </div>
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 10, fontWeight: 600,
                        color: '#ffffff', background: p.stageColor,
                        padding: '3px 8px', borderRadius: 99, whiteSpace: 'nowrap',
                      }}>{p.stage}</span>
                      <span style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 14, fontWeight: 700, color: '#c13e2a', minWidth: 40, textAlign: 'right' }}>
                        {p.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: 12, color: '#6b5e4d', marginTop: 12,
            }}>
              A peek at your dashboard.
            </p>
          </div>
        </section>

        {/* 4. CHAOS QUIZ */}
        <FadeSection style={{ padding: '48px 24px 60px', background: '#ffffff' }}>
          <div style={{
            maxWidth: '600px', margin: '0 auto',
            background: '#fff', border: '1px solid #d6c9b0',
            borderRadius: '16px', padding: '32px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
          }}>
            <SectionLabel>QUICK CHECK</SectionLabel>
            <h2 style={{
              fontFamily: 'var(--font-instrument, serif)',
              fontSize: 'clamp(1.5rem, 4vw, 2.1rem)',
              color: '#1a1410', fontWeight: 600, marginBottom: '24px',
            }}>
              How much chaos are you in?
            </h2>
            {[
              "Tracking 5+ prospects across different platforms",
              "Forgotten at least one person's name in the last month",
              "Had the same kundli conversation with 3 different pandits",
            ].map((text, i) => (
              <label
                key={i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '14px',
                  padding: '14px 0', cursor: 'pointer',
                  borderBottom: i < 2 ? '1px solid #d6c9b0' : 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={chaosChecked[i]}
                  onChange={() => setChaosChecked(prev => {
                    const n = [...prev]; n[i] = !n[i]; return n;
                  })}
                  style={{
                    width: '20px', height: '20px', marginTop: '2px',
                    accentColor: '#c13e2a', cursor: 'pointer', flexShrink: 0,
                  }}
                />
                <span style={{
                  fontFamily: 'var(--font-fraunces, sans-serif)',
                  fontSize: '1rem', color: '#1a1410', lineHeight: 1.45,
                }}>
                  {text}
                </span>
              </label>
            ))}
            {chaosChecked.some(Boolean) && (
              <p style={{
                fontFamily: 'var(--font-instrument, serif)',
                fontSize: '1.2rem', color: '#c13e2a', fontStyle: 'italic',
                marginTop: '20px',
                animation: 'fadeSlideIn 0.4s ease',
              }}>
                Checked even one? You need RokaMaybe.
              </p>
            )}
          </div>
        </FadeSection>

        {/* 5. PERSONAL STORY */}
        <FadeSection style={{ padding: '60px 24px', background: '#f5ede0' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <SectionLabel>THE WHY</SectionLabel>
            <h2 style={{
              fontFamily: 'var(--font-instrument, serif)',
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              color: '#1a1410', fontWeight: 600, marginBottom: '24px',
            }}>
              Honestly? I built this because I was losing it.
            </h2>
            <p style={{ fontFamily: 'var(--font-fraunces, sans-serif)', fontSize: '1rem', color: '#6b5e4d', lineHeight: 1.85, marginBottom: '20px' }}>
              You know how it goes. Biodatas piling up in WhatsApp. Your dad's friend sent 'a very good profile' last Tuesday and you can't find it. The pandit gave you a kundli report on paper and you've already lost it. You had a call with someone last week and now you can't remember if he was the one who wanted to move abroad or the one with the joint family in Jaipur. Your mom keeps asking for updates. You don't have updates. You just have chaos.
            </p>
            <p style={{ fontFamily: 'var(--font-fraunces, sans-serif)', fontSize: '1rem', color: '#6b5e4d', lineHeight: 1.85 }}>
              Matrimonial apps don't fix this. They just add more profiles to the chaos. Pandits don't fix it. Relatives definitely don't fix it. So I built RokaMaybe — the thing I wished existed when I started my own search.
            </p>
          </div>
        </FadeSection>

        {/* 6. SOLUTION */}
        <FadeSection style={{ padding: '60px 24px', background: '#fff' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <SectionLabel>THE WHAT</SectionLabel>
            <h2 style={{
              fontFamily: 'var(--font-instrument, serif)',
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              color: '#1a1410', fontWeight: 600, marginBottom: '24px',
            }}>
              One place for everything.
            </h2>
            <p style={{ fontFamily: 'var(--font-fraunces, sans-serif)', fontSize: '1rem', color: '#6b5e4d', lineHeight: 1.85, marginBottom: '20px' }}>
              Upload a biodata — AI reads every detail and fills it in for you. Track each person through stages, from first introduction to final yes-or-no. Log your calls so you don't forget what you talked about. Rate the family separately from the person. Flag the weird stuff before you forget it. And when it's time to decide, compare them side by side — not just on income and education, but on everything that actually matters.
            </p>
            <p style={{ fontFamily: 'var(--font-fraunces, sans-serif)', fontSize: '1rem', color: '#6b5e4d', lineHeight: 1.85 }}>
              This is not another matrimonial site. This is the quiet, private dashboard you actually needed.
            </p>
          </div>
        </FadeSection>

        {/* 7. FEATURES GRID */}
        <FadeSection style={{ padding: '72px 24px', background: '#faf4e8' }}>
          <div style={{ maxWidth: '940px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <SectionLabel>WHAT YOU GET</SectionLabel>
              <h2 style={{
                fontFamily: 'var(--font-instrument, serif)',
                fontSize: 'clamp(32px, 5vw, 42px)',
                color: '#1a1410', fontWeight: 600,
              }}>
                Everything your rishta search needs.
              </h2>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))',
              gap: '20px', marginBottom: '20px',
            }}>
              <FeatureCard
                icon={<IconDoc />}
                title="AI reads biodatas for you"
                body="Drop a PDF, Word doc, or screenshot. In 30 seconds, every field is filled — name, age, family, kundli details, the works."
              />
              <FeatureCard
                icon={<IconSparkle />}
                title="Real kundli matching, not a gimmick"
                body="Full 36-point Ashtakoot Milan from actual birth details. Nadi, Bhakut, Gana dosha — all flagged automatically. Always consult a pandit for final guidance."
              />
              <FeatureCard
                icon={<IconTarget />}
                title="11 stages from 'new biodata' to 'mutually interested'"
                body="Know exactly where each conversation stands. Never again answer 'haan haan unko call karungi' when you've been saying that for three weeks."
              />
              <FeatureCard
                icon={<IconPhone />}
                title="Log every call like a journal"
                body="Who you talked to, what you discussed, how you felt after. So next Sunday when your mom asks, you actually have answers."
              />
              <FeatureCard
                icon={<IconFamily />}
                title="Rate the family separately"
                body="Sometimes the person is lovely and the family is a red flag factory. Eight dimensions, five stars each. You'll know."
              />
              <FeatureCard
                icon={<IconCompare />}
                title="Decision Matrix for when it's time to decide"
                body="Compare 2 or 3 prospects side by side on 18 things. The best kundli isn't always the right one. See the full picture."
              />
            </div>
            {/* Mummy Mode email capture */}
            <div style={{
              background: '#ffffff',
              border: '1.5px dashed #c13e2a',
              borderRadius: '12px', padding: '24px',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ color: '#c13e2a', flexShrink: 0, display: 'inline-flex' }}><IconSparkle /></span>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-fraunces, serif)',
                    fontSize: '20px', fontWeight: 600, color: '#1a1410', marginBottom: '4px',
                  }}>
                    Mummy Mode — coming soon
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-dm-sans, sans-serif)',
                    fontSize: '14px', color: '#6b5e4d',
                  }}>
                    A parent-friendly view with bigger fonts, Hindi labels, and simpler flow.
                  </div>
                </div>
              </div>
              {mummySaved ? (
                <p style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: 13, color: '#2D6B4F', fontWeight: 600,
                }}>
                  ✓ You&apos;re on the list. We&apos;ll email you at launch.
                </p>
              ) : (
                <form onSubmit={handleMummyNotify} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    required
                    value={mummyEmail}
                    onChange={(e) => setMummyEmail(e.target.value)}
                    placeholder="Email address"
                    style={{ flex: 1, minWidth: 200, fontSize: 14 }}
                  />
                  <button
                    type="submit"
                    style={{
                      fontFamily: 'var(--font-dm-sans, sans-serif)',
                      fontWeight: 700, fontSize: 14, color: '#f5ede0',
                      background: '#c13e2a', border: 'none', borderRadius: 10,
                      padding: '0 20px', cursor: 'pointer', minHeight: 44,
                    }}
                  >
                    Notify Me
                  </button>
                </form>
              )}
            </div>
          </div>
        </FadeSection>

        {/* 8. HOW IT WORKS */}
        <FadeSection id="how-it-works" style={{ padding: '60px 24px', background: '#fff' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <SectionLabel>GETTING STARTED</SectionLabel>
            <h2 style={{
              fontFamily: 'var(--font-instrument, serif)',
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              color: '#1a1410', fontWeight: 600, marginBottom: '48px',
            }}>
              Three steps. Fifteen minutes.
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '32px', marginBottom: '40px',
            }}>
              {[
                { num: '1', title: 'Sign up', body: 'Google or email, takes 30 seconds.' },
                { num: '2', title: 'Quick preference setup (2 minutes)', body: 'Pick from pills — city, age range, diet, income, family type. Done.' },
                { num: '3', title: 'Start adding prospects', body: 'One by one, or bulk upload biodatas (PDF, Word, or photo).' },
              ].map(({ num, title, body }) => (
                <div key={num}>
                  <div style={{
                    fontFamily: 'var(--font-instrument, serif)',
                    fontSize: '3.5rem', fontWeight: 700, color: '#c13e2a',
                    lineHeight: 1, marginBottom: '14px',
                  }}>
                    {num}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-instrument, serif)',
                    fontSize: '1.2rem', fontWeight: 600, color: '#1a1410', marginBottom: '8px',
                  }}>
                    {title}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-fraunces, sans-serif)',
                    fontSize: '0.9rem', color: '#6b5e4d',
                  }}>
                    {body}
                  </div>
                </div>
              ))}
            </div>
            <p style={{
              fontFamily: 'var(--font-instrument, serif)',
              fontSize: '1.15rem', fontStyle: 'italic', color: '#6b5e4d',
            }}>
              That's it. You'll wonder how you managed without it.
            </p>
          </div>
        </FadeSection>

        {/* 9. RED FLAG WALL */}
        <FadeSection style={{ padding: '72px 0', overflow: 'hidden', background: '#f5ede0' }}>
          <div style={{
            maxWidth: '800px', margin: '0 auto 36px',
            padding: '0 24px', textAlign: 'center',
          }}>
            <SectionLabel>FROM THE FIELD</SectionLabel>
            <h2 style={{
              fontFamily: 'var(--font-instrument, serif)',
              fontSize: 'clamp(32px, 5vw, 42px)',
              color: '#1a1410', fontWeight: 600, marginBottom: '8px',
            }}>
              Real red flags people have flagged.
            </h2>
            <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '14px', color: '#6b5e4d' }}>
              Shared with permission. The rishta search is wild out there.
            </p>
          </div>
          <div className="marquee-track" style={{ overflow: 'hidden', position: 'relative', padding: '16px 0' }}>
            <div
              className="marquee-inner"
              style={{
                display: 'flex',
                gap: '22px',
                width: 'max-content',
                animation: 'marqueeScroll 40s linear infinite',
                paddingLeft: '24px',
                alignItems: 'center',
              }}
            >
              {[...shuffledFlags, ...shuffledFlags].map((flag, i) => {
                const rots = [-2, 1, -1, 2, -1.5, 1.5];
                const widths = [290, 320, 280, 310, 295, 315];
                return (
                  <div
                    key={i}
                    style={{
                      width: `${widths[i % widths.length]}px`, flexShrink: 0,
                      background: '#ffffff',
                      border: '1px solid #d6c9b0',
                      borderRadius: '10px', padding: '22px 20px',
                      boxShadow: '0 6px 18px rgba(26,20,16,0.08)',
                      transform: `rotate(${rots[i % rots.length]}deg)`,
                      position: 'relative',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: -6, left: 12,
                      fontFamily: 'var(--font-instrument, serif)',
                      fontSize: 44, color: '#e8c870', lineHeight: 1, fontStyle: 'italic',
                    }}>&ldquo;</span>
                    <p style={{
                      fontFamily: 'var(--font-dm-sans, sans-serif)',
                      fontSize: '14px', color: '#1a1410', lineHeight: 1.6,
                      paddingTop: 4,
                    }}>
                      {flag}
                    </p>
                    <p style={{
                      fontFamily: 'var(--font-dm-sans, sans-serif)',
                      fontSize: 10, color: '#6b5e4d', marginTop: 10, letterSpacing: '0.06em',
                    }}>
                      — Shared with permission
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <p style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '13px', color: '#6b5e4d',
            textAlign: 'center', marginTop: '28px', padding: '0 24px',
          }}>
            Have your own red flag story? Log it inside RokaMaybe.
          </p>
        </FadeSection>

        {/* 10. FOUNDER TESTIMONIAL */}
        <FadeSection style={{ padding: '60px 24px', textAlign: 'center', background: '#fff' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            {/* TODO: Replace placeholder with actual photo at /public/komal.jpg once uploaded */}
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%',
              background: '#d6c9b0', margin: '0 auto 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: 'var(--font-instrument, serif)',
                fontSize: '2rem', color: '#c13e2a', fontWeight: 600,
              }}>
                KS
              </span>
            </div>
            <blockquote style={{
              fontFamily: 'var(--font-instrument, serif)',
              fontSize: 'clamp(1.1rem, 3vw, 1.3rem)',
              color: '#1a1410', fontStyle: 'italic',
              lineHeight: 1.75, marginBottom: '16px',
            }}>
              "I started this project because I was going through my own search and was losing my mind tracking everything. RokaMaybe was my sanity tool before it was an app. Now it's yours too."
            </blockquote>
            <p style={{
              fontFamily: 'var(--font-fraunces, sans-serif)',
              fontSize: '0.9rem', color: '#c13e2a', fontWeight: 600,
            }}>
              — Komal Singhania, Founder
            </p>
          </div>
        </FadeSection>

        {/* 11. PRICING */}
        <FadeSection style={{ padding: '72px 24px', background: '#faf4e8' }}>
          <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
            <SectionLabel>PRICING</SectionLabel>
            <h2 style={{
              fontFamily: 'var(--font-instrument, serif)',
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              color: '#1a1410', fontWeight: 600, marginBottom: '40px',
            }}>
              Start free. Upgrade when you need more.
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px', marginBottom: '20px',
            }}>
              {/* Free */}
              <div style={{
                background: '#ffffff', border: '1px solid #d6c9b0',
                borderRadius: '12px', padding: '32px', textAlign: 'left',
              }}>
                <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: '22px', fontWeight: 700, color: '#1a1410', marginBottom: '8px' }}>Free</div>
                <div style={{ fontFamily: 'var(--font-instrument, serif)', fontSize: '44px', fontWeight: 700, color: '#1a1410', lineHeight: 1 }}>₹0</div>
                <div style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '13px', color: '#6b5e4d', marginBottom: '24px' }}>forever</div>
                {[
                  { ok: true, label: 'Track up to 3 prospects' },
                  { ok: true, label: 'Basic kundli calculation' },
                  { ok: true, label: 'Conversation tracker' },
                  { ok: false, label: 'AI biodata extraction' },
                  { ok: false, label: 'Full Ashtakoot report' },
                  { ok: false, label: 'Decision matrix' },
                ].map(({ ok, label }, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    marginBottom: '10px',
                    fontFamily: 'var(--font-dm-sans, sans-serif)',
                    fontSize: '14px', color: ok ? '#1a1410' : '#b0a390',
                    textDecoration: ok ? 'none' : 'line-through',
                  }}>
                    <span style={{ color: ok ? '#c13e2a' : '#C0B0A0', fontWeight: 700, fontSize: '15px', width: 16, display: 'inline-block' }}>
                      {ok ? '✓' : '✗'}
                    </span>
                    {label}
                  </div>
                ))}
                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    marginTop: '20px', width: '100%',
                    fontFamily: 'var(--font-dm-sans, sans-serif)',
                    fontWeight: 600, fontSize: '14px', color: '#c13e2a',
                    background: 'transparent', border: '1.5px solid #c13e2a',
                    borderRadius: '10px', padding: '12px', cursor: 'pointer',
                    minHeight: 44,
                  }}
                >
                  Get Started Free
                </button>
              </div>

              {/* Premium */}
              <div style={{
                background: '#ffffff', border: '1px solid #d6c9b0',
                borderTop: '3px solid #c13e2a',
                borderRadius: '12px', padding: '36px 32px', textAlign: 'left',
                position: 'relative', boxShadow: '0 18px 44px rgba(193,62,42,0.18)',
                transform: 'translateY(-4px)',
              }}>
                <div style={{
                  position: 'absolute', top: '-14px', left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#c13e2a',
                  color: '#ffffff', fontSize: '11px', fontWeight: 700,
                  letterSpacing: '0.18em', padding: '5px 14px', borderRadius: '999px',
                  fontFamily: 'var(--font-dm-sans, sans-serif)', whiteSpace: 'nowrap',
                  boxShadow: '0 4px 14px rgba(193,62,42,0.3)',
                }}>
                  RECOMMENDED
                </div>
                <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: '22px', fontWeight: 700, color: '#1a1410', marginBottom: '8px' }}>Premium</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                  <del style={{ fontFamily: 'var(--font-instrument, serif)', fontSize: '22px', color: '#6b5e4d' }}>₹499</del>
                  <span style={{ fontFamily: 'var(--font-instrument, serif)', fontSize: '44px', fontWeight: 700, color: '#c13e2a', lineHeight: 1 }}>₹299</span>
                  <span style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '13px', color: '#6b5e4d' }}>/ 3 months</span>
                </div>
                <div style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '12px', color: '#c13e2a', fontWeight: 600, marginBottom: '4px' }}>
                  Launch price for first 50 users
                </div>
                <div style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '13px', color: '#6b5e4d', marginBottom: '16px' }}>or ₹1,299 / year</div>

                {/* Scarcity bar */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 11, color: '#6b5e4d', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                    <span>12 of 50 seats claimed</span>
                    <span style={{ color: '#c13e2a' }}>38 left</span>
                  </div>
                  <div style={{ height: 6, background: '#ece3d2', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '24%', height: '100%', background: 'linear-gradient(90deg,#c13e2a,#e8c870)' }} />
                  </div>
                </div>

                {[
                  'Everything in Free',
                  'Unlimited prospects',
                  'AI biodata extraction',
                  'Full Ashtakoot kundli report',
                  'Family scorecard (8 dimensions)',
                  'Meeting planner with checklists',
                  'Decision matrix',
                  'Activity timeline',
                ].map((label, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    marginBottom: '10px',
                    fontFamily: 'var(--font-dm-sans, sans-serif)',
                    fontSize: '14px', color: '#1a1410',
                  }}>
                    <span style={{ color: '#c13e2a', fontWeight: 700, fontSize: '15px', width: 16, display: 'inline-block' }}>✓</span>
                    {label}
                  </div>
                ))}
                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    marginTop: '20px', width: '100%',
                    fontFamily: 'var(--font-dm-sans, sans-serif)',
                    fontWeight: 700, fontSize: '14px', color: '#ffffff',
                    background: '#c13e2a',
                    border: 'none', borderRadius: '10px', padding: '14px',
                    cursor: 'pointer', boxShadow: '0 6px 16px rgba(193,62,42,0.28)',
                    minHeight: 48,
                  }}
                >
                  Upgrade to Premium
                </button>
              </div>
            </div>
            <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '13px', color: '#6b5e4d' }}>
              Cancel anytime. Your data is always yours.
            </p>
          </div>
        </FadeSection>

        {/* 12. ANTI-FEATURES */}
        <FadeSection style={{ padding: '72px 24px', background: '#ffffff' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <SectionLabel>REAL TALK</SectionLabel>
            <h2 style={{
              fontFamily: 'var(--font-instrument, serif)',
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              color: '#1a1410', fontWeight: 600, marginBottom: '32px',
            }}>
              What RokaMaybe doesn't do.
            </h2>
            <div style={{ textAlign: 'left', display: 'inline-block' }}>
              {[
                "We don't show you new matches. (Not a matrimonial site.)",
                "We don't let anyone see your data. (Not a social platform.)",
                "We don't run ads or sell your profile. (Not that kind of business.)",
                "We don't promise you'll find someone. (Nobody can.)",
                "We don't replace your pandit. (Always consult one for kundli decisions.)",
              ].map((text, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '14px',
                  marginBottom: '18px',
                  fontFamily: 'var(--font-fraunces, sans-serif)',
                  fontSize: '1rem', color: '#1a1410',
                }}>
                  <span style={{ color: '#c13e2a', fontWeight: 700, flexShrink: 0, fontSize: '1.1rem', lineHeight: 1.4 }}>✗</span>
                  {text}
                </div>
              ))}
            </div>
            <p style={{
              fontFamily: 'var(--font-instrument, serif)',
              fontSize: '1.3rem', fontStyle: 'italic', color: '#c13e2a',
              marginTop: '28px',
            }}>
              "We just organize your search. That's it. That's the whole thing."
            </p>
          </div>
        </FadeSection>

        {/* 12b. TRUST & PRIVACY */}
        <FadeSection style={{ padding: '72px 24px', background: '#faf4e8' }}>
          <div style={{ maxWidth: 980, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <SectionLabel>TRUST &amp; PRIVACY</SectionLabel>
              <h2 style={{
                fontFamily: 'var(--font-instrument, serif)',
                fontSize: 'clamp(30px, 4.5vw, 38px)',
                color: '#1a1410', fontWeight: 600,
              }}>
                Your data is yours. We mean it.
              </h2>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 16,
            }}>
              {[
                { Icon: IconLock, text: 'End-to-end private — only you see your data' },
                { Icon: IconNoAds, text: 'No ads, ever' },
                { Icon: IconExport, text: 'Export your data anytime' },
                { Icon: IconTrash, text: 'Delete everything in one click' },
                { Icon: IconIndia, text: 'Made in India, data stored in India' },
              ].map(({ Icon, text }, i) => (
                <div key={i} style={{
                  background: '#ffffff', border: '1px solid #d6c9b0',
                  borderRadius: 10, padding: '22px 18px',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
                }}>
                  <span style={{ color: '#c13e2a', display: 'inline-flex' }}><Icon /></span>
                  <p style={{
                    fontFamily: 'var(--font-dm-sans, sans-serif)',
                    fontSize: 14, color: '#1a1410', lineHeight: 1.5, fontWeight: 500, margin: 0,
                  }}>
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeSection>

        {/* 13. DEAR MUMMY LETTER */}
        <FadeSection style={{ padding: '72px 24px', background: '#f5ede0' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <SectionLabel>A LETTER</SectionLabel>
            </div>
            <div style={{
              background: '#f5ede0', borderRadius: '16px', padding: '40px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              border: '1px solid #d6c9b0',
            }}>
              <p style={{
                fontFamily: 'var(--font-instrument, serif)',
                fontSize: '1.3rem', fontWeight: 700, color: '#1a1410',
                marginBottom: '20px',
              }}>
                Dear Mummy,
              </p>
              <div style={{
                fontFamily: 'var(--font-instrument, serif)',
                fontSize: '1.1rem', color: '#1a1410',
                lineHeight: 2, fontStyle: 'italic',
              }}>
                <p style={{ marginBottom: '18px' }}>
                  I know आपको रोज़ updates चाहिए. I know you're worried. I know अंकल की बेटी is already engaged.
                </p>
                <p style={{ marginBottom: '18px' }}>
                  मैं ignore नहीं कर रही हूँ. I'm being careful. यह मेरी ज़िन्दगी का सबसे बड़ा decision है, and I want to make it right — not fast.
                </p>
                <p style={{ marginBottom: '18px' }}>
                  मैंने RokaMaybe use करना शुरू किया है. Every prospect is tracked. Every conversation logged. Every kundli matched. इस weekend साथ बैठते हैं, I'll show you everything.
                </p>
                <p>
                  Love,<br />Your daughter
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <p style={{ fontFamily: 'var(--font-fraunces, sans-serif)', fontSize: '0.85rem', color: '#6b5e4d', marginBottom: '14px' }}>
                Share this with your mom. She'll get it.
              </p>
              <a
                href={`https://wa.me/?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  fontFamily: 'var(--font-fraunces, sans-serif)',
                  fontWeight: 600, fontSize: '0.9rem', color: '#fff',
                  background: '#25D366', borderRadius: '10px',
                  padding: '10px 20px', textDecoration: 'none',
                }}
              >
                <WhatsAppIcon /> Share on WhatsApp
              </a>
            </div>
          </div>
        </FadeSection>

        {/* 14. FOR THE DAD ON WHATSAPP */}
        <FadeSection style={{ padding: '72px 24px', background: '#ffffff' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <SectionLabel>FOR PARENTS</SectionLabel>
            <h2 style={{
              fontFamily: 'var(--font-instrument, serif)',
              fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
              color: '#1a1410', fontWeight: 600, marginBottom: '20px',
            }}>
              Helping your child's rishta search?
            </h2>
            <p style={{
              fontFamily: 'var(--font-fraunces, sans-serif)',
              fontSize: '1rem', color: '#6b5e4d', lineHeight: 1.75, marginBottom: '28px',
            }}>
              You've probably forwarded 20 biodatas on WhatsApp this month. Your child has probably seen half of them. RokaMaybe helps them organize everything you send — and when it's time to decide, you can sit together and compare properly. Ask them to try it.
            </p>
            <button
              onClick={handleCopyLink}
              style={{
                fontFamily: 'var(--font-fraunces, sans-serif)',
                fontWeight: 600, fontSize: '0.9rem', color: '#c13e2a',
                background: 'transparent', border: '1.5px solid #c13e2a',
                borderRadius: '10px', padding: '12px 24px', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {linkCopied ? '✓ Link copied!' : 'Send them the link'}
            </button>
          </div>
        </FadeSection>

        {/* 15. FAQ */}
        <FadeSection style={{ padding: '72px 24px', background: '#ffffff' }}>
          <div style={{ maxWidth: '740px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <SectionLabel>COMMON QUESTIONS</SectionLabel>
              <h2 style={{
                fontFamily: 'var(--font-instrument, serif)',
                fontSize: 'clamp(32px, 5vw, 42px)',
                color: '#1a1410', fontWeight: 600,
              }}>
                A few things people ask.
              </h2>
            </div>
            {(['PRODUCT', 'PRIVACY', 'BILLING', 'FOR PARENTS'] as const).map((category) => {
              const items = FAQS.map((faq, i) => ({ ...faq, globalIdx: i })).filter(f => f.cat === category);
              if (items.length === 0) return null;
              return (
                <div key={category} style={{ marginBottom: 28 }}>
                  <p style={{
                    fontFamily: 'var(--font-dm-sans, sans-serif)',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
                    color: '#c13e2a', textTransform: 'uppercase',
                    marginBottom: 12,
                  }}>
                    {category}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map((faq) => {
                      const open = openFaq === faq.globalIdx;
                      return (
                        <div
                          key={faq.globalIdx}
                          style={{
                            background: '#faf4e8',
                            border: '1px solid #d6c9b0',
                            borderRadius: 10,
                            overflow: 'hidden',
                            transition: 'box-shadow 0.2s ease',
                            boxShadow: open ? '0 4px 14px rgba(26,20,16,0.06)' : 'none',
                          }}
                        >
                          <button
                            onClick={() => setOpenFaq(open ? null : faq.globalIdx)}
                            aria-expanded={open}
                            style={{
                              width: '100%', display: 'flex',
                              justifyContent: 'space-between', alignItems: 'center',
                              padding: '18px 20px', background: 'transparent',
                              border: 'none', cursor: 'pointer', textAlign: 'left', gap: '16px',
                              minHeight: 56,
                            }}
                          >
                            <span style={{
                              fontFamily: 'var(--font-fraunces, serif)',
                              fontSize: '17px', fontWeight: 600,
                              color: '#1a1410', lineHeight: 1.35,
                            }}>
                              {faq.q}
                            </span>
                            <span style={{
                              color: '#c13e2a', fontSize: '22px', flexShrink: 0,
                              transition: 'transform 0.25s ease',
                              transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
                              display: 'block', lineHeight: 1,
                              fontWeight: 300,
                            }}>
                              +
                            </span>
                          </button>
                          <div style={{
                            maxHeight: open ? 400 : 0,
                            overflow: 'hidden',
                            transition: 'max-height 0.3s ease',
                          }}>
                            <p style={{
                              fontFamily: 'var(--font-dm-sans, sans-serif)',
                              fontSize: '14px', color: '#6b5e4d',
                              lineHeight: 1.7, padding: '0 20px 20px',
                              margin: 0,
                            }}>
                              {faq.a}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </FadeSection>

        {/* 16. FINAL CTA */}
        <FadeSection style={{ padding: '88px 24px', background: '#f5ede0', textAlign: 'center' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: 'var(--font-instrument, serif)',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              color: '#1a1410', fontWeight: 600, marginBottom: '16px',
            }}>
              Ready to stop losing your mind?
            </h2>
            <p style={{
              fontFamily: 'var(--font-fraunces, sans-serif)',
              fontSize: '1rem', color: '#6b5e4d', marginBottom: '32px',
            }}>
              Free forever for the basics. Takes 30 seconds to start.
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontWeight: 700, fontSize: '17px', color: '#ffffff',
                background: '#c13e2a',
                border: 'none', borderRadius: '12px', padding: '18px 44px',
                cursor: 'pointer', boxShadow: '0 6px 22px rgba(193,62,42,0.3)',
                letterSpacing: '0.01em', minHeight: 56,
              }}
            >
              Start Free
            </button>
            <p style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: '13px', color: '#6b5e4d', marginTop: '16px',
            }}>
              No credit card required · Set up in 2 minutes · Cancel anytime
            </p>
          </div>
        </FadeSection>

        {/* 17. FOOTER */}
        <footer style={{ background: '#c13e2a', padding: '64px 24px 32px' }}>
          <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '40px', marginBottom: '40px',
            }}>
              <div>
                <Logo dark style={{ fontSize: '1.5rem', display: 'block', marginBottom: '10px' }} />
                <p style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: 14,
                }}>
                  Your rishta search, organized.
                </p>
                <p style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '13px', color: '#ffffff', fontWeight: 600, marginBottom: 4,
                }}>
                  Built by Komal Singhania
                </p>
                <p style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '12px', color: 'rgba(255,255,255,0.65)',
                }}>
                  Founder &amp; Engineer
                </p>
              </div>

              {[
                { title: 'Product', links: [
                  { label: 'Features', href: '#' },
                  { label: 'Pricing', href: '#' },
                  { label: 'How it works', href: '#how-it-works' },
                  { label: 'Mummy Mode', href: '#' },
                ] },
                { title: 'Legal', links: [
                  { label: 'Privacy', href: '#' },
                  { label: 'Terms', href: '#' },
                  { label: 'Data policy', href: '#' },
                ] },
              ].map((group) => (
                <div key={group.title}>
                  <div style={{
                    fontFamily: 'var(--font-dm-sans, sans-serif)',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
                    color: '#e8c870', marginBottom: '14px', textTransform: 'uppercase',
                  }}>
                    {group.title}
                  </div>
                  {group.links.map(link => (
                    <div key={link.label} style={{ marginBottom: '10px' }}>
                      <a
                        href={link.href}
                        style={{
                          fontFamily: 'var(--font-dm-sans, sans-serif)',
                          fontSize: '14px', color: '#f5ede0', textDecoration: 'none',
                          transition: 'color 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#f5ede0'; }}
                      >
                        {link.label}
                      </a>
                    </div>
                  ))}
                </div>
              ))}

              <div>
                <div style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
                  color: '#e8c870', marginBottom: '14px', textTransform: 'uppercase',
                }}>
                  Connect
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'Instagram', href: 'https://instagram.com/rokamaybe', svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg> },
                    { label: 'LinkedIn', href: '#', svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7"/><circle cx="8" cy="7" r="1" fill="currentColor"/><path d="M12 17v-4a2.5 2.5 0 0 1 5 0v4"/><path d="M12 10v7"/></svg> },
                    { label: 'Twitter', href: '#', svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l7 9-7 7h3l5.5-5.5L17 20h3l-7.3-9.4L19.5 4h-3l-4.8 4.8L8 4z"/></svg> },
                  ].map(s => (
                    <a
                      key={s.label}
                      href={s.href}
                      target={s.href.startsWith('http') ? '_blank' : undefined}
                      rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      aria-label={s.label}
                      style={{
                        width: 36, height: 36, borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.35)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        color: '#f5ede0', transition: 'background 0.15s ease, color 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#c13e2a'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f5ede0'; }}
                    >
                      {s.svg}
                    </a>
                  ))}
                </div>
                <a
                  href="mailto:komal.singhania1222@gmail.com"
                  style={{
                    fontFamily: 'var(--font-dm-sans, sans-serif)',
                    fontSize: '13px', color: '#f5ede0', textDecoration: 'none',
                    transition: 'color 0.15s ease', wordBreak: 'break-all',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#f5ede0'; }}
                >
                  komal.singhania1222@gmail.com
                </a>
              </div>
            </div>
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.2)',
              paddingTop: '22px',
              display: 'flex', flexWrap: 'wrap',
              justifyContent: 'space-between', gap: '8px',
            }}>
              <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
                Made with ❤️ in India · Built by Komal Singhania
              </p>
              <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
                © 2026 RokaMaybe. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
