import type { Metadata } from 'next';
import BlogLayout from '@/components/BlogLayout';
import BlogList from '@/components/BlogList';
import { BLOG_POSTS_SORTED } from '@/lib/blogs';

export const metadata: Metadata = {
  title: 'Blog — RokaMaybe',
  description:
    'Honest, practical writing on the rishta search — staying organized, spotting red flags, and making a calm decision.',
};

export default function BlogIndexPage() {
  return (
    <BlogLayout maxWidth={1080}>
      <header className="blog-masthead">
        <p className="blog-kicker">The RokaMaybe Blog</p>
        <h1 className="blog-title">Notes on the rishta search</h1>
        <p className="blog-subtitle">
          Practical, honest writing on staying organized, spotting the red flags, and making a calm
          decision — without losing your mind, or a good match, along the way.
        </p>
      </header>

      <BlogList posts={BLOG_POSTS_SORTED} />
    </BlogLayout>
  );
}
