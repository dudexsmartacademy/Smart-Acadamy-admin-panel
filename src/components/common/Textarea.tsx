import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, required, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-medium text-[#A89A91] flex items-center gap-1">
            {label}
            {required && <span className="text-rose-400 font-bold">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          required={required}
          className={`w-full bg-[#111111] text-[#F5F0EA] placeholder-[#A89A91]/50 text-sm rounded-lg border transition-all duration-200 py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-[#946246]/40 focus:border-[#7A4930] disabled:opacity-50 disabled:bg-[#0B0B0B] resize-y min-h-[90px] ${
            error
              ? 'border-rose-500/80 focus:ring-rose-500/30 focus:border-rose-500'
              : 'border-[#3A2922] hover:border-[#5A321F]/80'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-[#A89A91]/80">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
