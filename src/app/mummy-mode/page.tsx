import type { Metadata } from 'next';
import './page.css';
import content from './content';
import { withAboutLink } from '@/lib/marketing-nav';

export const metadata: Metadata = {
  title: 'Mummy Mode — RokaMaybe',
  description:
    "Your mummy wants updates. You don't want to forward 14 screenshots. Mummy Mode gives her exactly what she needs to see — and nothing she doesn't. Coming soon.",
};

export default function MummyModePage() {
  return <div className="mkt-mummy" dangerouslySetInnerHTML={{ __html: withAboutLink(content) }} />;
}
