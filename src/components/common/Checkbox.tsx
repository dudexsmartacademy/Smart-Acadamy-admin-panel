import React, { forwardRef } from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = '', checked, onChange, disabled, id, ...props }, ref) => {
    const checkId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <label
        htmlFor={checkId}
        className={`inline-flex items-start gap-2.5 cursor-pointer select-none group ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            id={checkId}
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <div
            className={`w-4 h-4 rounded border transition-all duration-150 flex items-center justify-center ${
              checked
                ? 'bg-[#5A321F] border-[#7A4930] text-[#F1E5D8]'
                : 'bg-[#111111] border-[#3A2922] group-hover:border-[#5A321F]'
            } peer-focus-visible:ring-2 peer-focus-visible:ring-[#946246]/40`}
          >
            {checked && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && <span className="text-xs sm:text-sm font-medium text-[#F5F0EA]">{label}</span>}
            {description && <span className="text-xs text-[#A89A91]">{description}</span>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
