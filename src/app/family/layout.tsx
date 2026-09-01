import type { Metadata } from 'next';

// Every page under /family shows someone else's personal details to a small,
// named audience. It must never be indexed, previewed or cached by a crawler.
export const metadata: Metadata = {
  title: 'Family view',
  robots: { index: false, follow: false, nocache: true },
};

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
