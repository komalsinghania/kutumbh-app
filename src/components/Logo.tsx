import Link from 'next/link';

export function Logo({ className, style, dark }: {
  className?: string;
  style?: React.CSSProperties;
  dark?: boolean;
}) {
  return (
    <Link href="/" style={{ textDecoration: 'none' }}>
      <span className={className} style={{ fontFamily: 'var(--font-fraunces, serif)', letterSpacing: '-0.035em', fontVariationSettings: '"opsz" 144', ...style }}>
        <span style={{ fontWeight: 500, color: dark ? '#ffffff' : '#1a1410' }}>Roka</span>
        <span style={{ fontWeight: 400, fontStyle: 'italic', color: dark ? '#e8c870' : '#c13e2a' }}>Maybe</span>
      </span>
    </Link>
  );
}
