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

export default function EmojiPicker({ options, value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.emoji}
          type="button"
          onClick={() => onChange(opt.emoji === value ? '' : opt.emoji)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition-all"
          style={value === opt.emoji
            ? { background: 'rgba(196,162,101,0.06)', borderColor: '#C4A265', boxShadow: '0 0 0 2px rgba(196,162,101,0.25)' }
            : { background: 'white', borderColor: '#E8E0D2' }}
        >
          <span className="text-xl leading-none">{opt.emoji}</span>
          <span className="text-xs leading-tight text-center" style={{ maxWidth: 60, color: '#9A8A75' }}>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
