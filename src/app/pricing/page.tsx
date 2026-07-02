import type { Metadata } from 'next';
import './page.css';
import content from './content';
import { withAboutLink } from '@/lib/marketing-nav';

export const metadata: Metadata = {
  title: 'Pricing — RokaMaybe',
  description:
    'Free for 3 prospects. ₹499 once — valid till your roka. Tap Compare and get 7 days free, no card. No subscriptions, no auto-renew traps.',
};

export default function PricingPage() {
  return <div className="mkt-pricing" dangerouslySetInnerHTML={{ __html: withAboutLink(content) }} />;
}
