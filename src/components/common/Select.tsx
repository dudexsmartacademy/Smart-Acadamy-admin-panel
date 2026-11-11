import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  placeholderOption?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, placeholderOption, className = '', id, required, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-[#A89A91] flex items-center gap-1">
            {label}
            {required && <span className="text-rose-400 font-bold">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            required={required}
            className={`w-full appearance-none bg-[#111111] text-[#F5F0EA] text-sm rounded-lg border transition-all duration-200 py-2.5 pl-3.5 pr-10 focus:outline-none focus:ring-2 focus:ring-[#946246]/40 focus:border-[#7A4930] disabled:opacity-50 cursor-pointer ${
              error
                ? 'border-rose-500/80 focus:ring-rose-500/30 focus:border-rose-500'
                : 'border-[#3A2922] hover:border-[#5A321F]/80'
            } ${className}`}
            {...props}
          >
            {placeholderOption && (
              <option value="" className="bg-[#171311] text-[#A89A91]">
                {placeholderOption}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-[#171311] text-[#F5F0EA] py-1">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#A89A91]">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-[#A89A91]/80">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
