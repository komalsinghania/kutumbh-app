import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import './page.css';
import content from './content';
import { withAboutLink, stripNav, stripFooter } from '@/lib/marketing-nav';
import { applyPricingCopy } from '@/lib/pricing';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'How It Works',
  description:
    'Upload the biodata. AI fills in everything. Track every call, flag, and meeting through 5 stages. Compare and decide.',
  keywords: ['how rokamaybe works', 'ai biodata extraction', 'rishta stages', 'arranged marriage steps'],
  alternates: {
    canonical: '/how-it-works',
  },
  openGraph: pageOpenGraph(
    'How It Works — RokaMaybe',
    'Upload the biodata. AI fills in everything. Track every call, flag, and meeting through 5 stages. Compare and decide.',
  ),
};

export default function HowItWorksPage() {
  return (
    <>
      <SiteHeader />
      <div className="mkt-how" dangerouslySetInnerHTML={{ __html: applyPricingCopy(withAboutLink(stripFooter(stripNav(content)))) }} />
      <SiteFooter />
    </>
  );
}
