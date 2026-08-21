'use client';

import { useState, useEffect, useRef } from 'react';

const JOURNEY_STEPS = ['New', 'Call', 'Meet', 'Met', 'Decision'];

/** The 5-step journey bar. Fills in when scrolled into view. */
export default function StagePipeline() {
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
