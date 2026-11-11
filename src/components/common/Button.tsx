import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#946246]/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] select-none';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-[#5A321F] hover:bg-[#6D3D26] active:bg-[#482717] text-[#F1E5D8] shadow-md shadow-[#2A1710]/40 border border-[#7A4930]/40',
    secondary:
      'bg-[#1F1916] hover:bg-[#2A1710] text-[#F5F0EA] border border-[#3A2922]',
    outline:
      'bg-transparent hover:bg-[#2A1710]/40 text-[#F5F0EA] border border-[#3A2922] hover:border-[#5A321F]',
    ghost:
      'bg-transparent hover:bg-[#2A1710]/30 text-[#A89A91] hover:text-[#F5F0EA]',
    danger:
      'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 shadow-sm',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
