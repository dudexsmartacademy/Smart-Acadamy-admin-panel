import { supabase, supabaseAny, isSupabaseConfigured } from '../lib/supabase';
import { AdminProfile } from '../types';

export interface AuthSession {
  isAuthenticated: boolean;
  token: string;
  admin: AdminProfile;
  rememberMe: boolean;
  loginTimestamp: string;
}

let cachedSession: AuthSession | null = null;

function userToAdminProfile(user: any): AdminProfile {
  return {
    id: user.id,
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Administrator',
    email: user.email || '',
    phone: user.phone || user.user_metadata?.phone || '',
    role: 'Super Admin',
    avatar: user.user_metadata?.avatar_url,
    department: user.user_metadata?.department || 'Administration',
    joinedDate: user.created_at ? user.created_at.split('T')[0] : '',
    lastLogin: user.last_sign_in_at || new Date().toISOString(),
    twoFactorEnabled: false,
  };
}

export const authService = {
  getCurrentSession(): AuthSession | null {
    return cachedSession;
  },

  setCurrentSession(session: AuthSession | null): void {
    cachedSession = session;
  },

  async getSession(): Promise<AuthSession | null> {
    if (!isSupabaseConfigured) {
      cachedSession = null;
      return null;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        cachedSession = null;
        return null;
      }

      const { data: roleData, error: roleError } = await supabaseAny
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();

      if (roleError) {
        // A failed lookup (network trouble) is not a rejection: keep the
        // session and let the caller retry instead of signing the admin out.
        throw new Error(`Admin role verification failed: ${roleError.message}`);
      }
      if (!roleData) {
        await supabase.auth.signOut();
        cachedSession = null;
        return null;
      }

      const admin = userToAdminProfile(session.user);

      const authSession: AuthSession = {
        isAuthenticated: true,
        token: session.access_token,
        admin,
        rememberMe: true,
        loginTimestamp: session.user.last_sign_in_at || new Date().toISOString(),
      };
      cachedSession = authSession;
      return authSession;
    } catch (err) {
      // Rethrown so the caller keeps the session instead of treating it as signed out.
      throw err instanceof Error ? err : new Error('Failed to restore administrator session.');
    }
  },

  async login(email: string, pass: string, rememberMe = true): Promise<{ success: boolean; error?: string; session?: AuthSession }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured for this portal.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (!data.user || !data.session) {
        return {
          success: false,
          error: 'Authentication failed. No user session returned.',
        };
      }

      const { data: roleData, error: roleError } = await supabaseAny
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'admin')
          .maybeSingle();

      if (roleError) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: `Could not verify administrator permissions: ${roleError.message}`,
        };
      }
      if (!roleData) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Access denied: Only users with the administrator role can access this portal.',
        };
      }

      const admin = userToAdminProfile(data.user);

      const session: AuthSession = {
        isAuthenticated: true,
        token: data.session.access_token,
        admin,
        rememberMe,
        loginTimestamp: new Date().toISOString(),
      };

      cachedSession = session;
      return { success: true, session };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error during login.',
      };
    }
  },

  async logout(): Promise<void> {
    cachedSession = null;
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore sign-out error
    }
  },

  isAuthenticated(): boolean {
    return !!cachedSession?.isAuthenticated;
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const isLocal =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
      const redirectOrigin =
        metaEnv?.VITE_SITE_URL ||
        (isLocal ? window.location.origin : 'https://admin.dudexsmartacademy.in');

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${redirectOrigin}/reset-password`,
      });

      if (error) {
        return {
          success: false,
          message: error.message,
          error: error.message,
        };
      }

      return {
        success: true,
        message: `Password reset instructions have been sent to ${email.trim()}.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Failed to send password reset request.',
        error: err?.message || 'Failed to send password reset request.',
      };
    }
  },

  updateCredentials(email: string, password?: string): void {
    if (password && password.trim()) {
      supabase.auth.updateUser({ email: email.trim(), password: password.trim() }).then(null, () => {});
    } else {
      supabase.auth.updateUser({ email: email.trim() }).then(null, () => {});
    }
  },

  async updateAdminProfile(partial: Partial<AdminProfile>): Promise<AdminProfile | null> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: partial.name,
          phone: partial.phone,
          department: partial.department,
        },
      });

      if (error || !data.user) {
        return null;
      }

      const updated = userToAdminProfile(data.user);
      if (cachedSession) {
        cachedSession = { ...cachedSession, admin: updated };
      }
      return updated;
    } catch {
      return null;
    }
  },
};
