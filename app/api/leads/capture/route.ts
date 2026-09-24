import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isTrackingOriginAllowed, trackingCorsHeaders } from '@/lib/tracking/server';
import { isWebsiteCaptureAuthorized, sanitizeWebsiteLeadPayload } from '@/lib/website-leads/server';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...trackingCorsHeaders(request.headers.get('origin')),
      'Access-Control-Allow-Headers': 'Content-Type, X-Website-Secret',
    },
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const cors = {
    ...trackingCorsHeaders(origin),
    'Access-Control-Allow-Headers': 'Content-Type, X-Website-Secret',
  };

  // This endpoint is designed for server-to-server calls from the academy website.
  // If a browser Origin is present, it must also be one of the configured websites.
  if (origin && !isTrackingOriginAllowed(origin)) {
    return NextResponse.json({ ok: false, error: 'Origin not allowed' }, { status: 403, headers: cors });
  }

  if (!isWebsiteCaptureAuthorized(request.headers.get('x-website-secret'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  try {
    const length = Number(request.headers.get('content-length') || '0');
    if (length > 48_000) {
      return NextResponse.json({ ok: false, error: 'Payload too large' }, { status: 413, headers: cors });
    }

    const payload = sanitizeWebsiteLeadPayload(await request.json());
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc('ingest_website_lead', {
      p_external_event_id: payload.externalEventId,
      p_site: payload.site ?? null,
      p_form_name: payload.formName ?? null,
      p_first_name: payload.firstName ?? null,
      p_last_name: payload.lastName ?? null,
      p_email: payload.email ?? null,
      p_phone: payload.phone ?? null,
      p_course_code: payload.courseCode ?? null,
      p_preferred_location: payload.preferredLocation ?? null,
      p_preferred_month: payload.preferredMonth ?? null,
      p_preferred_mode: payload.preferredMode ?? null,
      p_country: payload.country ?? null,
      p_timezone: payload.timezone ?? null,
      p_message: payload.message ?? null,
      p_anonymous_visitor_id: payload.anonymousVisitorId ?? null,
      p_session_key: payload.sessionKey ?? null,
      p_first_touch: payload.firstTouch ?? {},
      p_session_touch: payload.sessionTouch ?? {},
      p_metadata: {
        ...(payload.metadata ?? {}),
        request_user_agent: request.headers.get('user-agent'),
      },
    });

    if (error) throw error;

    return NextResponse.json(data ?? { ok: true }, { headers: cors });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Website lead capture failed';
    return NextResponse.json({ ok: false, error: message }, { status: 400, headers: cors });
  }
}
