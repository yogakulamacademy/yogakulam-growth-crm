import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isTrackingOriginAllowed, sanitizeTrackingPayload, trackingCorsHeaders } from '@/lib/tracking/server';


function decodeGeoHeader(value: string | null) {
  if (!value) return null;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getRequestGeo(request: NextRequest) {
  return {
    country:
      request.headers.get('x-vercel-ip-country') || null,

    region:
      request.headers.get('x-vercel-ip-country-region') || null,

    city:
      decodeGeoHeader(
        request.headers.get('x-vercel-ip-city')
      ),

    timezone:
      request.headers.get('x-vercel-ip-timezone') || null,
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: trackingCorsHeaders(request.headers.get('origin')) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const cors = trackingCorsHeaders(origin);
  if (!isTrackingOriginAllowed(origin)) return NextResponse.json({ ok: false, error: 'Origin not allowed' }, { status: 403, headers: cors });
  try {
    const length = Number(request.headers.get('content-length') || '0');
    if (length > 32_000) return NextResponse.json({ ok: false, error: 'Payload too large' }, { status: 413, headers: cors });

    const payload = sanitizeTrackingPayload(await request.json());
    const supabase = createAdminClient();
    const touch = payload.sessionTouch || {};
    const geo = getRequestGeo(request);

    // Once a browser has been identified as a CRM lead, keep future sessions and
    // touchpoints attached automatically. Historical events are linked by the
    // identify/website-capture flow.
    const { data: identity, error: identityError } = await supabase
      .from('visitor_identity_links')
      .select('lead_id')
      .eq('anonymous_visitor_id', payload.anonymousVisitorId)
      .maybeSingle();
    if (identityError) throw identityError;
    const resolvedLeadId = identity?.lead_id ?? null;

    const { data: existingSession, error: existingError } = await supabase
      .from('web_sessions').select('id').eq('session_key', payload.sessionKey).maybeSingle();
    if (existingError) throw existingError;

    let session = existingSession;
    if (existingSession) {
      const { error: updateError } = await supabase
  .from('web_sessions')
  .update({
    last_seen_at: new Date().toISOString(),

    ...(resolvedLeadId
      ? { lead_id: resolvedLeadId }
      : {}),

    ...(geo.country
      ? { geo_country: geo.country }
      : {}),

    ...(geo.region
      ? { geo_region: geo.region }
      : {}),

    ...(geo.city
      ? { geo_city: geo.city }
      : {}),

    ...(geo.timezone
      ? { geo_timezone: geo.timezone }
      : {}),
  })
  .eq('id', existingSession.id);
      if (updateError) throw updateError;
    } else {
      const sessionRow = {
        anonymous_visitor_id: payload.anonymousVisitorId,
        lead_id: resolvedLeadId,
        session_key: payload.sessionKey,
        site: payload.site || null,
        source: touch.source || null,
        medium: touch.medium || null,
        geo_country: geo.country,
        geo_region: geo.region,
        geo_city: geo.city,
        geo_timezone: geo.timezone,
        campaign_name: touch.campaign || null,
        landing_page: payload.pageUrl || payload.pagePath || null,
        referrer: payload.referrer || null,
        utm_source: touch.source || null,
        utm_medium: touch.medium || null,
        utm_campaign: touch.campaign || null,
        utm_content: touch.content || null,
        utm_term: touch.term || null,
        gclid: touch.gclid || null,
        gbraid: touch.gbraid || null,
        wbraid: touch.wbraid || null,
        fbclid: touch.fbclid || null,
        user_agent: request.headers.get('user-agent'),
        last_seen_at: new Date().toISOString(),
        metadata: { site: payload.site, page_title: payload.pageTitle, first_touch: payload.firstTouch, utm_id: touch.utmId, adgroup_id: touch.adgroupId, creative_id: touch.creativeId },
      };
      const { data: createdSession, error: sessionError } = await supabase.from('web_sessions').insert(sessionRow).select('id').single();
      if (sessionError) throw sessionError;
      session = createdSession;
    }
    if (!session) throw new Error('Unable to create tracking session.');

    const eventRow = {
      event_id: payload.eventId,
      lead_id: resolvedLeadId,
      web_session_id: session.id,
      anonymous_visitor_id: payload.anonymousVisitorId,
      geo_country: geo.country,
      geo_region: geo.region,
      geo_city: geo.city,
      occurred_at: payload.occurredAt || new Date().toISOString(),
      source: touch.source || null,
      medium: touch.medium || null,
      campaign_name: touch.campaign || null,
      content: touch.content || null,
      term: touch.term || null,
      platform: touch.source || null,
      channel: 'website',
      landing_page: payload.pageUrl || payload.pagePath || null,
      referrer: payload.referrer || null,
      event_type: payload.eventType,
      utm_source: touch.source || null,
      utm_medium: touch.medium || null,
      utm_campaign: touch.campaign || null,
      utm_content: touch.content || null,
      utm_term: touch.term || null,
      gclid: touch.gclid || null,
      gbraid: touch.gbraid || null,
      wbraid: touch.wbraid || null,
      fbclid: touch.fbclid || null,
      external_campaign_id: touch.campaignId || null,
      external_adset_id: touch.adsetId || null,
      external_ad_id: touch.adId || touch.creativeId || null,
      metadata: {
        site: payload.site,
        page_title: payload.pageTitle,
        page_path: payload.pagePath,
        first_touch: payload.firstTouch,
        utm_id: touch.utmId,
        adgroup_id: touch.adgroupId,
        ...payload.metadata,
      },
    };

    const { error: eventError } = await supabase.from('touchpoints').upsert(eventRow, { onConflict: 'event_id', ignoreDuplicates: true });
    if (eventError) throw eventError;

    return NextResponse.json({ ok: true }, { headers: cors });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tracking ingest failed';
    return NextResponse.json({ ok: false, error: message }, { status: 400, headers: cors });
  }
}
