'use client';

import { useState, useEffect, useRef } from 'react';

/** Counts up to `target` the first time it scrolls into view. */
export default function StatCounter({ target, suffix, decimals = 0, label }: {
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
