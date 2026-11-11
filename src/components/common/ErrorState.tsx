import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load records',
  message = 'An unexpected error occurred while fetching information. Please try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-10 rounded-xl border border-rose-900/40 bg-rose-950/10 ${className}`}
    >
      <div className="p-3 rounded-full bg-rose-950/40 border border-rose-800/40 text-rose-400 mb-3">
        <AlertOctagon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-bold text-[#F5F0EA]">{title}</h3>
      <p className="text-xs sm:text-sm text-[#A89A91] max-w-sm mt-1">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
            Retry Operation
          </Button>
        </div>
      )}
    </div>
  );
};
