'use client';

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export default function StarRating({ value, onChange, size = 'md', color = '#b8892b' }: Props) {
  const sz = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-3xl' : 'text-xl';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star === value ? 0 : star)}
          disabled={!onChange}
          className={`${sz} leading-none transition-transform ${onChange ? 'hover:scale-110 active:scale-95' : ''} disabled:cursor-default`}
          style={{ color: star <= value ? color : '#d6c9b0' }}
        >
          ★
        </button>
      ))}
    </div>
  );
}
