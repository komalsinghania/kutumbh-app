import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import './page.css';
import content from './content';
import { withAboutLink } from '@/lib/marketing-nav';

export const metadata: Metadata = {
  title: 'Features — RokaMaybe',
  description:
    'Track every rishta from first biodata to final decision. Kundli milan, call logs, red flags, family scores, and a decision matrix that ends the confusion.',
  openGraph: pageOpenGraph(
    'Features — RokaMaybe',
    'Track every rishta from first biodata to final decision. Kundli milan, call logs, red flags, family scores, and a decision matrix that ends the confusion.',
  ),
};

export default function FeaturesPage() {
  return <div className="mkt-features" dangerouslySetInnerHTML={{ __html: withAboutLink(content) }} />;
}
