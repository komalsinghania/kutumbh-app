'use client';

import { useState, useEffect } from 'react';

const ROTATOR_WORDS = ['organized.', 'kundli-matched.', 'red-flag-proof.', 'mummy-approved.', 'finally sane.'];

/**
 * Cycles the second line of the hero headline.
 *
 * Index 0 is what renders on the server, so the <h1> reads
 * "Your rishta search, organized." in the HTML a crawler receives.
 */
export default function WordRotator() {
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
