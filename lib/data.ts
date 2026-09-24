import { mockCampaigns, mockFollowUps, mockLeadDetails, mockLeads } from './mock-data';
import type { CampaignPerformance, Channel, FollowUp, LeadDetail, LeadOverview, LeadStage, Touchpoint } from '@/types/crm';
import { createClient } from '@/lib/supabase/server';
import { useMockData } from '@/lib/config';

export type CourseOption = { id: string; name: string; code: string };
export type CourseBatchOption = {
  id: string;
  courseId: string;
  batchCode: string;
  location?: string;
  mode?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  capacity?: number;
  seatsRemaining?: number;
};

function monthLabel(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function mapLeadRow(row: any): LeadOverview {
  return {
    id: row.id,
    leadCode: row.lead_code,
    name: row.lead_name || row.display_name || row.lead_code,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    course: row.course_name ?? 'Not selected',
    location: row.preferred_location ?? '—',
    country: row.country ?? '—',
    stage: row.current_stage,
    intent: row.intent,
    firstTouchSource: row.first_touch_source ?? 'Unknown',
    firstTouchMedium: row.first_touch_medium ?? 'Unknown',
    firstTouchCampaign: row.first_touch_campaign ?? 'Unattributed',
    leadCreationChannel: row.lead_creation_channel ?? 'other',
    currentContactChannel: row.current_contact_channel ?? 'other',
    owner: row.owner_name ?? (row.owner_user_id ? 'Assigned' : 'Unassigned'),
    lastContactedAt: row.last_contacted_at ?? undefined,
    nextFollowupAt: row.next_followup_at ?? undefined,
    createdAt: row.created_at,
    value: row.enrollment_value == null ? undefined : Number(row.enrollment_value),
    currency: row.enrollment_currency ?? undefined,
  };
}

export async function getLeads(): Promise<LeadOverview[]> {
  if (useMockData) return mockLeads;
  const supabase = await createClient();
  const { data, error } = await supabase.from('v_leads_overview').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error(`Unable to load leads: ${error.message}`);
  return (data ?? []).map(mapLeadRow);
}

export async function getLead(id: string): Promise<LeadDetail | null> {
  if (useMockData) return mockLeadDetails[id] ?? null;
  const supabase = await createClient();

  const [leadResult, contactsResult, touchpointsResult, stagesResult, messagesResult, enrollmentResult] = await Promise.all([
    supabase.from('v_leads_overview').select('*').eq('id', id).maybeSingle(),
    supabase.from('lead_contacts').select('contact_type,value,is_primary').eq('lead_id', id).order('is_primary', { ascending: false }),
    supabase.from('touchpoints').select('id,event_type,source,medium,occurred_at,landing_page,campaign_name,channel,metadata').eq('lead_id', id).order('occurred_at', { ascending: true }).limit(100),
    supabase.from('lead_stage_history').select('id,to_stage,changed_at,reason,changed_by_type').eq('lead_id', id).order('changed_at', { ascending: true }).limit(100),
    supabase.from('messages').select('id,direction,sender_type,body,created_at,conversations(channel)').eq('lead_id', id).order('created_at', { ascending: false }).limit(12),
    supabase.from('enrollments').select('total_value,currency').eq('lead_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (leadResult.error) throw new Error(`Unable to load lead: ${leadResult.error.message}`);
  if (!leadResult.data) return null;

  const row: any = leadResult.data;
  const base = mapLeadRow({
    ...row,
    enrollment_value: enrollmentResult.data?.total_value,
    enrollment_currency: enrollmentResult.data?.currency,
  });

  const contacts = contactsResult.data ?? [];
  const email = contacts.find((c: any) => c.contact_type === 'email')?.value;
  const phone = contacts.find((c: any) => ['phone', 'whatsapp'].includes(c.contact_type))?.value;

  const touchpoints: Touchpoint[] = [
    ...((touchpointsResult.data ?? []).map((point: any) => ({
      id: `touch-${point.id}`,
      label: point.event_type?.replaceAll('_', ' ') || 'Touchpoint',
      source: point.source || point.channel || 'Tracking',
      medium: point.medium || undefined,
      timestamp: point.occurred_at,
      detail: point.campaign_name || point.landing_page || (point.metadata?.detail as string | undefined),
      kind: (point.event_type?.includes('message') ? 'message' : point.event_type?.includes('payment') ? 'payment' : point.channel === 'website' ? 'website' : 'marketing') as Touchpoint['kind'],
    })) as Touchpoint[]),
    ...((stagesResult.data ?? []).map((stage: any) => ({
      id: `stage-${stage.id}`,
      label: `Moved to ${String(stage.to_stage).replaceAll('_', ' ')}`,
      source: stage.changed_by_type === 'ai' ? 'AI' : 'CRM',
      timestamp: stage.changed_at,
      detail: stage.reason || undefined,
      kind: 'stage' as const,
    })) as Touchpoint[]),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const lastMessages = (messagesResult.data ?? []).reverse().map((message: any) => ({
    id: message.id,
    direction: message.direction as 'inbound' | 'outbound',
    sender: message.sender_type === 'lead' ? base.name : message.sender_type === 'ai' ? 'AI Agent' : 'Admissions',
    body: message.body || '[Non-text message]',
    timestamp: message.created_at,
    channel: ((Array.isArray(message.conversations) ? message.conversations[0]?.channel : message.conversations?.channel) || base.currentContactChannel || 'other') as Channel,
  }));

  return {
    ...base,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    interestedCourseId: row.interested_course_id ?? undefined,
    preferredBatchId: row.preferred_batch_id ?? undefined,
    preferredMonthRaw: row.preferred_month ? String(row.preferred_month).slice(0, 7) : undefined,
    email: email ?? row.email ?? undefined,
    phone: phone ?? row.phone ?? undefined,
    preferredMonth: monthLabel(row.preferred_month),
    preferredMode: row.preferred_mode ?? undefined,
    timezone: row.timezone ?? undefined,
    summary: row.summary ?? 'No CRM summary yet.',
    notes: row.notes ?? 'No internal notes yet.',
    touchpoints,
    lastMessages,
  };
}

export async function getFollowUps(): Promise<FollowUp[]> {
  if (useMockData) return mockFollowUps;
  const supabase = await createClient();
  const { data, error } = await supabase.from('v_followups_due').select('*').order('due_at', { ascending: true }).limit(250);
  if (error) throw new Error(`Unable to load follow-ups: ${error.message}`);
  return (data ?? []).map((row: any) => ({
    id: row.task_id,
    leadId: row.lead_id,
    leadCode: row.lead_code,
    leadName: row.lead_name,
    title: row.title,
    dueAt: row.due_at,
    stage: row.current_stage as LeadStage,
    intent: row.intent,
    channel: (row.current_contact_channel ?? 'other') as Channel,
  }));
}

export async function getCourses(): Promise<CourseOption[]> {
  if (useMockData) {
    const unique = new Map<string, CourseOption>();
    mockLeads.forEach((lead, index) => {
      if (!unique.has(lead.course)) unique.set(lead.course, { id: `mock-course-${index}`, code: `MOCK-${index}`, name: lead.course });
    });
    return [...unique.values()];
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from('courses').select('id,code,name').eq('active', true).order('name');
  if (error) throw new Error(`Unable to load courses: ${error.message}`);
  return data ?? [];
}

export async function getCourseBatches(): Promise<CourseBatchOption[]> {
  if (useMockData) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('course_batches')
    .select('id,course_id,batch_code,location,mode,start_date,end_date,start_time,end_time,timezone,capacity,seats_remaining')
    .eq('active', true)
    .order('start_date', { ascending: true });
  if (error) throw new Error(`Unable to load course batches: ${error.message}`);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    courseId: row.course_id,
    batchCode: row.batch_code,
    location: row.location ?? undefined,
    mode: row.mode ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    timezone: row.timezone ?? undefined,
    capacity: row.capacity == null ? undefined : Number(row.capacity),
    seatsRemaining: row.seats_remaining == null ? undefined : Number(row.seats_remaining),
  }));
}

export async function getCampaigns(): Promise<CampaignPerformance[]> {
  // Campaign-spend ingestion is a later integration. Keep the fixture until Google/Meta Ads sync is connected.
  return mockCampaigns;
}

export function isMockMode() {
  return useMockData;
}

export async function getPipelineCounts(): Promise<Record<LeadStage, number>> {
  const empty: Record<LeadStage, number> = { new:0, contacted:0, engaged:0, qualified:0, high_intent:0, payment_pending:0, enrolled:0, nurture:0, not_now:0, lost:0, unqualified:0, duplicate:0 };
  if (useMockData) {
    const { dashboardStageCounts } = await import('./mock-data');
    return dashboardStageCounts;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from('v_pipeline_counts').select('current_stage,lead_count');
  if (error) throw new Error(`Unable to load pipeline counts: ${error.message}`);
  for (const row of data ?? []) empty[row.current_stage as LeadStage] = Number(row.lead_count);
  return empty;
}

export async function getDashboardSourceBreakdown(): Promise<Array<{ source: string; leads: number; share: number; qualified: number }>> {
  if (useMockData) {
    const { sourceBreakdown } = await import('./mock-data');
    return sourceBreakdown;
  }
  const leads = await getLeads();
  const grouped = new Map<string, { source: string; leads: number; qualified: number }>();
  const qualifiedStages: LeadStage[] = ['qualified','high_intent','payment_pending','enrolled'];
  for (const lead of leads) {
    const key = lead.firstTouchSource || 'Unknown';
    const item = grouped.get(key) ?? { source: key, leads: 0, qualified: 0 };
    item.leads += 1;
    if (qualifiedStages.includes(lead.stage)) item.qualified += 1;
    grouped.set(key, item);
  }
  const total = Math.max(1, leads.length);
  return [...grouped.values()].sort((a,b) => b.leads - a.leads).slice(0,5).map((item) => ({ ...item, share: Math.round((item.leads / total) * 100) }));
}

export type TrackingHealth = {
  events24h: number;
  visitors24h: number;
  identifiedEvents24h: number;
  gclidEvents7d: number;
  fbclidEvents7d: number;
  lastEventAt?: string;
};

export async function getTrackingHealth(): Promise<TrackingHealth> {
  if (useMockData) {
    return { events24h: 1842, visitors24h: 391, identifiedEvents24h: 286, gclidEvents7d: 742, fbclidEvents7d: 519, lastEventAt: new Date().toISOString() };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from('v_tracking_health').select('*').maybeSingle();
  if (error) throw new Error(`Unable to load tracking health: ${error.message}`);
  const row: any = data ?? {};
  return {
    events24h: Number(row.events_24h || 0),
    visitors24h: Number(row.visitors_24h || 0),
    identifiedEvents24h: Number(row.identified_events_24h || 0),
    gclidEvents7d: Number(row.gclid_events_7d || 0),
    fbclidEvents7d: Number(row.fbclid_events_7d || 0),
    lastEventAt: row.last_event_at || undefined,
  };
}
