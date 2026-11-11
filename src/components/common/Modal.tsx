import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'lg',
}) => {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-[#171311] border border-[#3A2922] rounded-2xl shadow-2xl overflow-hidden my-auto z-10 animate-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#3A2922] bg-[#1A1412]">
          <div>
            <h3 id="modal-title" className="text-lg font-bold text-[#F5F0EA]">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-[#A89A91] mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#A89A91] hover:text-[#F5F0EA] hover:bg-[#2A1710] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto text-[#F5F0EA]">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-[#3A2922] bg-[#14100E]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
