'use client';

interface EmojiOption {
  emoji: string;
  label: string;
}

interface Props {
  options: readonly EmojiOption[];
  value: string;
  onChange: (emoji: string) => void;
}

const GUT_COLORS: Record<string, { bg: string; border: string; shadow: string; text: string; ring: string }> = {
  '💚': { bg: 'linear-gradient(135deg, #e8f8ef, #d4f0e2)', border: '#3db87a', shadow: 'rgba(61,184,122,0.25)', text: '#1d6e47', ring: 'rgba(61,184,122,0.3)' },
  '🟡': { bg: 'linear-gradient(135deg, #fef9e7, #fef3c7)', border: '#d4a017', shadow: 'rgba(212,160,23,0.22)', text: '#7a5c00', ring: 'rgba(212,160,23,0.28)' },
  '🔴': { bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)', border: '#e05252', shadow: 'rgba(224,82,82,0.22)', text: '#9b1c1c', ring: 'rgba(224,82,82,0.28)' },
};

export default function EmojiPicker({ options, value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map(opt => {
        const selected = value === opt.emoji;
        const cfg = GUT_COLORS[opt.emoji];
        return (
          <button
            key={opt.emoji}
            type="button"
            onClick={() => onChange(opt.emoji === value ? '' : opt.emoji)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '10px 8px',
              borderRadius: 14,
              border: `1.5px solid ${selected ? (cfg?.border ?? '#c13e2a') : '#ede8df'}`,
              background: selected ? (cfg?.bg ?? 'rgba(193,62,42,0.06)') : '#faf8f5',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.18s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: selected ? `0 4px 16px ${cfg?.shadow ?? 'rgba(193,62,42,0.2)'}` : 'none',
              transform: selected ? 'scale(1.03)' : 'scale(1)',
            }}
          >
            {/* Emoji circle */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: selected ? 'rgba(255,255,255,0.7)' : 'white',
              border: `2px solid ${selected ? (cfg?.border ?? '#c13e2a') : '#e8dece'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem',
              boxShadow: selected ? `0 0 0 3px ${cfg?.ring ?? 'rgba(193,62,42,0.15)'}` : 'none',
              transition: 'all 0.18s',
            }}>
              {opt.emoji}
            </div>
            {/* Label */}
            <span style={{
              fontSize: '0.67rem',
              fontWeight: selected ? 700 : 500,
              color: selected ? (cfg?.text ?? '#c13e2a') : '#6b5e4d',
              lineHeight: 1.3,
              transition: 'color 0.15s, font-weight 0.15s',
            }}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
