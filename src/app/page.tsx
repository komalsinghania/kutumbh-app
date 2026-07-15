'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Logo } from '@/components/Logo';
import { track } from '@/lib/analytics';
import AuthModal from '@/components/AuthModal';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import './landing.css';

// ── Scroll reveal ────────────────────────────────────────────────────────────

function Reveal({
  children, dir, delay = 0, className = '', as: Tag = 'div',
}: {
  children: React.ReactNode;
  dir?: 'left' | 'right' | 'zoom';
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'h2' | 'p';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`lp-reveal ${visible ? 'lp-visible' : ''} ${className}`}
      data-dir={dir}
      style={{ '--reveal-delay': `${delay}s` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

// ── Kinetic word rotator ─────────────────────────────────────────────────────

const ROTATOR_WORDS = ['organized.', 'kundli-matched.', 'red-flag-proof.', 'mummy-approved.', 'finally sane.'];

function WordRotator() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % ROTATOR_WORDS.length), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="lp-word-rotator">
      <span className="lp-word" key={idx}>{ROTATOR_WORDS[idx]}</span>
      <span className="lp-word-underline" />
    </span>
  );
}

// ── Falling marigold petals (deterministic → SSR-safe) ───────────────────────

const PETALS = [
  { left: 4, dur: 15, delay: 0, color: '#e8c870', drift: 60, op: 0.55 },
  { left: 12, dur: 19, delay: 4, color: '#c13e2a', drift: -40, op: 0.4 },
  { left: 21, dur: 14, delay: 8, color: '#d8985a', drift: 50, op: 0.5 },
  { left: 33, dur: 21, delay: 2, color: '#e8c870', drift: -60, op: 0.35 },
  { left: 44, dur: 16, delay: 10, color: '#c13e2a', drift: 45, op: 0.45 },
  { left: 55, dur: 18, delay: 6, color: '#d8985a', drift: -30, op: 0.5 },
  { left: 64, dur: 13, delay: 12, color: '#e8c870', drift: 70, op: 0.55 },
  { left: 74, dur: 20, delay: 1, color: '#c13e2a', drift: -55, op: 0.38 },
  { left: 83, dur: 15, delay: 9, color: '#e8c870', drift: 40, op: 0.5 },
  { left: 92, dur: 17, delay: 5, color: '#d8985a', drift: -45, op: 0.45 },
];

function Petals() {
  return (
    <>
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="lp-petal"
          style={{
            left: `${p.left}%`,
            background: p.color,
            '--petal-dur': `${p.dur}s`,
            '--petal-delay': `${p.delay}s`,
            '--petal-drift': `${p.drift}px`,
            '--petal-op': p.op,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

// ── Rotating mandala backdrop ────────────────────────────────────────────────

function Mandala() {
  return (
    <div className="lp-mandala" aria-hidden="true">
      <svg viewBox="0 0 800 800" fill="none">
        <g className="lp-mandala-outer">
          <circle cx="400" cy="400" r="368" stroke="rgba(232,200,112,0.14)" strokeWidth="1" strokeDasharray="3 14" />
          <circle cx="400" cy="400" r="330" stroke="rgba(193,62,42,0.16)" strokeWidth="1" strokeDasharray="1 10" />
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i * 15 * Math.PI) / 180;
            const x1 = 400 + Math.cos(a) * 340, y1 = 400 + Math.sin(a) * 340;
            const x2 = 400 + Math.cos(a) * 360, y2 = 400 + Math.sin(a) * 360;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(232,200,112,0.18)" strokeWidth="1.5" />;
          })}
        </g>
        <g className="lp-mandala-inner">
          <circle cx="400" cy="400" r="255" stroke="rgba(232,200,112,0.10)" strokeWidth="1" strokeDasharray="2 12" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            const x = 400 + Math.cos(a) * 255, y = 400 + Math.sin(a) * 255;
            return <circle key={i} cx={x} cy={y} r="3" fill="rgba(193,62,42,0.28)" />;
          })}
        </g>
      </svg>
    </div>
  );
}

// ── 3D tilt on mouse move ────────────────────────────────────────────────────

