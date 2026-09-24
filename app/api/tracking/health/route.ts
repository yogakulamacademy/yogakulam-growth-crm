import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTrackingAllowedOrigins, isTrackingOriginAllowed, trackingCorsHeaders } from '@/lib/tracking/server';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: trackingCorsHeaders(request.headers.get('origin')) });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const cors = trackingCorsHeaders(origin);
  const allowedOrigins = getTrackingAllowedOrigins();

  let databaseOk = false;
  let databaseError: string | null = null;
  let recentEvents = 0;
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase.from('touchpoints').select('id', { count: 'exact', head: true });
    if (error) throw error;
    databaseOk = true;
    recentEvents = count ?? 0;
  } catch (error) {
    databaseError = error instanceof Error ? error.message : 'Database check failed';
  }

  const payload = {
    ok: databaseOk && allowedOrigins.length > 0,
    tracker_version: '0.8.0',
    origin_received: origin,
    origin_allowed: isTrackingOriginAllowed(origin),
    allowed_origins_configured: allowedOrigins.length > 0,
    allowed_origins: allowedOrigins,
    supabase_url_configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_secret_configured: Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    database_ok: databaseOk,
    database_error: databaseError,
    touchpoints_total: recentEvents,
  };

  return NextResponse.json(payload, { status: databaseOk ? 200 : 500, headers: cors });
}
