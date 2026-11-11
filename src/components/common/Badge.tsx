import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  const variantClasses = {
    primary: 'bg-[#5A321F]/30 text-[#F1E5D8] border border-[#7A4930]/40',
    secondary: 'bg-[#2A1710]/40 text-[#A89A91] border border-[#3A2922]',
    outline: 'bg-transparent text-[#F5F0EA] border border-[#3A2922]',
    success: 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40',
    warning: 'bg-amber-950/40 text-amber-400 border border-amber-800/40',
    danger: 'bg-rose-950/40 text-rose-400 border border-rose-800/40',
    info: 'bg-sky-950/40 text-sky-400 border border-sky-800/40',
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-medium rounded-full tracking-wide ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
