'use client';

interface Props {
  options: readonly string[];
  selected: string[];
  onToggle: (opt: string) => void;
  multi?: boolean;
  size?: 'xs' | 'sm';
  activeClass?: string;
  inactiveClass?: string;
}

export default function PillGroup({
  options,
  selected,
  onToggle,
  multi = true,
  size = 'sm',
  activeClass,
  inactiveClass,
}: Props) {
  const textSize = size === 'xs' ? 'text-xs' : 'text-sm';
  const padding = size === 'xs' ? 'px-2.5 py-1' : 'px-3 py-1.5';

  const handleClick = (opt: string) => {
    if (!multi && selected.includes(opt)) return;
    onToggle(opt);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isActive = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => handleClick(opt)}
            className={`${padding} rounded-full border ${textSize} font-medium transition-all ${activeClass && inactiveClass ? (isActive ? activeClass : inactiveClass) : ''}`}
            style={!activeClass || !inactiveClass ? (isActive
              ? { background: '#C4A265', color: '#1C1612', borderColor: 'transparent' }
              : { background: 'white', color: '#6A5D4E', borderColor: '#E8E0D2' }
            ) : undefined}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
