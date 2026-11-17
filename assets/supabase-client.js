import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config.js';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const createSupabaseClient = async () => {
  if (!isSupabaseConfigured) return null;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true
    }
  });
};
