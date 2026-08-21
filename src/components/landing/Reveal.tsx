'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Fades a section in when it scrolls into view.
 *
 * This is a client island on purpose: only the observer needs to run in the
 * browser. Whatever is passed as `children` is rendered on the server and
 * arrives here already built, so the marketing copy never ships as JavaScript.
 *
 * landing.css shows every .lp-reveal outright under `@media (scripting: none)`,
 * so a visitor (or crawler) without JavaScript still sees the content.
 */
export default function Reveal({
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
