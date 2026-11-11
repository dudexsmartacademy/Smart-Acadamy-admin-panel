import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon: React.ReactNode;
  label: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-2.5 text-base',
  };

  const variantClasses = {
    primary: 'bg-[#5A321F] hover:bg-[#6D3D26] text-[#F1E5D8] border border-[#7A4930]/40',
    secondary: 'bg-[#1F1916] hover:bg-[#2A1710] text-[#F5F0EA] border border-[#3A2922]',
    outline: 'bg-transparent hover:bg-[#2A1710]/40 text-[#F5F0EA] border border-[#3A2922]',
    ghost: 'bg-transparent hover:bg-[#2A1710]/40 text-[#A89A91] hover:text-[#F5F0EA]',
    danger: 'bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40',
  };

  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#946246]/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};
