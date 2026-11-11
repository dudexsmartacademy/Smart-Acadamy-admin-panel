import React from 'react';
import { Button } from './Button';
import { FolderSearch } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = <FolderSearch className="w-10 h-10 text-[#7A4930]" />,
  actionLabel,
  onAction,
  actionIcon,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-xl border border-dashed border-[#3A2922] bg-[#171311]/50 ${className}`}
    >
      <div className="p-4 rounded-2xl bg-[#2A1710]/60 border border-[#5A321F]/30 mb-4 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-[#F5F0EA]">{title}</h3>
      <p className="text-xs sm:text-sm text-[#A89A91] max-w-md mt-1.5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={onAction} leftIcon={actionIcon}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
