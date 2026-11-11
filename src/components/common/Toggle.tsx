import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, description, disabled = false }) => {
  return (
    <label className={`flex items-center justify-between gap-4 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-medium text-[#F5F0EA]">{label}</span>}
          {description && <span className="text-xs text-[#A89A91]">{description}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#946246]/50 ${
          checked ? 'bg-[#5A321F]' : 'bg-[#2A1E19]'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#F1E5D8] shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
};
