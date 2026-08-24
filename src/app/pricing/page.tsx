import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import './page.css';
import content from './content';
import { withAboutLink, stripNav, stripFooter } from '@/lib/marketing-nav';
import { PRICING, PRICING_DESCRIPTION, applyPricingCopy, extractFaqs } from '@/lib/pricing';
import JsonLd from '@/components/JsonLd';
import { faqPageJsonLd } from '@/lib/structured-data';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Pricing',
  description: PRICING_DESCRIPTION,
  keywords: ['rokamaybe pricing', 'arranged marriage app cost', 'free early access', 'no subscription'],
  alternates: {
    canonical: '/pricing',
  },
  openGraph: pageOpenGraph('Pricing — RokaMaybe', PRICING_DESCRIPTION),
};

// The page body is pre-generated HTML written for the paid model, patched at
// render time to state whatever src/lib/pricing.ts says is true today. The FAQs
// are then read back out of the *patched* markup, so the FAQPage structured
// data quotes exactly the words on the page rather than a second copy that can
// drift away from it.
const body = applyPricingCopy(withAboutLink(stripFooter(stripNav(content))));
const faqs = extractFaqs(body);

export default function PricingPage() {
  return (
    <>
      <JsonLd data={faqPageJsonLd(faqs)} />
      <SiteHeader />
      {!PRICING.enabled && (
        <div style={{
          background: 'linear-gradient(135deg, #1c3a2a 0%, #2D6B4F 100%)',
          color: '#eafff3', textAlign: 'center',
          padding: '14px 20px', fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.5,
        }}>
          🎉 Early access — <strong>everything is free right now</strong>, including Compare. No card needed.
          Pricing below reflects our future plans.
        </div>
      )}
      <div className="mkt-pricing" dangerouslySetInnerHTML={{ __html: body }} />
      <SiteFooter />
    </>
  );
}
