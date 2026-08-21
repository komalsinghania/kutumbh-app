'use client';

import { useState } from 'react';

/**
 * The homepage FAQ list.
 *
 * `faqs` is passed in from the server page, which also feeds the same array to
 * the FAQPage JSON-LD — one source of truth for what visitors read and what
 * answer engines quote. Every question and answer is in the server-rendered
 * HTML regardless of which item is expanded, so a crawler sees all six.
 */
export default function FaqAccordion({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  return (
    <div style={{ marginTop: 34 }}>
      {faqs.map((faq, i) => {
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
  );
}
