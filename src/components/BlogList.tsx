'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { type BlogPost, formatBlogDate, categoryColor } from '@/lib/blogs';

const Arrow = () => (
  <span className="arw" aria-hidden>
    →
  </span>
);

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="blog-card"
      style={{ ['--cat' as string]: categoryColor(post.category) }}
    >
      <span className="blog-pill">{post.category}</span>
      <h3 className="blog-card-title">{post.title}</h3>
      <p className="blog-card-excerpt">{post.excerpt}</p>
      <div className="blog-card-foot">
        <span className="blog-meta">
          {formatBlogDate(post.publishedAt)} · {post.readingMinutes} min read
        </span>
        <span className="blog-read">
          Read <Arrow />
        </span>
      </div>
    </Link>
  );
}

function FeaturedCard({ post }: { post: BlogPost }) {
  return (
    <article className="blog-featured" style={{ ['--cat' as string]: categoryColor(post.category) }}>
      <div className="blog-featured-body">
        <div className="blog-pill-row">
          <span className="blog-pill blog-pill--solid">Featured</span>
          <span className="blog-pill">{post.category}</span>
        </div>
        <h2 className="blog-featured-title">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p className="blog-featured-excerpt">{post.excerpt}</p>
        <div className="blog-featured-foot">
          <span className="blog-meta">
            {formatBlogDate(post.publishedAt)} · {post.readingMinutes} min read
          </span>
          <Link href={`/blog/${post.slug}`} className="blog-read">
            Read article <Arrow />
          </Link>
        </div>
      </div>

      {/* Decorative branded cover (no photography in the design system yet) */}
      <Link href={`/blog/${post.slug}`} className="blog-featured-cover" aria-hidden tabIndex={-1}>
        <svg className="blog-cover-orn" viewBox="0 0 220 220" preserveAspectRatio="xMaxYMin slice">
          <g fill="none" stroke="#f5ede0" strokeOpacity="0.16" strokeWidth="1.5">
            <circle cx="192" cy="34" r="34" />
            <circle cx="192" cy="34" r="64" />
            <circle cx="192" cy="34" r="96" />
            <circle cx="192" cy="34" r="130" />
          </g>
        </svg>
        <div className="blog-cover-inner">
          <span className="blog-cover-tag">This week&apos;s read</span>
          <span className="blog-cover-mark">
            Roka<em>Maybe</em>
          </span>
        </div>
      </Link>
    </article>
  );
}

export default function BlogList({ posts }: { posts: BlogPost[] }) {
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(posts.map((p) => p.category)))],
    [posts]
  );
  const [active, setActive] = useState('All');

  const filtered = active === 'All' ? posts : posts.filter((p) => p.category === active);

  // Only spotlight a featured hero on the unfiltered "All" view.
  const showFeatured = active === 'All' && filtered.length > 0;
  const featured = showFeatured ? filtered[0] : null;
  const gridPosts = showFeatured ? filtered.slice(1) : filtered;

  return (
    <>
      <div className="blog-filters" role="tablist" aria-label="Filter posts by category">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={active === c}
            onClick={() => setActive(c)}
            className={`blog-chip${active === c ? ' is-active' : ''}`}
            style={c !== 'All' ? { ['--cat' as string]: categoryColor(c) } : undefined}
          >
            {c}
          </button>
        ))}
      </div>

      {featured && <FeaturedCard post={featured} />}

      {gridPosts.length > 0 && (
        <div className="blog-grid">
          {gridPosts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </>
  );
}
