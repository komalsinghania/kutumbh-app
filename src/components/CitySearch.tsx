'use client';
import { useState, useRef, useEffect } from 'react';
import { searchCities, CityData } from '@/lib/indian-cities';

interface Props {
  value: string;
  onChange: (city: string, data?: CityData) => void;
  placeholder?: string;
  className?: string;
}

export default function CitySearch({ value, onChange, placeholder = 'Search city…', className }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CityData[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInput = (v: string) => {
    setQuery(v);
    onChange(v, undefined);
    const found = searchCities(v);
    setResults(found);
    setOpen(found.length > 0);
  };

  const select = (city: CityData) => {
    setQuery(city.name);
    onChange(city.name, city);
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => handleInput(e.target.value)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
          {results.map(city => (
            <button
              key={`${city.name}-${city.state}`}
              type="button"
              onClick={() => select(city)}
              className="w-full text-left px-4 py-2.5 hover:bg-[#f5ede0] transition-colors border-b border-gray-50 last:border-0"
            >
              <span className="text-sm font-medium text-[#1a1410]">{city.name}</span>
              <span className="text-xs text-gray-400 ml-2">{city.state}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
