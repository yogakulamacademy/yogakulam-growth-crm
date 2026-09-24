'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { useMockData } from '@/lib/config';
import type { Channel, IntentLevel, LeadStage } from '@/types/crm';

const allowedStages: LeadStage[] = ['new','contacted','engaged','qualified','high_intent','payment_pending','enrolled','nurture','not_now','lost','unqualified','duplicate'];
const allowedIntents: IntentLevel[] = ['unknown','low','medium','high','very_high'];
const allowedChannels: Channel[] = ['website','instagram','whatsapp','email','phone','meta_lead_form','other'];

function textValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '').trim();
  return value || null;
}
function monthDate(value: string | null) {
  if (!value) return null;
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
}
function safeChannel(value: string | null): Channel {
  return allowedChannels.includes(value as Channel) ? (value as Channel) : 'other';
}

export async function createLeadAction(formData: FormData) {
  if (useMockData) redirect('/leads?notice=mock-create');
  const firstName = textValue(formData, 'first_name');
  if (!firstName) redirect('/leads/new?error=First%20name%20is%20required');

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_crm_lead', {
    p_first_name: firstName,
    p_last_name: textValue(formData, 'last_name'),
    p_email: textValue(formData, 'email'),
    p_phone: textValue(formData, 'phone'),
    p_course_id: textValue(formData, 'course_id'),
    p_preferred_batch_id: textValue(formData, 'preferred_batch_id'),
    p_preferred_location: textValue(formData, 'preferred_location'),
    p_preferred_month: monthDate(textValue(formData, 'preferred_month')),
    p_preferred_mode: textValue(formData, 'preferred_mode'),
    p_country: textValue(formData, 'country'),
    p_timezone: textValue(formData, 'timezone'),
    p_lead_creation_channel: safeChannel(textValue(formData, 'lead_creation_channel')),
    p_current_contact_channel: safeChannel(textValue(formData, 'current_contact_channel')),
    p_first_touch_source: textValue(formData, 'first_touch_source'),
    p_first_touch_medium: textValue(formData, 'first_touch_medium'),
    p_first_touch_campaign: textValue(formData, 'first_touch_campaign'),
    p_notes: textValue(formData, 'notes'),
  });

  if (error) redirect(`/leads/new?error=${encodeURIComponent(error.message)}`);
  const id = Array.isArray(data) ? data[0]?.id : (data as any)?.id;
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  redirect(id ? `/leads/${id}` : '/leads');
}

