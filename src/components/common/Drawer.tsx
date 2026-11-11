import React from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  position?: 'right' | 'left' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  position = 'right',
  size = 'md',
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  const positionClasses = {
    right: 'inset-y-0 right-0 w-full animate-in slide-in-from-right duration-300',
    left: 'inset-y-0 left-0 w-full animate-in slide-in-from-left duration-300',
    bottom: 'inset-x-0 bottom-0 max-h-[85vh] animate-in slide-in-from-bottom duration-300 rounded-t-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`fixed flex ${position === 'right' ? 'justify-end' : ''} ${position === 'bottom' ? 'items-end' : ''} inset-0`}>
          <div
            className={`pointer-events-auto flex flex-col bg-[#171311] border-[#3A2922] ${
              position === 'right' ? 'border-l' : position === 'left' ? 'border-r' : 'border-t'
            } shadow-2xl ${positionClasses[position]} ${position !== 'bottom' ? sizeClasses[size] : ''}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-[#3A2922] bg-[#1A1412]">
              <div>
                <h3 className="text-base font-bold text-[#F5F0EA]">{title}</h3>
                {description && <p className="text-xs text-[#A89A91] mt-0.5">{description}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-[#A89A91] hover:text-[#F5F0EA] hover:bg-[#2A1710] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 text-[#F5F0EA]">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="p-4 border-t border-[#3A2922] bg-[#14100E] flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
