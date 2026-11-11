import React from 'react';

export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', className = '' }) => {
  const [imageError, setImageError] = React.useState(false);

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base font-semibold',
    xl: 'w-20 h-20 text-xl font-bold',
  };

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImageError(true)}
        className={`rounded-full object-cover border border-[#5A321F]/40 shrink-0 ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-[#2A1710] text-[#F1E5D8] border border-[#5A321F]/50 flex items-center justify-center font-medium shrink-0 uppercase select-none ${sizeClasses[size]} ${className}`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
};
