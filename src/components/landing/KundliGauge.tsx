'use client';

import { useState, useEffect, useRef } from 'react';

/** The 36-guna dial. Sweeps and counts up the first time it scrolls into view. */
export default function KundliGauge() {
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
