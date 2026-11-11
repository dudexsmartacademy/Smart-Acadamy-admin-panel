import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-5 p-8 rounded-3xl bg-[#171311] border border-[#3A2922] shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-[#2A1710] border border-[#5A321F]/60 text-[#F1E5D8] mx-auto flex items-center justify-center">
          <HelpCircle className="w-8 h-8 text-[#946246]" />
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-[#F5F0EA] tracking-tight">404</h1>
          <h2 className="text-lg font-bold text-[#F1E5D8] mt-1">Page Not Found</h2>
          <p className="text-xs sm:text-sm text-[#A89A91] mt-2 leading-relaxed">
            The requested administration module or faculty record does not exist or has been relocated.
          </p>
        </div>

        <div className="pt-3 flex items-center justify-center gap-3">
          <Link to="/admin/students/list">
            <Button variant="primary" size="sm" leftIcon={<Home className="w-4 h-4" />}>
              Return to Console
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
