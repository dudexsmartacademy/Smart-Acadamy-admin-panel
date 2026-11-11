import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[#171311] border border-[#3A2922] rounded-xl p-4 sm:p-5 transition-all duration-200 ${
        hoverable || onClick
          ? 'hover:border-[#5A321F] hover:bg-[#1E1815] cursor-pointer hover:shadow-lg hover:shadow-[#2A1710]/20'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
