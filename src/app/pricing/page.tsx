import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import './page.css';
import content from './content';
import { withAboutLink, stripNav } from '@/lib/marketing-nav';
import SiteHeader from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Pricing — RokaMaybe',
  description:
    'Free for 3 prospects. ₹499 once — valid till your roka. Tap Compare and get 7 days free, no card. No subscriptions, no auto-renew traps.',
  openGraph: pageOpenGraph(
    'Pricing — RokaMaybe',
    'Free for 3 prospects. ₹499 once — valid till your roka. Tap Compare and get 7 days free, no card. No subscriptions, no auto-renew traps.',
  ),
};

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <div className="mkt-pricing" dangerouslySetInnerHTML={{ __html: withAboutLink(stripNav(content)) }} />
    </>
  );
}
