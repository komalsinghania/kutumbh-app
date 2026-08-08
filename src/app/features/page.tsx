import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import './page.css';
import content from './content';
import { withAboutLink, stripNav, stripFooter, neutralizePricingCta } from '@/lib/marketing-nav';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Track every rishta from first biodata to final decision. Kundli milan, call logs, red flags, family scores, and a decision matrix that ends the confusion.',
  keywords: ['rokamaybe features', 'kundli milan', 'red flags tracker', 'decision matrix', 'arranged marriage'],
  alternates: {
    canonical: '/features',
  },
  openGraph: pageOpenGraph(
    'Features — RokaMaybe',
    'Track every rishta from first biodata to final decision. Kundli milan, call logs, red flags, family scores, and a decision matrix that ends the confusion.',
  ),
};

export default function FeaturesPage() {
  return (
    <>
      <SiteHeader />
      <div className="mkt-features" dangerouslySetInnerHTML={{ __html: neutralizePricingCta(withAboutLink(stripFooter(stripNav(content)))) }} />
      <SiteFooter />
    </>
  );
}
