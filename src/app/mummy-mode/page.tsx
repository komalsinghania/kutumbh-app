import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import './page.css';
import content from './content';
import { withAboutLink, stripNav, stripFooter } from '@/lib/marketing-nav';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

const DESCRIPTION =
  "Your mummy wants updates. You don't want to forward 14 screenshots. Mummy Mode gives her her own login and exactly what she needs to see — and nothing she doesn't.";

export const metadata: Metadata = {
  title: 'Mummy Mode',
  description: DESCRIPTION,
  keywords: ['mummy mode', 'parents dashboard', 'arranged marriage updates', 'share with parents'],
  alternates: {
    canonical: '/mummy-mode',
  },
  openGraph: pageOpenGraph('Mummy Mode — RokaMaybe', DESCRIPTION),
};

export default function MummyModePage() {
  return (
    <>
      <SiteHeader />
      <div className="mkt-mummy" dangerouslySetInnerHTML={{ __html: withAboutLink(stripFooter(stripNav(content))) }} />
      <SiteFooter />
    </>
  );
}
