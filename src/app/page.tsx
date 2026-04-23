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
        style={{ border: '1px solid #E8DFD3', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl leading-none"
          style={{ color: '#9A8A75' }}
          aria-label="Close"
        >×</button>

        <div className="text-center mb-6">
          <div style={{ fontFamily: 'var(--font-playfair, serif)', fontSize: '2rem', color: '#8B6914' }}>कुटुम्भ</div>
          <p style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '1rem', color: '#6B5D52', fontStyle: 'italic' }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 bg-white rounded-xl py-3.5 px-6 font-semibold transition-all hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ border: '1.5px solid #E8DFD3', color: '#1C1612', fontSize: '0.9rem' }}
        >
          {googleLoading
            ? <span className="gold-spinner" style={{ borderColor: 'rgba(139,105,20,0.2)', borderTopColor: '#8B6914', width: '18px', height: '18px' }} />
            : <GoogleIcon />
          }
          {googleLoading ? 'Signing in…' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: '#E8DFD3' }} />
          <span className="text-xs font-medium" style={{ color: '#9A8A75' }}>or</span>
          <div className="flex-1 h-px" style={{ background: '#E8DFD3' }} />
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

        <p className="text-center text-sm mt-5" style={{ color: '#6B5D52' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => setIsSignUp(!isSignUp)} className="font-semibold underline" style={{ color: '#C4A265' }}>
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
      fontFamily: 'var(--font-nunito, sans-serif)',
      fontSize: '0.68rem',
      fontWeight: 700,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: '#8B6914',
      marginBottom: '12px',
    }}>
      {children}
    </p>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────

function FeatureCard({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FBF8F3',
        border: '1px solid #E8DFD3',
        borderRadius: '16px',
        padding: '28px',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 28px rgba(0,0,0,0.09)' : '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '14px' }}>{emoji}</div>
      <div style={{
        fontFamily: 'var(--font-cormorant, serif)',
        fontSize: '1.15rem',
        fontWeight: 600,
        color: '#2C1810',
        marginBottom: '10px',
        lineHeight: 1.3,
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: 'var(--font-nunito, sans-serif)',
        fontSize: '0.88rem',
        color: '#6B5D52',
        lineHeight: 1.7,
      }}>
        {body}
      </div>
    </div>
  );
}

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

