import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabasePublicConfig } from '@/lib/config';

export async function createClient() {
  const { url, key, configured } = getSupabasePublicConfig();
  if (!configured || !url || !key) throw new Error('Supabase public environment variables are not configured.');

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies. middleware.ts refreshes sessions.
        }
      },
    },
  });
}