export async function updateLeadAction(leadId: string, formData: FormData) {
  if (useMockData) redirect(`/leads/${leadId}?notice=mock-update`);
  const intentRaw = textValue(formData, 'intent');
  const intent: IntentLevel = allowedIntents.includes(intentRaw as IntentLevel) ? (intentRaw as IntentLevel) : 'unknown';
  const channel = safeChannel(textValue(formData, 'current_contact_channel'));
  const firstName = textValue(formData, 'first_name');
  const lastName = textValue(formData, 'last_name');

  const supabase = await createClient();
  const { error } = await supabase.from('leads').update({
    first_name: firstName,
    last_name: lastName,
    display_name: [firstName, lastName].filter(Boolean).join(' ') || null,
    interested_course_id: textValue(formData, 'course_id'),
    preferred_batch_id: textValue(formData, 'preferred_batch_id'),
    preferred_location: textValue(formData, 'preferred_location'),
    preferred_month: monthDate(textValue(formData, 'preferred_month')),
    preferred_mode: textValue(formData, 'preferred_mode'),
    country: textValue(formData, 'country'),
    timezone: textValue(formData, 'timezone'),
    current_contact_channel: channel,
    intent,
    summary: textValue(formData, 'summary'),
    notes: textValue(formData, 'notes'),
  }).eq('id', leadId);

  if (error) redirect(`/leads/${leadId}/edit?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  redirect(`/leads/${leadId}?notice=updated`);
}

export async function updateLeadStageAction(leadId: string, formData: FormData) {
  if (useMockData) redirect(`/leads/${leadId}?notice=mock-stage`);
  const rawStage = textValue(formData, 'stage');
  if (!allowedStages.includes(rawStage as LeadStage)) redirect(`/leads/${leadId}?error=Invalid%20stage`);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { error } = await supabase.rpc('set_lead_stage', {
    p_lead_id: leadId,
    p_new_stage: rawStage,
    p_changed_by_type: 'human',
    p_changed_by_id: claims?.claims?.sub ?? null,
    p_reason: textValue(formData, 'reason'),
  });
  if (error) redirect(`/leads/${leadId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/leads');
  revalidatePath('/pipeline');
  revalidatePath('/dashboard');
  redirect(`/leads/${leadId}?notice=stage-updated`);
}

export async function createFollowUpAction(leadId: string, formData: FormData) {
  if (useMockData) redirect(`/leads/${leadId}?notice=mock-followup`);
  const title = textValue(formData, 'title');
  const dueAt = textValue(formData, 'due_at');
  if (!title || !dueAt) redirect(`/leads/${leadId}?error=Follow-up%20title%20and%20time%20are%20required`);

  const supabase = await createClient();
  const { error } = await supabase.rpc('create_followup_task', {
    p_lead_id: leadId,
    p_title: title,
    p_due_at: new Date(dueAt!).toISOString(),
    p_description: textValue(formData, 'description'),
  });
  if (error) redirect(`/leads/${leadId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/follow-ups');
  revalidatePath('/dashboard');
  redirect(`/leads/${leadId}?notice=followup-created`);
}

export async function completeFollowUpAction(formData: FormData) {
  const taskId = textValue(formData, 'task_id');
  const leadId = textValue(formData, 'lead_id');
  if (!taskId) return;
  if (useMockData) redirect('/follow-ups?notice=mock-complete');

  const supabase = await createClient();
  const { error } = await supabase.rpc('complete_followup_task', { p_task_id: taskId });
  if (error) redirect(`/follow-ups?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/follow-ups');
  revalidatePath('/dashboard');
  if (leadId) revalidatePath(`/leads/${leadId}`);
  redirect('/follow-ups?notice=completed');
}

export async function logLeadInteractionAction(leadId: string, formData: FormData) {
  if (useMockData) redirect(`/leads/${leadId}?notice=mock-interaction`);

  const channel = safeChannel(textValue(formData, 'channel'));
  const directionRaw = textValue(formData, 'direction');
  const direction = directionRaw === 'inbound' ? 'inbound' : 'outbound';
  const body = textValue(formData, 'body');
  const conversationId = textValue(formData, 'conversation_id');
  if (!body) redirect(`/leads/${leadId}?error=Interaction%20text%20is%20required`);

  const supabase = await createClient();
  const { error } = await supabase.rpc('log_lead_interaction', {
    p_lead_id: leadId,
    p_channel: channel,
    p_direction: direction,
    p_body: body,
    p_conversation_id: conversationId,
  });

  if (error) redirect(`/leads/${leadId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  revalidatePath('/pipeline');
  revalidatePath('/conversations');
  redirect(`/leads/${leadId}?notice=interaction-logged`);
}

export async function snoozeFollowUpAction(formData: FormData) {
  const taskId = textValue(formData, 'task_id');
  const dueAt = textValue(formData, 'due_at');
  if (!taskId || !dueAt) redirect('/follow-ups?error=Task%20and%20new%20time%20are%20required');
  if (useMockData) redirect('/follow-ups?notice=mock-snooze');

  const supabase = await createClient();
  const { error } = await supabase.rpc('snooze_followup_task', {
    p_task_id: taskId,
    p_due_at: new Date(dueAt!).toISOString(),
  });
  if (error) redirect(`/follow-ups?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/follow-ups');
  revalidatePath('/dashboard');
  redirect('/follow-ups?notice=snoozed');
}
