export const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false';

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, key, configured: Boolean(url && key) };
}
