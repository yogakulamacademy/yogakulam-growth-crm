export type TrackingAttribution = {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  utmId?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  fbclid?: string | null;
  campaignId?: string | null;
  adsetId?: string | null;
  adId?: string | null;
  adgroupId?: string | null;
  creativeId?: string | null;
};

export type TrackingPayload = {
  eventId: string;
  eventType: string;
  occurredAt?: string;
  anonymousVisitorId: string;
  sessionKey: string;
  site?: string;
  pageUrl?: string;
  pagePath?: string;
  pageTitle?: string;
  referrer?: string;
  firstTouch?: TrackingAttribution;
  sessionTouch?: TrackingAttribution;
  metadata?: Record<string, unknown>;
};

const safeText = (value: unknown, max = 500) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

export function sanitizeTrackingPayload(input: unknown): TrackingPayload {
  if (!input || typeof input !== 'object') throw new Error('Invalid tracking payload.');
  const raw = input as Record<string, unknown>;
  const eventId = safeText(raw.eventId, 100);
  const eventType = safeText(raw.eventType, 80);
  const visitor = safeText(raw.anonymousVisitorId, 120);
  const session = safeText(raw.sessionKey, 120);
  if (!eventId || !eventType || !visitor || !session) throw new Error('Missing tracking identifiers.');

  const cleanAttribution = (value: unknown): TrackingAttribution => {
    const obj = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
    return {
      source: safeText(obj.source, 120), medium: safeText(obj.medium, 120), campaign: safeText(obj.campaign, 220),
      content: safeText(obj.content, 220), term: safeText(obj.term, 220), utmId: safeText(obj.utmId, 220),
      gclid: safeText(obj.gclid, 300), gbraid: safeText(obj.gbraid, 300), wbraid: safeText(obj.wbraid, 300),
      fbclid: safeText(obj.fbclid, 300), campaignId: safeText(obj.campaignId, 120), adsetId: safeText(obj.adsetId, 120),
      adId: safeText(obj.adId, 120), adgroupId: safeText(obj.adgroupId, 120), creativeId: safeText(obj.creativeId, 120),
    };
  };

  let metadata: Record<string, unknown> = {};
  if (raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata)) {
    const encoded = JSON.stringify(raw.metadata);
    metadata = encoded.length <= 8000 ? (raw.metadata as Record<string, unknown>) : { truncated: true };
  }

  return {
    eventId, eventType,
    occurredAt: safeText(raw.occurredAt, 80) ?? undefined,
    anonymousVisitorId: visitor,
    sessionKey: session,
    site: safeText(raw.site, 160) ?? undefined,
    pageUrl: safeText(raw.pageUrl, 2000) ?? undefined,
    pagePath: safeText(raw.pagePath, 1000) ?? undefined,
    pageTitle: safeText(raw.pageTitle, 500) ?? undefined,
    referrer: safeText(raw.referrer, 2000) ?? undefined,
    firstTouch: cleanAttribution(raw.firstTouch),
    sessionTouch: cleanAttribution(raw.sessionTouch),
    metadata,
  };
}


export function isTrackingOriginAllowed(origin: string | null) {
  if (!origin) return true;
  const allowed = (process.env.TRACKING_ALLOWED_ORIGINS || '')
    .split(',').map((v) => v.trim()).filter(Boolean);
  return allowed.includes('*') || allowed.includes(origin);
}

export function trackingCorsHeaders(origin: string | null) {
  const allowed = (process.env.TRACKING_ALLOWED_ORIGINS || '')
    .split(',').map((v) => v.trim()).filter(Boolean);
  const allowOrigin = origin && (allowed.includes('*') || allowed.includes(origin)) ? origin : allowed[0] || '';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Tracking-Secret',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
