import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import './page.css';
import content from './content';
import { withAboutLink, stripNav } from '@/lib/marketing-nav';
import SiteHeader from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Mummy Mode — RokaMaybe',
  description:
    "Your mummy wants updates. You don't want to forward 14 screenshots. Mummy Mode gives her exactly what she needs to see — and nothing she doesn't. Coming soon.",
  openGraph: pageOpenGraph(
    'Mummy Mode — RokaMaybe',
    "Your mummy wants updates. You don't want to forward 14 screenshots. Mummy Mode gives her exactly what she needs to see — and nothing she doesn't. Coming soon.",
  ),
};

export default function MummyModePage() {
  return (
    <>
      <SiteHeader />
      <div className="mkt-mummy" dangerouslySetInnerHTML={{ __html: withAboutLink(stripNav(content)) }} />
    </>
  );
}
