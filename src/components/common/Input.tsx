import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, required, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[#A89A91] flex items-center gap-1">
            {label}
            {required && <span className="text-rose-400 font-bold">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-[#A89A91] pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            required={required}
            className={`w-full bg-[#111111] text-[#F5F0EA] placeholder-[#A89A91]/50 text-sm rounded-lg border transition-all duration-200 py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-[#946246]/40 focus:border-[#7A4930] disabled:opacity-50 disabled:bg-[#0B0B0B] ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon ? 'pr-10' : ''} ${
              error
                ? 'border-rose-500/80 focus:ring-rose-500/30 focus:border-rose-500'
                : 'border-[#3A2922] hover:border-[#5A321F]/80'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-[#A89A91] flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-[#A89A91]/80">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
