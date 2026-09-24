import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig } from '@/lib/config';

export function createAdminClient() {
  const { url } = getSupabasePublicConfig();
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secret) {
    throw new Error('Server-side Supabase secret is not configured. Set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createSupabaseClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
