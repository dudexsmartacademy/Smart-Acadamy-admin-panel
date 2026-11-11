import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search records...',
  className = '',
  onClear,
}) => {
  return (
    <div className={`relative flex items-center w-full min-w-[200px] ${className}`}>
      <Search className="w-4 h-4 text-[#A89A91] absolute left-3.5 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#111111] text-[#F5F0EA] placeholder-[#A89A91]/60 text-sm rounded-lg border border-[#3A2922] pl-10 pr-9 py-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#946246]/40 focus:border-[#7A4930]"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          className="absolute right-3 text-[#A89A91] hover:text-[#F5F0EA] p-0.5"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