const FAQS = [
  {
    q: "Is this like a matrimonial app?",
    a: "No. Kutumbh doesn't show you new matches or connect you with other users. It's a personal tracker for the prospects you're already meeting — whether they come from matrimonial sites, pandits, relatives, or family friends. Think of it as your private dashboard for your own search.",
  },
  {
    q: "Is my data actually safe?",
    a: "Yes. Your data lives on secure encrypted servers, and only you can see it. We don't share profiles between users, we don't sell data, and we don't show your information to anyone. You can delete your account and all your data any time you want.",
  },
  {
    q: "Do I need to download an app?",
    a: "Nope. Kutumbh runs in your browser — phone or laptop, doesn't matter. On your phone, you can 'Add to Home Screen' so it feels exactly like a regular app.",
  },
  {
    q: "How does the biodata AI thing work?",
    a: "You upload a biodata PDF or a photo. AI reads it and fills in the form — name, age, family details, kundli info, all of it. Saves you a lot of typing. You can review and edit anything before saving.",
  },
  {
    q: "Is the kundli matching reliable?",
    a: "The calculations are based on real Vedic astronomy — we compute the Moon's position from the birth details and run the full 36-point Ashtakoot. It's accurate for reference. That said, astrology is a deep subject and we always recommend consulting a qualified pandit before making any final decisions. Think of Kutumbh's kundli score as a starting point, not the final word.",
  },
  {
    q: "Can I cancel Premium?",
    a: "Of course. Cancel anytime — Premium stays active until the end of whatever period you paid for, then you go back to the free tier. You keep all your data.",
  },
  {
    q: "Can my parents use it with me?",
    a: "Right now it's a single-user tracker. Shared family access (Mummy Mode) is coming soon. For now, many people just sign in from their laptop when parents want to review together.",
  },
  {
    q: "Who built this?",
    a: "Me — Komal. I built Kutumbh because I was going through my own rishta search and couldn't find anything that actually helped. If you have feedback or run into issues, email me directly: komal.singhania1222@gmail.com",
  },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [chaosChecked, setChaosChecked] = useState<boolean[]>([false, false, false]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shuffledFlags] = useState(() => [...RED_FLAGS_LIST].sort(() => Math.random() - 0.5));

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
    'I know आपको रोज़ updates चाहिए. I know you\'re worried. I know अंकल की बेटी is already engaged.\n\nमैं ignore नहीं कर रही हूँ. I\'m being careful. यह मेरी ज़िन्दगी का सबसे बड़ा decision है, and I want to make it right — not fast.\n\nमैंने Kutumbh use करना शुरू किया है. Every prospect is tracked. Every conversation logged. Every kundli matched. इस weekend साथ बैठते हैं, I\'ll show you everything.\n\nTry it: ' + (typeof window !== 'undefined' ? window.location.href : 'https://kutumbh.in')
  );

  const bannerH = bannerDismissed ? 0 : 40;
  const navTop = bannerDismissed ? 0 : 40;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FBF8F3' }}>
        <div style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '2.5rem', color: '#8B6914', fontStyle: 'italic' }}>
          कुटुम्भ
        </div>
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
          height: '40px', background: '#C9A84C',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 48px',
        }}>
          <p style={{
            fontFamily: 'var(--font-nunito, sans-serif)',
            fontSize: '0.78rem', color: '#2C1810', fontWeight: 600, textAlign: 'center',
          }}>
            🎉 Launch offer: First 50 users get Premium at ₹299 for 3 months (save ₹200). Limited seats.
          </p>
          <button
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss banner"
            style={{
              position: 'absolute', right: '16px',
              color: '#2C1810', fontSize: '1.2rem', lineHeight: 1,
              background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700,
            }}
          >×</button>
        </div>
      )}

      {/* 1. STICKY NAVBAR */}
      <nav
        aria-label="Main navigation"
        style={{
          position: 'fixed', top: navTop, left: 0, right: 0, zIndex: 40,
          height: '64px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 24px',
          background: scrolled ? 'rgba(251,248,243,0.97)' : 'transparent',
          backdropFilter: scrolled ? 'blur(8px)' : 'none',
          boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.06)' : 'none',
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-playfair, serif)',
          fontSize: '1.45rem', color: '#8B6914', fontWeight: 600,
        }}>
          कुटुम्भ
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              fontFamily: 'var(--font-nunito, sans-serif)',
              fontSize: '0.84rem', fontWeight: 600, color: '#2C1810',
              background: 'transparent', border: '1.5px solid #C9A84C',
              borderRadius: '10px', padding: '8px 16px', cursor: 'pointer',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{
              fontFamily: 'var(--font-nunito, sans-serif)',
              fontSize: '0.84rem', fontWeight: 700, color: '#fff',
              background: 'linear-gradient(135deg, #8B6914, #C9A84C)',
              border: 'none', borderRadius: '10px', padding: '8px 16px',
              cursor: 'pointer', boxShadow: '0 2px 10px rgba(139,105,20,0.3)',
            }}
          >
            Start Free
          </button>
        </div>
      </nav>

      <main style={{ background: '#FBF8F3', paddingTop: bannerH + 64 }}>

        {/* 3. HERO */}
        <section style={{
          maxWidth: '800px', margin: '0 auto',
          padding: 'clamp(60px,10vw,100px) 24px clamp(48px,8vw,80px)',
          textAlign: 'center',
        }}>
          <h1 style={{
            fontFamily: 'var(--font-cormorant, serif)',
            fontSize: 'clamp(2.8rem, 7vw, 5.2rem)',
            fontWeight: 600, color: '#2C1810', lineHeight: 1.1,
            marginBottom: '24px',
          }}>
            Rishta dekhna is a full-time job.
          </h1>
          <p style={{
            fontFamily: 'var(--font-nunito, sans-serif)',
            fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
            color: '#6B5D52', lineHeight: 1.75,
            maxWidth: '600px', margin: '0 auto 36px',
          }}>
            Biodatas in WhatsApp, pandits on call, relatives with opinions, and mummy asking for updates every evening. I went through it too. So I built Kutumbh — the calm, private dashboard for your rishta search.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
            <button
              onClick={() => setShowModal(true)}
              style={{
                fontFamily: 'var(--font-nunito, sans-serif)',
                fontWeight: 700, fontSize: '1rem', color: '#fff',
                background: 'linear-gradient(135deg, #8B6914, #C9A84C)',
                border: 'none', borderRadius: '12px', padding: '14px 32px',
                cursor: 'pointer', boxShadow: '0 4px 18px rgba(139,105,20,0.3)',
                letterSpacing: '0.02em',
              }}
            >
              Start Free
            </button>
            <a
              href="#how-it-works"
              style={{
                fontFamily: 'var(--font-nunito, sans-serif)',
                fontWeight: 600, fontSize: '1rem', color: '#8B6914',
                border: '1.5px solid #C9A84C', borderRadius: '12px',
                padding: '14px 32px', textDecoration: 'none', display: 'inline-block',
              }}
            >
              See how it works
            </a>
          </div>
          <p style={{
            fontFamily: 'var(--font-nunito, sans-serif)',
            fontSize: '0.82rem', color: '#9A8A75',
          }}>
            Works on any phone. No download needed. Completely private.
          </p>
        </section>

        {/* 4. CHAOS QUIZ */}
        <FadeSection style={{ padding: '20px 24px 60px' }}>
          <div style={{
            maxWidth: '600px', margin: '0 auto',
            background: '#fff', border: '1px solid #E8DFD3',
            borderRadius: '16px', padding: '32px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
          }}>
            <SectionLabel>QUICK CHECK</SectionLabel>
            <h2 style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: 'clamp(1.5rem, 4vw, 2.1rem)',
              color: '#2C1810', fontWeight: 600, marginBottom: '24px',
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
                  borderBottom: i < 2 ? '1px solid #E8DFD3' : 'none',
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
                    accentColor: '#8B6914', cursor: 'pointer', flexShrink: 0,
                  }}
                />
                <span style={{
                  fontFamily: 'var(--font-nunito, sans-serif)',
                  fontSize: '1rem', color: '#2C1810', lineHeight: 1.45,
                }}>
                  {text}
                </span>
              </label>
            ))}
            {chaosChecked.some(Boolean) && (
              <p style={{
                fontFamily: 'var(--font-cormorant, serif)',
                fontSize: '1.2rem', color: '#8B6914', fontStyle: 'italic',
                marginTop: '20px',
                animation: 'fadeSlideIn 0.4s ease',
              }}>
                Checked even one? You need Kutumbh.
              </p>
            )}
          </div>
        </FadeSection>

        {/* 5. PERSONAL STORY */}
        <FadeSection style={{ padding: '60px 24px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <SectionLabel>THE WHY</SectionLabel>
            <h2 style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              color: '#2C1810', fontWeight: 600, marginBottom: '24px',
            }}>
              Honestly? I built this because I was losing it.
            </h2>
            <p style={{ fontFamily: 'var(--font-nunito, sans-serif)', fontSize: '1rem', color: '#6B5D52', lineHeight: 1.85, marginBottom: '20px' }}>
              You know how it goes. Biodatas piling up in WhatsApp. Your dad's friend sent 'a very good profile' last Tuesday and you can't find it. The pandit gave you a kundli report on paper and you've already lost it. You had a call with someone last week and now you can't remember if he was the one who wanted to move abroad or the one with the joint family in Jaipur. Your mom keeps asking for updates. You don't have updates. You just have chaos.
            </p>
            <p style={{ fontFamily: 'var(--font-nunito, sans-serif)', fontSize: '1rem', color: '#6B5D52', lineHeight: 1.85 }}>
              Matrimonial apps don't fix this. They just add more profiles to the chaos. Pandits don't fix it. Relatives definitely don't fix it. So I built Kutumbh — the thing I wished existed when I started my own search.
            </p>
          </div>
        </FadeSection>

        {/* 6. SOLUTION */}
        <FadeSection style={{ padding: '60px 24px', background: '#fff' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <SectionLabel>THE WHAT</SectionLabel>
            <h2 style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              color: '#2C1810', fontWeight: 600, marginBottom: '24px',
            }}>
              One place for everything.
            </h2>
            <p style={{ fontFamily: 'var(--font-nunito, sans-serif)', fontSize: '1rem', color: '#6B5D52', lineHeight: 1.85, marginBottom: '20px' }}>
              Upload a biodata — AI reads every detail and fills it in for you. Track each person through stages, from first introduction to final yes-or-no. Log your calls so you don't forget what you talked about. Rate the family separately from the person. Flag the weird stuff before you forget it. And when it's time to decide, compare them side by side — not just on income and education, but on everything that actually matters.
            </p>
            <p style={{ fontFamily: 'var(--font-nunito, sans-serif)', fontSize: '1rem', color: '#6B5D52', lineHeight: 1.85 }}>
              This is not another matrimonial site. This is the quiet, private dashboard you actually needed.
            </p>
          </div>
        </FadeSection>

        {/* 7. FEATURES GRID */}
        <FadeSection style={{ padding: '60px 24px' }}>
          <div style={{ maxWidth: '940px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <SectionLabel>WHAT YOU GET</SectionLabel>
              <h2 style={{
                fontFamily: 'var(--font-cormorant, serif)',
                fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
                color: '#2C1810', fontWeight: 600,
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
                emoji="📄"
                title="AI reads biodatas for you"
                body="Drop a PDF or screenshot. In 30 seconds, every field is filled — name, age, family, kundli details, the works. Because typing the same thing 15 times is not how anyone should spend their evening."
              />
              <FeatureCard
                emoji="⭐"
                title="Real kundli matching, not a gimmick"
                body="Full 36-point Ashtakoot Milan from actual birth details. Nadi dosha, Bhakut dosha, Gana dosha — all flagged automatically. For reference only — always consult a pandit for final guidance."
              />
              <FeatureCard
                emoji="🎯"
                title="11 stages from 'new biodata' to 'mutually interested'"
                body="Know exactly where each conversation stands. Never again answer 'haan haan unko call karungi' when you've been saying that for three weeks."
              />
              <FeatureCard
                emoji="📞"
                title="Log every call like a journal"
                body="Who you talked to, what you discussed, how you felt after, what their vibe was. So next Sunday when your mom asks, you actually have answers."
              />
              <FeatureCard
                emoji="👨‍👩‍👧"
                title="Rate the family separately"
                body="Because sometimes the person is lovely and the family is a red flag factory. Eight dimensions, five stars each. You'll know."
              />
              <FeatureCard
                emoji="⚖️"
                title="Decision Matrix for when it's actually time to decide"
                body="Compare 2 or 3 prospects side by side on 18 things. The one with the best kundli isn't always the right one. Now you can see the full picture, not just the numbers."
              />
            </div>
            {/* Bonus card */}
            <div style={{
              background: '#FBF8F3',
              border: '1.5px dashed #C9A84C',
              borderRadius: '16px', padding: '24px',
              display: 'flex', alignItems: 'center', gap: '18px',
            }}>
              <span style={{ fontSize: '2rem', flexShrink: 0 }}>🔜</span>
              <div>
                <div style={{
                  fontFamily: 'var(--font-cormorant, serif)',
                  fontSize: '1.15rem', fontWeight: 600, color: '#2C1810', marginBottom: '6px',
                }}>
                  Mummy Mode — coming soon
                </div>
                <div style={{
                  fontFamily: 'var(--font-nunito, sans-serif)',
                  fontSize: '0.88rem', color: '#6B5D52',
                }}>
                  A parent-friendly view of your dashboard with bigger fonts, Hindi labels, and simpler flow. So you can finally sit with your mom and show her everything.
                </div>
              </div>
            </div>
          </div>
        </FadeSection>

        {/* 8. HOW IT WORKS */}
        <FadeSection id="how-it-works" style={{ padding: '60px 24px', background: '#fff' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <SectionLabel>GETTING STARTED</SectionLabel>
            <h2 style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              color: '#2C1810', fontWeight: 600, marginBottom: '48px',
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
                { num: '2', title: 'Tell us your preferences', body: '16 quick questions about what you\'re looking for.' },
                { num: '3', title: 'Start adding prospects', body: 'One by one, or bulk upload biodatas.' },
              ].map(({ num, title, body }) => (
                <div key={num}>
                  <div style={{
                    fontFamily: 'var(--font-cormorant, serif)',
                    fontSize: '3.5rem', fontWeight: 700, color: '#C9A84C',
                    lineHeight: 1, marginBottom: '14px',
                  }}>
                    {num}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-cormorant, serif)',
                    fontSize: '1.2rem', fontWeight: 600, color: '#2C1810', marginBottom: '8px',
                  }}>
                    {title}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-nunito, sans-serif)',
                    fontSize: '0.9rem', color: '#6B5D52',
                  }}>
                    {body}
                  </div>
                </div>
              ))}
            </div>
            <p style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: '1.15rem', fontStyle: 'italic', color: '#6B5D52',
            }}>
              That's it. You'll wonder how you managed without it.
            </p>
          </div>
        </FadeSection>

        {/* 9. RED FLAG WALL */}
        <FadeSection style={{ padding: '60px 0', overflow: 'hidden' }}>
          <div style={{
            maxWidth: '800px', margin: '0 auto 32px',
            padding: '0 24px', textAlign: 'center',
          }}>
            <SectionLabel>FROM THE FIELD</SectionLabel>
            <h2 style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              color: '#2C1810', fontWeight: 600, marginBottom: '8px',
            }}>
              Real red flags people have flagged.
            </h2>
            <p style={{ fontFamily: 'var(--font-nunito, sans-serif)', fontSize: '0.9rem', color: '#9A8A75' }}>
              Anonymized and shared with permission. The rishta search is wild out there.
            </p>
          </div>
          <div className="marquee-track" style={{ overflow: 'hidden', position: 'relative' }}>
            <div
              className="marquee-inner"
              style={{
                display: 'flex',
                gap: '16px',
                width: 'max-content',
                animation: 'marqueeScroll 38s linear infinite',
                paddingLeft: '24px',
              }}
            >
              {[...shuffledFlags, ...shuffledFlags].map((flag, i) => (
                <div
                  key={i}
                  style={{
                    width: '290px', flexShrink: 0,
                    background: '#FBF8F3',
                    borderLeft: '4px solid #8B1A2B',
                    borderRadius: '12px', padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <p style={{
                    fontFamily: 'var(--font-nunito, sans-serif)',
                    fontSize: '0.88rem', color: '#2C1810', lineHeight: 1.65,
                  }}>
                    "{flag}"
                  </p>
                </div>
              ))}
            </div>
          </div>
          <p style={{
            fontFamily: 'var(--font-nunito, sans-serif)',
            fontSize: '0.82rem', color: '#9A8A75',
            textAlign: 'center', marginTop: '24px', padding: '0 24px',
          }}>
            Have your own red flag story? Log it inside Kutumbh.
          </p>
        </FadeSection>

        {/* 10. FOUNDER TESTIMONIAL */}
        <FadeSection style={{ padding: '60px 24px', textAlign: 'center', background: '#fff' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            {/* TODO: Replace placeholder with actual photo at /public/komal.jpg once uploaded */}
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%',
              background: '#E8DFD3', margin: '0 auto 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: 'var(--font-cormorant, serif)',
                fontSize: '2rem', color: '#8B6914', fontWeight: 600,
              }}>
                KS
              </span>
            </div>
            <blockquote style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: 'clamp(1.1rem, 3vw, 1.3rem)',
              color: '#2C1810', fontStyle: 'italic',
              lineHeight: 1.75, marginBottom: '16px',
            }}>
              "I started this project because I was going through my own search and was losing my mind tracking everything. Kutumbh was my sanity tool before it was an app. Now it's yours too."
            </blockquote>
            <p style={{
              fontFamily: 'var(--font-nunito, sans-serif)',
              fontSize: '0.9rem', color: '#8B6914', fontWeight: 600,
            }}>
              — Komal Singhania, Founder
            </p>
          </div>
        </FadeSection>

        {/* 11. PRICING */}
        <FadeSection style={{ padding: '60px 24px' }}>
          <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
            <SectionLabel>PRICING</SectionLabel>
            <h2 style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              color: '#2C1810', fontWeight: 600, marginBottom: '40px',
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
                background: '#FBF8F3', border: '1px solid #E8DFD3',
                borderRadius: '16px', padding: '32px', textAlign: 'left',
              }}>
                <div style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '1.5rem', fontWeight: 700, color: '#2C1810', marginBottom: '8px' }}>Free</div>
                <div style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '3rem', fontWeight: 700, color: '#8B6914', lineHeight: 1 }}>₹0</div>
                <div style={{ fontFamily: 'var(--font-nunito, sans-serif)', fontSize: '0.82rem', color: '#9A8A75', marginBottom: '24px' }}>forever</div>
                {[
                  { ok: true, label: 'Track up to 3 prospects' },
                  { ok: true, label: 'Basic kundli calculation' },
                  { ok: true, label: 'Conversation tracker' },
                  { ok: false, label: 'AI biodata extraction' },
                  { ok: false, label: 'Full Ashtakoot report' },
                  { ok: false, label: 'Decision matrix' },
                ].map(({ ok, label }, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    marginBottom: '10px',
                    fontFamily: 'var(--font-nunito, sans-serif)',
                    fontSize: '0.9rem', color: ok ? '#2C1810' : '#9A8A75',
                  }}>
                    <span style={{ color: ok ? '#2D6B4F' : '#C0B0A0', fontWeight: 700, fontSize: '1rem' }}>
                      {ok ? '✓' : '✗'}
                    </span>
                    {label}
                  </div>
                ))}
                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    marginTop: '20px', width: '100%',
                    fontFamily: 'var(--font-nunito, sans-serif)',
                    fontWeight: 600, fontSize: '0.9rem', color: '#8B6914',
                    background: 'transparent', border: '1.5px solid #C9A84C',
                    borderRadius: '10px', padding: '12px', cursor: 'pointer',
                  }}
                >
                  Get Started Free
                </button>
              </div>

              {/* Premium */}
              <div style={{
                background: '#FBF8F3', border: '2px solid #C9A84C',
                borderRadius: '16px', padding: '32px', textAlign: 'left',
                position: 'relative', boxShadow: '0 4px 24px rgba(201,168,76,0.15)',
              }}>
                <div style={{
                  position: 'absolute', top: '-13px', left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #8B6914, #C9A84C)',
                  color: '#fff', fontSize: '0.7rem', fontWeight: 700,
                  letterSpacing: '0.14em', padding: '4px 14px', borderRadius: '20px',
                  fontFamily: 'var(--font-nunito, sans-serif)', whiteSpace: 'nowrap',
                }}>
                  POPULAR
                </div>
                <div style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '1.5rem', fontWeight: 700, color: '#2C1810', marginBottom: '8px' }}>Premium</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                  <del style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '1.4rem', color: '#9A8A75' }}>₹499</del>
                  <span style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: '3rem', fontWeight: 700, color: '#8B6914', lineHeight: 1 }}>₹299</span>
                  <span style={{ fontFamily: 'var(--font-nunito, sans-serif)', fontSize: '0.82rem', color: '#9A8A75' }}>/ 3 months</span>
                </div>
                <div style={{ fontFamily: 'var(--font-nunito, sans-serif)', fontSize: '0.78rem', color: '#8B6914', fontWeight: 600, marginBottom: '4px' }}>
                  Launch price for first 50 users
                </div>
                <div style={{ fontFamily: 'var(--font-nunito, sans-serif)', fontSize: '0.82rem', color: '#9A8A75', marginBottom: '24px' }}>or ₹1,299 / year</div>
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
                    display: 'flex', alignItems: 'center', gap: '10px',
                    marginBottom: '10px',
                    fontFamily: 'var(--font-nunito, sans-serif)',
                    fontSize: '0.9rem', color: '#2C1810',
                  }}>
                    <span style={{ color: '#2D6B4F', fontWeight: 700, fontSize: '1rem' }}>✓</span>
                    {label}
                  </div>
                ))}
                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    marginTop: '20px', width: '100%',
                    fontFamily: 'var(--font-nunito, sans-serif)',
                    fontWeight: 700, fontSize: '0.9rem', color: '#fff',
                    background: 'linear-gradient(135deg, #8B6914, #C9A84C)',
                    border: 'none', borderRadius: '10px', padding: '12px',
                    cursor: 'pointer', boxShadow: '0 2px 12px rgba(139,105,20,0.25)',
                  }}
                >
                  Upgrade to Premium
                </button>
              </div>
            </div>
            <p style={{ fontFamily: 'var(--font-nunito, sans-serif)', fontSize: '0.82rem', color: '#9A8A75' }}>
              Cancel anytime. Your data is always yours.
            </p>
          </div>
        </FadeSection>

        {/* 12. ANTI-FEATURES */}
        <FadeSection style={{ padding: '60px 24px', background: '#fff' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <SectionLabel>REAL TALK</SectionLabel>
            <h2 style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              color: '#2C1810', fontWeight: 600, marginBottom: '32px',
            }}>
              What Kutumbh doesn't do.
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
                  fontFamily: 'var(--font-nunito, sans-serif)',
                  fontSize: '1rem', color: '#2C1810',
                }}>
                  <span style={{ color: '#8B1A2B', fontWeight: 700, flexShrink: 0, fontSize: '1.1rem', lineHeight: 1.4 }}>✗</span>
                  {text}
                </div>
              ))}
            </div>
            <p style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: '1.3rem', fontStyle: 'italic', color: '#8B6914',
              marginTop: '28px',
            }}>
              "We just organize your search. That's it. That's the whole thing."
            </p>
          </div>
        </FadeSection>

        {/* 13. DEAR MUMMY LETTER */}
        <FadeSection style={{ padding: '60px 24px', background: '#E8DFD3' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <SectionLabel>A LETTER</SectionLabel>
            </div>
            <div style={{
              background: '#FBF8F3', borderRadius: '16px', padding: '40px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              border: '1px solid #D4C9BC',
            }}>
              <p style={{
                fontFamily: 'var(--font-cormorant, serif)',
                fontSize: '1.3rem', fontWeight: 700, color: '#2C1810',
                marginBottom: '20px',
              }}>
                Dear Mummy,
              </p>
              <div style={{
                fontFamily: 'var(--font-cormorant, serif)',
                fontSize: '1.1rem', color: '#2C1810',
                lineHeight: 2, fontStyle: 'italic',
              }}>
                <p style={{ marginBottom: '18px' }}>
                  I know आपको रोज़ updates चाहिए. I know you're worried. I know अंकल की बेटी is already engaged.
                </p>
                <p style={{ marginBottom: '18px' }}>
                  मैं ignore नहीं कर रही हूँ. I'm being careful. यह मेरी ज़िन्दगी का सबसे बड़ा decision है, and I want to make it right — not fast.
                </p>
                <p style={{ marginBottom: '18px' }}>
                  मैंने Kutumbh use करना शुरू किया है. Every prospect is tracked. Every conversation logged. Every kundli matched. इस weekend साथ बैठते हैं, I'll show you everything.
                </p>
                <p>
                  Love,<br />Your daughter
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <p style={{ fontFamily: 'var(--font-nunito, sans-serif)', fontSize: '0.85rem', color: '#6B5D52', marginBottom: '14px' }}>
                Share this with your mom. She'll get it.
              </p>
              <a
                href={`https://wa.me/?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  fontFamily: 'var(--font-nunito, sans-serif)',
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
        <FadeSection style={{ padding: '60px 24px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <SectionLabel>FOR PARENTS</SectionLabel>
            <h2 style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
              color: '#2C1810', fontWeight: 600, marginBottom: '20px',
            }}>
              Helping your child's rishta search?
            </h2>
            <p style={{
              fontFamily: 'var(--font-nunito, sans-serif)',
              fontSize: '1rem', color: '#6B5D52', lineHeight: 1.75, marginBottom: '28px',
            }}>
              You've probably forwarded 20 biodatas on WhatsApp this month. Your child has probably seen half of them. Kutumbh helps them organize everything you send — and when it's time to decide, you can sit together and compare properly. Ask them to try it.
            </p>
            <button
              onClick={handleCopyLink}
              style={{
                fontFamily: 'var(--font-nunito, sans-serif)',
                fontWeight: 600, fontSize: '0.9rem', color: '#8B6914',
                background: 'transparent', border: '1.5px solid #C9A84C',
                borderRadius: '10px', padding: '12px 24px', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {linkCopied ? '✓ Link copied!' : 'Send them the link'}
            </button>
          </div>
        </FadeSection>

        {/* 15. FAQ */}
        <FadeSection style={{ padding: '60px 24px', background: '#fff' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <SectionLabel>COMMON QUESTIONS</SectionLabel>
              <h2 style={{
                fontFamily: 'var(--font-cormorant, serif)',
                fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
                color: '#2C1810', fontWeight: 600,
              }}>
                A few things people ask.
              </h2>
            </div>
            {FAQS.map((faq, i) => (
              <div
                key={i}
                style={{ borderBottom: '1px solid #E8DFD3' }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  style={{
                    width: '100%', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center',
                    padding: '20px 0', background: 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left', gap: '16px',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-cormorant, serif)',
                    fontSize: '1.15rem', fontWeight: 600,
                    color: '#2C1810', lineHeight: 1.3,
                  }}>
                    {faq.q}
                  </span>
                  <span style={{
                    color: '#8B6914', fontSize: '1.3rem', flexShrink: 0,
                    transition: 'transform 0.2s',
                    transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)',
                    display: 'block',
                  }}>
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <p style={{
                    fontFamily: 'var(--font-nunito, sans-serif)',
                    fontSize: '0.95rem', color: '#6B5D52',
                    lineHeight: 1.75, paddingBottom: '20px',
                    animation: 'fadeSlideIn 0.25s ease',
                  }}>
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </FadeSection>

        {/* 16. FINAL CTA */}
        <FadeSection style={{ padding: '80px 24px', background: '#E8DFD3', textAlign: 'center' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              color: '#2C1810', fontWeight: 600, marginBottom: '16px',
            }}>
              Ready to stop losing your mind?
            </h2>
            <p style={{
              fontFamily: 'var(--font-nunito, sans-serif)',
              fontSize: '1rem', color: '#6B5D52', marginBottom: '32px',
            }}>
              Free forever for the basics. Takes 30 seconds to start.
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                fontFamily: 'var(--font-nunito, sans-serif)',
                fontWeight: 700, fontSize: '1.05rem', color: '#fff',
                background: 'linear-gradient(135deg, #8B6914, #C9A84C)',
                border: 'none', borderRadius: '12px', padding: '16px 44px',
                cursor: 'pointer', boxShadow: '0 4px 20px rgba(139,105,20,0.3)',
                letterSpacing: '0.02em',
              }}
            >
              Start Free
            </button>
            <p style={{
              fontFamily: 'var(--font-nunito, sans-serif)',
              fontSize: '0.82rem', color: '#9A8A75', marginTop: '16px',
            }}>
              No credit card. No spam. No sharing your data.
            </p>
          </div>
        </FadeSection>

        {/* 17. FOOTER */}
        <footer style={{ background: '#2C1810', padding: '60px 24px 40px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '40px', marginBottom: '40px',
            }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-playfair, serif)',
                  fontSize: '1.5rem', color: '#C9A84C', marginBottom: '10px',
                }}>
                  कुटुम्भ
                </div>
                <p style={{
                  fontFamily: 'var(--font-nunito, sans-serif)',
                  fontSize: '0.88rem', color: '#7A6B5C', lineHeight: 1.6,
                }}>
                  Your rishta search, organized.
                </p>
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-nunito, sans-serif)',
                  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em',
                  color: '#C9A84C', marginBottom: '16px', textTransform: 'uppercase',
                }}>
                  Links
                </div>
                {['About', 'Privacy', 'Terms', 'Contact'].map(link => (
                  <div key={link} style={{ marginBottom: '10px' }}>
                    <a href="#" style={{
                      fontFamily: 'var(--font-nunito, sans-serif)',
                      fontSize: '0.9rem', color: '#7A6B5C', textDecoration: 'none',
                    }}>
                      {link}
                    </a>
                  </div>
                ))}
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-nunito, sans-serif)',
                  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em',
                  color: '#C9A84C', marginBottom: '16px', textTransform: 'uppercase',
                }}>
                  Connect
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <a
                    href="https://instagram.com/kutumbh.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: 'var(--font-nunito, sans-serif)',
                      fontSize: '0.9rem', color: '#7A6B5C', textDecoration: 'none',
                    }}
                  >
                    Instagram @kutumbh.in
                  </a>
                </div>
                <div>
                  <a
                    href="mailto:komal.singhania1222@gmail.com"
                    style={{
                      fontFamily: 'var(--font-nunito, sans-serif)',
                      fontSize: '0.9rem', color: '#7A6B5C', textDecoration: 'none',
                    }}
                  >
                    komal.singhania1222@gmail.com
                  </a>
                </div>
              </div>
            </div>
            <div style={{
              borderTop: '1px solid rgba(201,168,76,0.18)',
              paddingTop: '24px',
              display: 'flex', flexWrap: 'wrap',
              justifyContent: 'space-between', gap: '8px',
            }}>
              <p style={{ fontFamily: 'var(--font-nunito, sans-serif)', fontSize: '0.8rem', color: '#5C4F45' }}>
                Made with love in India 🇮🇳 · Built by Komal
              </p>
              <p style={{ fontFamily: 'var(--font-nunito, sans-serif)', fontSize: '0.8rem', color: '#5C4F45' }}>
                © 2026 Kutumbh. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
