import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import './page.css';
import content from './content';
import { withAboutLink } from '@/lib/marketing-nav';

export const metadata: Metadata = {
  title: 'How It Works — RokaMaybe',
  description:
    'Upload the biodata. AI fills in everything. Track every call, flag, and meeting through 5 stages. Compare and decide.',
  openGraph: pageOpenGraph(
    'How It Works — RokaMaybe',
    'Upload the biodata. AI fills in everything. Track every call, flag, and meeting through 5 stages. Compare and decide.',
  ),
};

export default function HowItWorksPage() {
  return <div className="mkt-how" dangerouslySetInnerHTML={{ __html: withAboutLink(content) }} />;
}
