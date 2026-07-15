import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import './page.css';
import content from './content';
import { withAboutLink, stripNav, stripFooter } from '@/lib/marketing-nav';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Pricing — RokaMaybe',
  description:
    'Free during early access — every feature unlocked, including Compare. No card, no subscription, no auto-renew.',
  openGraph: pageOpenGraph(
    'Pricing — RokaMaybe',
    'Free during early access — every feature unlocked, including Compare. No card, no subscription, no auto-renew.',
  ),
};

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <div style={{
        background: 'linear-gradient(135deg, #1c3a2a 0%, #2D6B4F 100%)',
        color: '#eafff3', textAlign: 'center',
        padding: '14px 20px', fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.5,
      }}>
        🎉 Early access — <strong>everything is free right now</strong>, including Compare. No card needed. Pricing below reflects our future plans.
      </div>
      <div className="mkt-pricing" dangerouslySetInnerHTML={{ __html: withAboutLink(stripFooter(stripNav(content))) }} />
      <SiteFooter />
    </>
  );
}
