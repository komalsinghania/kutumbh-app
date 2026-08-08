import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BlogLayout from '@/components/BlogLayout';
import ReadingProgress from '@/components/ReadingProgress';
import { pageOpenGraph } from '@/lib/og';
import {
  BLOG_POSTS,
  BLOG_AUTHOR,
  getBlogPost,
  getRelatedPosts,
  formatBlogDate,
  categoryColor,
  type BlogBlock,
} from '@/lib/blogs';

// Pre-render every post at build time.
export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: 'Not found — RokaMaybe' };
  return {
    title: post.title,
    description: post.excerpt,
    keywords: [post.category.toLowerCase(), 'arranged marriage', 'rishta', 'rokamaybe blog'],
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: pageOpenGraph(post.title, post.excerpt, 'article'),
  };
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case 'lead':
      return <p className="blog-lead">{block.text}</p>;
    case 'heading':
      return <h2>{block.text}</h2>;
    case 'paragraph':
      return <p>{block.text}</p>;
    case 'list':
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'cta':
      return (
        <div className="blog-cta">
          <p>{block.text}</p>
          <Link href={block.href} className="blog-cta-button">
            {block.buttonText}
          </Link>
        </div>
      );
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug);
  const accent = categoryColor(post.category);

  return (
    <>
      <ReadingProgress />
      <BlogLayout>
        <article
          className="blog-article"
          style={{ ['--cat' as string]: accent }}
        >
          <Link href="/blog" className="blog-back">
            ← All posts
          </Link>

          <header className="blog-article-head">
            <span className="blog-pill">{post.category}</span>
            <h1 className="blog-article-title">{post.title}</h1>

            <div className="blog-byline">
              <span className="blog-avatar" aria-hidden>
                {BLOG_AUTHOR.name.charAt(0)}
              </span>
              <div className="blog-byline-text">
                <span className="blog-byline-name">{BLOG_AUTHOR.name}</span>
                <span className="blog-byline-meta">
                  {BLOG_AUTHOR.role} · {formatBlogDate(post.publishedAt)} · {post.readingMinutes} min
                  read
                </span>
              </div>
            </div>
          </header>

          <div className="blog-content">
            {post.content.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        </article>

        {related.length > 0 && (
          <section className="blog-related" aria-label="More posts">
            <h2 className="blog-related-title">Keep reading</h2>
            <div className="blog-related-grid">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="blog-related-card"
                  style={{ ['--cat' as string]: categoryColor(r.category) }}
                >
                  <span className="blog-pill">{r.category}</span>
                  <h3 className="blog-related-card-title">{r.title}</h3>
                  <span className="blog-meta">
                    {formatBlogDate(r.publishedAt)} · {r.readingMinutes} min read
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="blog-article-links">
          <Link href="/blog">All posts</Link>
          <Link href="/">Home</Link>
        </div>
      </BlogLayout>
    </>
  );
}
