import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminProfile } from '../types';
import { authService, AuthSession } from '../services/authService';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  isAuthenticated: boolean;
  admin: AdminProfile | null;
  session: AuthSession | null;
  loading: boolean;
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateAdmin: (partial: Partial<AdminProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    let checkedUserId: string | null = null;

    // Resolves the admin session; a failed check is retried once and otherwise
    // keeps the current state, so a slow request never bounces to /login.
    const check = async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const next = await authService.getSession();
          if (!isMounted) return;
          checkedUserId = next ? (await supabase.auth.getSession()).data.session?.user.id ?? null : null;
          setSession(next);
          setLoading(false);
          return;
        } catch (err) {
          console.error(err);
        }
      }
      if (isMounted) setLoading(false);
    };

    void check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sbSession) => {
      if (!isMounted) return;
      if (!sbSession?.user) {
        checkedUserId = null;
        setSession(null);
        authService.setCurrentSession(null);
        setLoading(false);
        return;
      }
      // INITIAL_SESSION is handled by check(); SIGNED_IN repeats on tab focus,
      // so only re-check when a different user signs in.
      if (event === 'SIGNED_IN' && sbSession.user.id !== checkedUserId) {
        setTimeout(() => {
          if (isMounted) void check();
        }, 0);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string, rememberMe = true) => {
    const res = await authService.login(email, pass, rememberMe);
    if (res.success && res.session) {
      setSession(res.session);
      return { success: true };
    }
    return { success: false, error: res.error || 'Authentication failed' };
  };

  const logout = () => {
    authService.logout();
    setSession(null);
  };

  const updateAdmin = async (partial: Partial<AdminProfile>) => {
    const updated = await authService.updateAdminProfile(partial);
    if (updated && session) {
      setSession({ ...session, admin: updated });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!session?.isAuthenticated,
        admin: session?.admin || null,
        session,
        loading,
        login,
        logout,
        updateAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
