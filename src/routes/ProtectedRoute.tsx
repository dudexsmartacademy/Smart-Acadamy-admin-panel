import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, admin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center gap-3 text-[#A89A91]">
        <Loader2 className="w-8 h-8 animate-spin text-[#946246]" />
        <p className="text-xs tracking-wider uppercase font-semibold">Authenticating Admin Session...</p>
      </div>
    );
  }

  if (!isAuthenticated || admin?.role !== 'Super Admin') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
