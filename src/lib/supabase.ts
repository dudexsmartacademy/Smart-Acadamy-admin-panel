import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey =
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const isSupabaseConfigured = Boolean(
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl) &&
    supabaseAnonKey &&
    !supabaseAnonKey.includes('your-') &&
    !supabaseAnonKey.includes('placeholder') &&
    !supabaseAnonKey.includes('unconfigured')
);

if (!isSupabaseConfigured) {
  throw new Error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Use for tables not yet represented by the generated Database schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAny = supabase as ReturnType<typeof createClient<any>>;

// Admin data is not readable anonymously, so service caches load only once a
// session exists: immediately if already signed in, and again on every sign-in
// (otherwise lists stay empty after logging in until the page is reloaded).
const signedInLoaders = new Set<() => unknown>();
let hasSession = false;
// Supabase emits INITIAL_SESSION and SIGNED_IN (and SIGNED_IN again on tab
// focus) for the same user; load once per signed-in user.
let loadedForUser: string | null = null;

supabase.auth.onAuthStateChange((event, session) => {
  hasSession = Boolean(session);
  if (!session) {
    loadedForUser = null;
    return;
  }
  if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session.user.id !== loadedForUser) {
    loadedForUser = session.user.id;
    // Deferred with setTimeout: Supabase calls made inside an auth callback
    // wait on the auth lock that the callback itself holds, stalling requests.
    setTimeout(() => {
      signedInLoaders.forEach((load) => {
        Promise.resolve()
          .then(load)
          .catch((err) => console.error('Data load after sign-in failed:', err));
      });
    }, 0);
  }
});

export function whenSignedIn(load: () => unknown): void {
  signedInLoaders.add(load);
  if (hasSession) {
    Promise.resolve()
      .then(load)
      .catch((err) => console.error('Data load failed:', err));
  }
}

export default supabase;
