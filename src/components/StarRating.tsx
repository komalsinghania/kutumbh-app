'use client';
import { useState } from 'react';

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

const STAR_COLORS: Record<number, { fill: string; glow: string }> = {
  1: { fill: '#e05252', glow: 'rgba(224,82,82,0.4)' },
  2: { fill: '#e07d52', glow: 'rgba(224,125,82,0.4)' },
  3: { fill: '#e0b852', glow: 'rgba(224,184,82,0.35)' },
  4: { fill: '#8bc97a', glow: 'rgba(139,201,122,0.4)' },
  5: { fill: '#3db87a', glow: 'rgba(61,184,122,0.45)' },
};

export default function StarRating({ value, onChange, size = 'md', color = '#b8892b' }: Props) {
  const [hovered, setHovered] = useState(0);

  const starSize = size === 'sm' ? 16 : size === 'lg' ? 28 : 22;
  const gap = size === 'sm' ? 3 : size === 'lg' ? 5 : 4;

  const active = onChange ? hovered || value : value;
  const starColor = active > 0 ? STAR_COLORS[active]?.fill ?? color : color;
  const glowColor = active > 0 ? STAR_COLORS[active]?.glow : 'transparent';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <div style={{ display: 'flex', gap, alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map(star => {
          const filled = star <= active;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange?.(star === value ? 0 : star)}
              onMouseEnter={() => onChange && setHovered(star)}
              onMouseLeave={() => onChange && setHovered(0)}
              disabled={!onChange}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: onChange ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1), filter 0.15s',
                transform: filled && onChange ? (hovered === star ? 'scale(1.25)' : 'scale(1.08)') : 'scale(1)',
                filter: filled && onChange && hovered === star ? `drop-shadow(0 0 5px ${glowColor})` : 'none',
                lineHeight: 1,
              }}
            >
              <svg
                width={starSize}
                height={starSize}
                viewBox="0 0 24 24"
                fill={filled ? starColor : 'none'}
                style={{ transition: 'fill 0.12s ease, stroke 0.12s ease' }}
              >
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  stroke={filled ? starColor : '#d6c9b0'}
                  strokeWidth={filled ? 0 : 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          );
        })}
      </div>
      {onChange && size !== 'sm' && (
        <span style={{
          fontSize: '0.6rem',
          fontWeight: 700,
          color: active > 0 ? STAR_COLORS[active]?.fill ?? color : 'transparent',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          minHeight: '0.75rem',
          transition: 'color 0.15s',
        }}>
          {active > 0 ? STAR_LABELS[active] : ''}
        </span>
      )}
    </div>
  );
}