function TiltStage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${px * 7}deg) rotateX(${py * -7}deg)`;
  }, []);
  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'rotateY(0deg) rotateX(0deg)';
  }, []);
  return (
    <div className="lp-mock-tilt" ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

// ── Dashboard mockup ─────────────────────────────────────────────────────────

function DashboardMock() {
  return (
    <div className="lp-mock">
      {/* Browser chrome */}
      <div style={{
        background: '#ece3d2', padding: '11px 16px',
        display: 'flex', alignItems: 'center', gap: 6,
        borderBottom: '1px solid #d6c9b0',
      }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffbd2e' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840' }} />
        <span style={{
          marginLeft: 12, flex: 1, maxWidth: 300,
          background: '#f5ede0', borderRadius: 6, padding: '3px 12px',
          fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 11, color: '#6b5e4d',
        }}>rokamaybe.com/dashboard</span>
      </div>
      {/* Body — The Rishta Report */}
      <div style={{ padding: '20px 24px 22px', background: '#f5ede0', textAlign: 'left' }}>
        {/* Masthead */}
        <div style={{
          fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.2em', textTransform: 'uppercase', color: '#b8892b', marginBottom: 6,
        }}>
          Your weekly companion · No. 10
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div style={{
            fontFamily: 'var(--font-fraunces, serif)', fontVariationSettings: '"opsz" 144',
            fontSize: 27, fontWeight: 650, letterSpacing: '-0.02em', color: '#1a1410', lineHeight: 1,
          }}>
            The Rishta Report
          </div>
          <div style={{
            fontFamily: 'var(--font-instrument, serif)', fontStyle: 'italic',
            fontSize: 12, color: '#6b5e4d', textAlign: 'right', lineHeight: 1.35, whiteSpace: 'nowrap',
          }}>
            Sunday<br />5 July 2026
          </div>
        </div>
        <div style={{ height: 2, background: '#1a1410', margin: '12px 0 0' }} />

        {/* Stat columns */}
        <div className="lp-report-stats">
          {[
            { label: 'In pipeline', value: 'Four', color: '#1a1410', labelColor: '#b8892b' },
            { label: 'Best match', value: '67%', color: '#c13e2a', labelColor: '#2D6B4F' },
            { label: 'Avg warmth', value: '53%', color: '#2D6B4F', labelColor: '#b8892b' },
            { label: 'Needs you', value: 'Four calls', color: '#1a1410', labelColor: '#b8892b' },
          ].map((s) => (
            <div key={s.label} className="lp-report-stat">
              <div style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 8.5, fontWeight: 700,
                letterSpacing: '0.16em', textTransform: 'uppercase', color: s.labelColor, marginBottom: 5,
              }}>
                {s.label}
              </div>
              <div style={{
                fontFamily: 'var(--font-fraunces, serif)', fontSize: 19, fontWeight: 700,
                color: s.color, lineHeight: 1, whiteSpace: 'nowrap',
              }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Lead + diary */}
        <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
          {/* Lead */}
          <div style={{ flex: '1.5 1 300px', minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 8.5, fontWeight: 700,
              letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c13e2a', marginBottom: 10,
            }}>
              Lead — needs your attention
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{
                width: 64, alignSelf: 'stretch', minHeight: 84, borderRadius: 4, flexShrink: 0,
                background: '#ecd8cd',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 600, color: '#c98876',
              }}>
                AM
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 17, fontWeight: 700, color: '#1a1410', lineHeight: 1.15 }}>
                  Aarav Mehta
                </div>
                <div style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 10.5, color: '#6b5e4d', marginTop: 3 }}>
                  30 · Mumbai · Product Manager at a fintech
                </div>
                <div style={{
                  fontFamily: 'var(--font-instrument, serif)', fontStyle: 'italic',
                  fontSize: 12.5, color: '#1a1410', lineHeight: 1.5, marginTop: 7,
                }}>
                  &ldquo;At the Call stage — step 2 of 5. You spoke two days ago;
                  a follow-up is due to keep things warm.&rdquo;
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 11, fontWeight: 700,
                    color: '#fff7ea', background: '#c13e2a', borderRadius: 6, padding: '7px 14px',
                    boxShadow: '0 3px 10px rgba(193,62,42,0.3)', whiteSpace: 'nowrap',
                  }}>
                    Log Another Call
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-instrument, serif)', fontStyle: 'italic',
                    fontSize: 11.5, color: '#b8892b', whiteSpace: 'nowrap',
                  }}>
                    — kundli 27 of 36 ✦ <b>61%</b>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Diary */}
          <div style={{ flex: '1 1 210px', minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 8.5, fontWeight: 700,
              letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6b5e4d', marginBottom: 10,
            }}>
              Also in the diary
            </div>
            {[
              { name: 'Rohan Kapoor', pct: '58%', meta: '32 · Pune · Chartered Accountant', note: 'On hold — paused 16 days ago.' },
              { name: 'Kabir Iyer', pct: '54%', meta: '29 · Bengaluru · UX Designer', note: 'New biodata — first look pending.' },
            ].map((d, i) => (
              <div key={d.name} style={{
                paddingBottom: 9, marginBottom: 9,
                borderBottom: i === 0 ? '1px solid #ddd0ba' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 13.5, fontWeight: 700, color: '#1a1410' }}>
                    {d.name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 12.5, fontWeight: 700, color: '#b8892b' }}>
                    {d.pct}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 10, color: '#6b5e4d', marginTop: 2 }}>
                  {d.meta}
                </div>
                <div style={{
                  fontFamily: 'var(--font-instrument, serif)', fontStyle: 'italic',
                  fontSize: 11, color: '#8a7b66', marginTop: 3,
                }}>
                  {d.note}
                </div>
              </div>
            ))}
            <div style={{
              background: '#fbf5e9', border: '1px solid #e4d8c2', borderRadius: 8,
              padding: '9px 12px',
            }}>
              <div style={{ fontFamily: 'var(--font-instrument, serif)', fontStyle: 'italic', fontSize: 11.5, color: '#1a1410', marginBottom: 2 }}>
                A note to self
              </div>
              <div style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 10, color: '#6b5e4d', lineHeight: 1.5 }}>
                One prospect rests on hold — worth a review before the week is out.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Kundli gauge (animates when scrolled into view) ──────────────────────────

function KundliGauge() {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [num, setNum] = useState(0);
  const TARGET = 28.5;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setOn(true); obs.disconnect(); }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!on) return;
    const start = performance.now();
    const dur = 1600;
    let raf: number;
    const step = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setNum(Math.round(TARGET * eased * 10) / 10);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  const R = 74;
  const C = 2 * Math.PI * R;
  const frac = TARGET / 36;

  return (
    <div ref={ref} style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
      <svg width="210" height="210" viewBox="0 0 210 210">
        <circle cx="105" cy="105" r={R} stroke="rgba(245,237,224,0.10)" strokeWidth="13" fill="none" />
        <circle
          className="lp-gauge-arc"
          cx="105" cy="105" r={R}
          stroke="url(#lpGaugeGrad)" strokeWidth="13" fill="none"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={on ? C * (1 - frac) : C}
          transform="rotate(-90 105 105)"
        />
        <defs>
          <linearGradient id="lpGaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c13e2a" />
            <stop offset="100%" stopColor="#e8c870" />
          </linearGradient>
        </defs>
        <text x="105" y="102" textAnchor="middle" className="lp-gauge-num">{num.toFixed(1)}</text>
        <text x="105" y="126" textAnchor="middle" className="lp-gauge-label">out of 36 gunas</text>
      </svg>
    </div>
  );
}

// ── Stage pipeline (5-step journey: New → Call → Meet → Met → Decision) ──────

const JOURNEY_STEPS = ['New', 'Call', 'Meet', 'Met', 'Decision'];

function StagePipeline() {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setOn(true); obs.disconnect(); }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={on ? 'lp-visible-stages' : ''}>
      <div className="lp-stages">
        {JOURNEY_STEPS.map((_, i) => (
          <div key={i} className={`lp-stage-dot ${i < 2 ? 'lp-stage-on' : ''}`}>
            <span style={{ '--stage-delay': `${i * 0.09}s` } as React.CSSProperties} />
          </div>
        ))}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: 10,
        fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 11, color: '#a89a82', fontWeight: 600,
      }}>
        <span>New</span>
        <span style={{ color: '#c13e2a' }}>Step 2 — Call</span>
        <span>Decision</span>
      </div>
    </div>
  );
}

// ── Count-up stat ────────────────────────────────────────────────────────────

function StatCounter({ target, suffix, decimals = 0, label }: {
  target: number; suffix?: string; decimals?: number; label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [num, setNum] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      const dur = 1500;
      const step = (t: number) => {
        const p = Math.min((t - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setNum(target * eased);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);
  return (
    <div ref={ref}>
      <div className="lp-stat-value">
        {num.toFixed(decimals)}<span className="lp-stat-accent">{suffix}</span>
      </div>
      <div className="lp-stat-label">{label}</div>
    </div>
  );
}

// ── Bento card with cursor-follow glow ───────────────────────────────────────

// ── Line icons ───────────────────────────────────────────────────────────────

const iconProps = {
  width: 26, height: 26, viewBox: '0 0 24 24',
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
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
);
const IconNoAds = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/></svg>
);
const IconExport = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v13"/><path d="M7 8l5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
);
const IconTrash = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></svg>
);
const IconIndia = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v18"/><path d="M5 4h13l-3 4 3 4H5"/></svg>
);

// ── Content data ─────────────────────────────────────────────────────────────

const RED_FLAGS: { who: 'he' | 'she'; text: string }[] = [
  { who: 'he', text: "You can work after marriage. From home. Part-time. If there's time after cooking." },
  { who: 'she', text: "I need a 3BHK minimum. Your parents can visit — not live." },
  { who: 'he', text: "What's your salary? Just asking so we know how much you'll contribute to the wedding." },
  { who: 'she', text: "What car do you drive? No reason. Just checking compatibility." },
  { who: 'he', text: "You'll obviously delete public Instagram after the roka, right?" },
  { who: 'she', text: "Can you get your promotion confirmed before the roka? Papa is asking." },
  { who: 'he', text: "I don't have anger issues. People just keep making me angry." },
  { who: 'she', text: "My last rishta broke because he wouldn't stop talking to his sister. Weird, na?" },
  { who: 'he', text: "I don't believe in sharing household work. That's why we'll have a maid. For you to manage." },
  { who: 'she', text: "I want a simple wedding. 800 guests, max." },
  { who: 'he', text: "I'm okay with a working wife. As long as dinner is hot by 8." },
  { who: 'she', text: "My father will call your office to verify your package. Don't take it personally." },
];

const TICKER_1 = [
  'AI biodata scanner', '36-guna kundli milan', '5-step rishta journey',
  'Red flag log', 'Decision matrix', 'Family scorecard', 'Call journal', 'Private by default',
];
const TICKER_2 = [
  '"Beta, koi mila?"', '"Sharma ji ka ladka"', '"Haan mummy, dekh liya"',
  '"Pandit ji says shubh"', '"Woh Bengaluru wala?"', '"Bas ek aur biodata"',
];

const CHAOS_CARDS: {
  cls: string; tag: string; text: string;
  pos: React.CSSProperties; rot: number; dur: number; delay: number;
}[] = [
  { cls: 'lp-chaos-wa', tag: 'WhatsApp · Bua ji', text: '📄 Rishabh_FINAL_biodata_v3 (2).pdf', pos: { top: 0, left: '2%' }, rot: -3, dur: 7, delay: 0 },
  { cls: 'lp-chaos-wa', tag: 'WhatsApp · Mummy', text: 'Beta, call his mother today only. They are waiting 🙏', pos: { top: '10%', right: '4%' }, rot: 2.5, dur: 8, delay: 0.8 },
  { cls: 'lp-chaos-note', tag: 'Sticky note · You', text: 'Aarav?? Arnav?? — the Bengaluru one 🤔', pos: { top: '38%', left: '18%' }, rot: -1.5, dur: 6.5, delay: 1.6 },
  { cls: 'lp-chaos-wa', tag: 'WhatsApp · Pandit ji', text: '🖼️ kundli_photo_blurry_final.jpg', pos: { top: '46%', right: '16%' }, rot: 3.5, dur: 7.5, delay: 0.4 },
  { cls: 'lp-chaos-flag', tag: 'Screenshot · ??', text: '"I don\'t have anger issues. People make me angry." — wait, WHO said this one?!', pos: { bottom: '4%', left: '6%' }, rot: 2, dur: 8.5, delay: 1.2 },
  { cls: 'lp-chaos-note', tag: 'Calendar · Doom', text: 'Sunday 4 p.m. — family Zoom. Prepare answers.', pos: { bottom: 0, right: '6%' }, rot: -2.5, dur: 7, delay: 2 },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Is this like a matrimonial app?',
    a: "No. RokaMaybe doesn't show you new matches or connect you with other users. It's a personal tracker for the prospects you're already meeting — whether they come from matrimonial sites, pandits, relatives, or family friends. Think of it as your private dashboard for your own search.",
  },
  {
    q: 'Do I need to download an app?',
    a: "Nope. RokaMaybe runs in your browser — phone or laptop, doesn't matter.",
  },
  {
    q: 'How does the biodata AI thing work?',
    a: 'You upload a biodata PDF, Word doc, or photo. AI reads it and fills in the form — name, age, family details, kundli info, all of it. Saves you a lot of typing. You can review and edit anything before saving.',
  },
  {
    q: 'Is the kundli matching reliable?',
    a: "The calculations are based on real Vedic astronomy — we compute the Moon's position from the birth details and run the full 36-point Ashtakoot. It's accurate for reference. That said, astrology is a deep subject and we always recommend consulting a qualified pandit before making any final decisions.",
  },
  {
    q: 'Is my data actually safe?',
    a: "Yes. Your data lives on secure encrypted servers, and only you can see it. We don't share profiles between users, we don't sell data, and we don't show your information to anyone. You can delete your account and all your data any time you want.",
  },
  {
    q: 'Who built this?',
    a: 'Me — Komal. I built RokaMaybe because I was going through my own rishta search and couldn\'t find anything that actually helped. If you have feedback or run into issues, email me directly: namaste@rokamaybe.com',
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setLoggedIn(!!user);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const openAuth = (placement: string) => {
    track('cta_clicked', { placement });
    if (loggedIn) router.push('/dashboard');
    else setShowModal(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1410' }}>
        <div style={{ animation: 'lpBlink 1.6s ease infinite' }}>
          <Logo dark style={{ fontSize: '2.5rem' }} />
        </div>
      </div>
    );
  }

  return (
    <>
      {showModal && (
        <AuthModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); router.push('/dashboard'); }}
        />
      )}

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <SiteHeader overHero />

      <main style={{ background: '#f5ede0' }}>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="lp-hero">
          <Mandala />
          <Petals />
          <div className="lp-hero-grain" />

          <div className="lp-hero-inner">
            <div className="lp-hero-badge">
              <span className="lp-dot" />
              Early access — every feature free, no card needed
            </div>

            <h1 className="lp-hero-title">
              Your rishta search,
              <br />
              <WordRotator />
            </h1>

            <p className="lp-hero-sub">
              RokaMaybe is the private tracker for your arranged-marriage journey.
              AI reads the biodatas, matches the kundlis, logs the calls, and remembers
              every red flag — so when Mummy asks, you actually have answers.
            </p>

            <div className="lp-hero-ctas">
              <button className="lp-btn-primary" onClick={() => openAuth('hero')}>
                Start Free — it&apos;s 2 minutes
              </button>
              <a className="lp-btn-ghost" href="#chaos">
                See the chaos ↓
              </a>
            </div>

            <p className="lp-hero-trust">
              🔒 Private by default · No matches shown · No aunty notified
            </p>

            {/* Mockup + floating chips */}
            <div className="lp-mock-stage">
              <div className="lp-mock-glow" />

              <span className="lp-chip" style={{ top: '-8%', left: '-9%', '--chip-rot': '-4deg', '--chip-dur': '6s' } as React.CSSProperties}>
                <span className="lp-chip-num">27/36</span> Kundli — Shubh ✦
              </span>
              <span className="lp-chip" style={{ top: '-4%', right: '-8%', '--chip-rot': '3deg', '--chip-dur': '7s', '--chip-delay': '0.9s' } as React.CSSProperties}>
                🚩 Red flag logged — &ldquo;cooks only Maggi&rdquo;
              </span>
              <span className="lp-chip" style={{ bottom: '16%', left: '-12%', '--chip-rot': '2deg', '--chip-dur': '6.5s', '--chip-delay': '1.6s' } as React.CSSProperties}>
                Step <span className="lp-chip-num">2</span>/5 · Follow-up call due
              </span>
              <span className="lp-chip" style={{ bottom: '-5%', right: '-10%', '--chip-rot': '-2.5deg', '--chip-dur': '7.5s', '--chip-delay': '0.4s' } as React.CSSProperties}>
                📎 Mummy forwarded 3 new biodatas
              </span>

              <TiltStage>
                <DashboardMock />
              </TiltStage>
            </div>
          </div>
        </section>

        {/* ── TICKER ───────────────────────────────────────────────────── */}
        <div className="lp-ticker-wrap">
          <div className="lp-ticker">
            <div className="lp-ticker-track" style={{ '--ticker-dur': '28s' } as React.CSSProperties}>
              {[...TICKER_1, ...TICKER_1].map((t, i) => (
                <span className="lp-ticker-item" key={i}>
                  <span className="lp-ticker-star">✦</span>{t}
                </span>
              ))}
            </div>
          </div>
          <div className="lp-ticker lp-ticker-alt">
            <div className="lp-ticker-track" style={{ '--ticker-dur': '34s' } as React.CSSProperties}>
              {[...TICKER_2, ...TICKER_2, ...TICKER_2].map((t, i) => (
                <span className="lp-ticker-item" key={i}>
                  <span className="lp-ticker-star">✦</span>{t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── CHAOS ────────────────────────────────────────────────────── */}
        <section className="lp-section" id="chaos">
          <div className="lp-container">
            <Reveal>
              <p className="lp-eyebrow">The current situation</p>
              <h2 className="lp-h2">
                Sunday, 4 p.m. Mummy has questions.
                <br />You have <em>screenshots.</em>
              </h2>
              <p className="lp-lede">
                Twenty-seven biodatas across WhatsApp, three matrimonial apps, one pandit&apos;s
                blurry kundli photo, and a cousin who &ldquo;knows someone nice&rdquo;.
                This is not a search. This is chaos with a deadline.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="lp-chaos-board">
                {CHAOS_CARDS.map((c, i) => (
                  <div
                    key={i}
                    className={`lp-chaos-card ${c.cls}`}
                    style={{
                      ...c.pos,
                      '--chip-rot': `${c.rot}deg`,
                      '--chip-dur': `${c.dur}s`,
                      '--chip-delay': `${c.delay}s`,
                    } as React.CSSProperties}
                  >
                    <span className="lp-chaos-tag">{c.tag}</span>
                    {c.text}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FEATURES INDEX ───────────────────────────────────────────── */}
        <section className="lp-section" id="features" style={{ paddingTop: 0 }}>
          <div className="lp-container">
            <div className="lp-feat-grid">

              {/* Left rail: headline + the headliner feature */}
              <div className="lp-feat-left">
                <Reveal>
                  <p className="lp-eyebrow">The fix</p>
                  <h2 className="lp-h2">One dashboard. <em>Zero</em> lost rishtas.</h2>
                  <p className="lp-lede">
                    Everything you&apos;re juggling in your head, your gallery, and four family
                    group chats — structured, scored, and searchable.
                  </p>
                </Reveal>
                <Reveal delay={0.1}>
                  <div className="lp-feat-hero">
                    <div className="lp-feat-hero-glow" />
                    <div className="lp-feat-hero-top">
                      <span className="lp-feat-hero-num">№ 01</span>
                      <span className="lp-feat-hero-tag"><IconSparkle /> Vedic astronomy</span>
                    </div>
                    <h3 className="lp-feat-hero-title">Real 36-guna Kundli Milan. Not a gimmick.</h3>
                    <p className="lp-feat-hero-body">
                      Full Ashtakoot matching computed from actual birth details — Nadi,
                      Bhakut, and Gana doshas flagged automatically. (Still consult your
                      pandit for the final word. We insist.)
                    </p>
                    <KundliGauge />
                  </div>
                </Reveal>
              </div>

              {/* Right rail: the feature index */}
              <div className="lp-feat-list">
                {[
                  {
                    n: '02', icon: <IconDoc />, title: <>AI reads biodatas so you don&apos;t have to</>,
                    body: <>Drop a PDF, Word doc, or a photo from WhatsApp. In 30 seconds every
                      field is filled — name, age, family, kundli details, the works.</>,
                  },
                  {
                    n: '03', icon: <IconTarget />, title: <>A 5-step journey, zero &ldquo;umm, let me check&rdquo;</>,
                    body: <>From &ldquo;new lead&rdquo; to &ldquo;decision&rdquo; — one clear journey bar
                      tells you exactly where every conversation stands.</>,
                    widget: <div style={{ marginTop: 18, maxWidth: 380 }}><StagePipeline /></div>,
                  },
                  {
                    n: '04', icon: <IconPhone />, title: <>A journal for every call</>,
                    body: <>Who you talked to, what was said, how you felt after. Next Sunday,
                      you&apos;ll have receipts.</>,
                  },
                  {
                    n: '05', icon: <IconFamily />, title: <>Rate the family separately</>,
                    body: <>Sometimes the person is lovely and the family is a red-flag factory.
                      Eight dimensions, five stars each. You&apos;ll know.</>,
                  },
                  {
                    n: '06', icon: <IconCompare />, title: <>Decision Matrix, for D-day</>,
                    body: <>Compare up to 3 prospects side by side on 18 dimensions. The best
                      kundli isn&apos;t always the right answer.</>,
                  },
                ].map((f, i) => (
                  <Reveal key={f.n} delay={i * 0.07}>
                    <div className="lp-feat-row">
                      <span className="lp-feat-num">{f.n}</span>
                      <div>
                        <h3 className="lp-feat-title">{f.title}</h3>
                        <p className="lp-feat-body">{f.body}</p>
                        {f.widget}
                      </div>
                      <span className="lp-feat-mark">
                        <span className="lp-feat-mark-icon">{f.icon}</span>
                        <span className="lp-feat-mark-arrow">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                        </span>
                      </span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS ────────────────────────────────────────────────────── */}
        <section className="lp-stats">
          <div className="lp-stats-grid">
            <Reveal delay={0}><StatCounter target={36} label="Guna points checked" /></Reveal>
            <Reveal delay={0.1}><StatCounter target={5} label="Steps to a decision" /></Reveal>
            <Reveal delay={0.2}><StatCounter target={30} suffix="s" label="To scan a biodata" /></Reveal>
            {/* <Reveal delay={0.3}><StatCounter target={0} label="Ads. Forever." /></Reveal> */}
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
        <section className="lp-section" id="how-it-works">
          <div className="lp-container">
            <Reveal>
              <p className="lp-eyebrow">Getting started</p>
              <h2 className="lp-h2">Three steps. <em>Fifteen</em> minutes.</h2>
            </Reveal>
            <div className="lp-steps">
              {[
                { n: '1', t: 'Sign up', b: 'Google or email — 30 seconds. No credit card, no interview, no aunty verification round.' },
                { n: '2', t: 'Set your preferences', b: 'Two minutes of tapping pills — city, age range, diet, income, family type. Done.' },
                { n: '3', t: 'Add prospects', b: 'One by one, or bulk-upload biodatas (PDF, Word, photo) and let the AI do the typing.' },
              ].map((s, i) => (
                <Reveal key={s.n} delay={i * 0.12}>
                  <div className="lp-step">
                    <span className="lp-step-num">{s.n}</span>
                    <div className="lp-step-title">{s.t}</div>
                    <div className="lp-step-body">{s.b}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── RED FLAG WALL ────────────────────────────────────────────── */}
        <section className="lp-flags">
          <div className="lp-container" style={{ padding: '0 24px', textAlign: 'center' }}>
            <Reveal>
              <p className="lp-eyebrow" style={{ justifyContent: 'center' }}>From the field</p>
              <h2 className="lp-h2">The Red Flag <em>Hall of Fame.</em></h2>
              <p className="lp-lede" style={{ margin: '0 auto' }}>
                Real quotes from first calls and second meetings. Shared with permission.
                Logged forever. This is why the red flag log exists.
              </p>
            </Reveal>
          </div>
          <div className="lp-flag-row">
            <div className="lp-flag-track" style={{ '--flag-dur': '52s' } as React.CSSProperties}>
              {[...RED_FLAGS, ...RED_FLAGS].filter((_, i) => i % 2 === 0).map((f, i) => (
                <FlagCard key={i} f={f} i={i} />
              ))}
            </div>
          </div>
          <div className="lp-flag-row">
            <div className="lp-flag-track" style={{ '--flag-dur': '46s' } as React.CSSProperties}>
              {[...RED_FLAGS, ...RED_FLAGS].filter((_, i) => i % 2 === 1).map((f, i) => (
                <FlagCard key={i} f={f} i={i + 3} />
              ))}
            </div>
          </div>
        </section>

        {/* ── PRIVACY ──────────────────────────────────────────────────── */}
        <section className="lp-section">
          <div className="lp-container">
            <Reveal>
              <p className="lp-eyebrow">Trust &amp; privacy</p>
              <h2 className="lp-h2">Not a matrimonial app. <em>Never</em> will be.</h2>
              <p className="lp-lede">
                No matches shown. No profiles shared. No data sold. RokaMaybe is your
                private war room — nobody else gets in, not even us.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="lp-privacy-chips">
                {[
                  { Icon: IconLock, text: 'End-to-end private' },
                  { Icon: IconNoAds, text: 'No ads, ever' },
                  { Icon: IconExport, text: 'Export anytime' },
                  { Icon: IconTrash, text: 'Delete in one click' },
                  { Icon: IconIndia, text: 'Made in India, data in India' },
                ].map(({ Icon, text }) => (
                  <span className="lp-privacy-chip" key={text}><Icon />{text}</span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section className="lp-section" style={{ paddingTop: 0 }}>
          <div className="lp-container" style={{ maxWidth: 780 }}>
            <Reveal>
              <p className="lp-eyebrow">Common questions</p>
              <h2 className="lp-h2">Questions? <em>Obviously.</em></h2>
            </Reveal>
            <Reveal delay={0.1}>
              <div style={{ marginTop: 34 }}>
                {FAQS.map((faq, i) => {
                  const open = openFaq === i;
                  return (
                    <div className={`lp-faq-item ${open ? 'lp-open' : ''}`} key={i}>
                      <button className="lp-faq-q" onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open}>
                        {faq.q}
                        <span className="lp-faq-plus">+</span>
                      </button>
                      <div className="lp-faq-a"><p>{faq.a}</p></div>
                    </div>
                  );
                })}
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <blockquote style={{
                margin: '56px auto 0', textAlign: 'center', maxWidth: 620,
              }}>
                <p style={{
                  fontFamily: 'var(--font-instrument, serif)', fontStyle: 'italic',
                  fontSize: 'clamp(19px, 2.6vw, 24px)', lineHeight: 1.6, color: '#1a1410', margin: 0,
                }}>
                  &ldquo;RokaMaybe was my sanity tool before it was an app.
                  Now it&apos;s yours too.&rdquo;
                </p>
                <footer style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 14,
                  fontWeight: 700, color: '#c13e2a', marginTop: 14,
                }}>
                  — Komal Singhania, Founder
                </footer>
              </blockquote>
            </Reveal>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────────── */}
        <section className="lp-final">
          <span className="lp-final-ring" />
          <span className="lp-final-ring" />
          <span className="lp-final-ring" />
          <Reveal>
            <h2 className="lp-final-title">
              The shaadi is a <em>maybe.</em>
              <br />Your sanity shouldn&apos;t be.
            </h2>
            <p className="lp-final-sub">
              Free forever for the basics. Set up before your chai gets cold.
            </p>
            <button className="lp-btn-final" onClick={() => openAuth('final')}>
              Start Free — Find Your Maybe
            </button>
            <p className="lp-final-note">
              No credit card · No matches shown · No aunty notified
            </p>
          </Reveal>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <SiteFooter />
      </main>
    </>
  );
}

// ── Red flag card ────────────────────────────────────────────────────────────

const FLAG_ROTS = [-1.5, 1, -0.8, 1.4, -0.5, 0.7];

function FlagCard({ f, i }: { f: { who: 'he' | 'she'; text: string }; i: number }) {
  return (
    <div className="lp-flag-card" style={{ '--chip-rot': `${FLAG_ROTS[i % FLAG_ROTS.length]}deg` } as React.CSSProperties}>
      <span className={`lp-flag-who ${f.who === 'he' ? 'lp-he' : 'lp-she'}`}>
        <span className="lp-flag-emoji">{f.who === 'he' ? '🙋‍♂️' : '🙋‍♀️'}</span>
        {f.who === 'he' ? 'He said' : 'She said'}
      </span>
      <p className="lp-flag-quote">&ldquo;{f.text}&rdquo;</p>
      <div className="lp-flag-foot">Shared with permission · Logged in RokaMaybe</div>
    </div>
  );
}
