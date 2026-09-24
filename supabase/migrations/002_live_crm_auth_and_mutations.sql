-- Yogakulam Growth CRM v0.2
-- Live-auth hardening, RLS-safe views, and atomic CRM mutation RPCs.

-- ---------- PROFILE VISIBILITY ----------
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_read_crm on public.profiles;
create policy profiles_read_crm on public.profiles
for select to authenticated
using (public.is_crm_user());

-- ---------- RLS-SAFE VIEWS ----------
create or replace view public.v_pipeline_counts
with (security_invoker = true)
as
select
  current_stage,
  count(*) as lead_count
from public.leads
where status <> 'archived'
group by current_stage;

create or replace view public.v_followups_due
with (security_invoker = true)
as
select
  t.id as task_id,
  t.lead_id,
  l.lead_code,
  coalesce(l.display_name, trim(concat_ws(' ', l.first_name, l.last_name)), l.lead_code) as lead_name,
  t.title,
  t.due_at,
  t.assigned_to,
  l.current_stage,
  l.intent,
  l.current_contact_channel
from public.tasks t
join public.leads l on l.id = t.lead_id
where t.status in ('open','snoozed')
  and t.due_at is not null
  and t.due_at <= now();

create or replace view public.v_leads_overview
with (security_invoker = true)
as
select
  l.id,
  l.lead_code,
  coalesce(l.display_name, trim(concat_ws(' ', l.first_name, l.last_name)), l.lead_code) as lead_name,
  l.current_stage,
  l.status,
  l.intent,
  c.name as course_name,
  l.preferred_location,
  l.preferred_month,
  l.country,
  l.lead_creation_channel,
  l.current_contact_channel,
  la.first_touch_source,
  la.first_touch_medium,
  la.first_touch_campaign,
  l.owner_user_id,
  l.next_followup_at,
  l.last_contacted_at,
  l.created_at,
  -- v0.2 additions must stay after the original v0.1 columns for CREATE OR REPLACE VIEW compatibility.
  l.first_name,
  l.last_name,
  l.display_name,
  l.interested_course_id,
  l.preferred_batch_id,
  l.preferred_mode,
  l.timezone,
  l.language,
  la.last_touch_source,
  la.last_touch_medium,
  la.last_touch_campaign,
  p.full_name as owner_name,
  l.first_contacted_at,
  l.last_inbound_at,
  l.last_outbound_at,
  l.summary,
  l.notes,
  l.updated_at
from public.leads l
left join public.courses c on c.id = l.interested_course_id
left join public.lead_attribution la on la.lead_id = l.id
left join public.profiles p on p.id = l.owner_user_id;

revoke all on public.v_pipeline_counts from anon;
revoke all on public.v_followups_due from anon;
revoke all on public.v_leads_overview from anon;
grant select on public.v_pipeline_counts to authenticated;
grant select on public.v_followups_due to authenticated;
grant select on public.v_leads_overview to authenticated;

-- ---------- TABLE GRANTS ----------
-- Keep unauthenticated browser clients out of the internal CRM entirely.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles','courses','course_batches','leads','lead_contacts','lead_stage_history','activities','tasks',
    'conversations','messages','campaigns','ads','ad_spend_daily','web_sessions','touchpoints',
    'lead_attribution','payments','enrollments','response_templates'
  ]
  LOOP
    EXECUTE format('revoke all on table public.%I from anon', tbl);
  END LOOP;
END $$;

-- Authenticated CRM users still rely on RLS for row/operation authorization.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles','courses','course_batches','leads','lead_contacts','lead_stage_history','activities','tasks',
    'conversations','messages','campaigns','ads','ad_spend_daily','web_sessions','touchpoints',
    'lead_attribution','payments','enrollments','response_templates'
  ]
  LOOP
    EXECUTE format('grant select on table public.%I to authenticated', tbl);
  END LOOP;

  FOREACH tbl IN ARRAY ARRAY[
    'courses','course_batches','leads','lead_contacts','lead_stage_history','activities','tasks',
    'conversations','messages','campaigns','ads','ad_spend_daily','web_sessions','touchpoints',
    'lead_attribution','payments','enrollments','response_templates'
  ]
  LOOP
    EXECUTE format('grant insert, update, delete on table public.%I to authenticated', tbl);
  END LOOP;
END $$;

-- ---------- STAGE RPC FIX ----------
create or replace function public.set_lead_stage(
  p_lead_id uuid,
  p_new_stage public.lead_stage,
  p_changed_by_type public.actor_type default 'system',
  p_changed_by_id text default null,
  p_reason text default null
)
returns public.leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.lead_stage;
  v_row public.leads;
begin
  if not public.can_write_crm() then
    raise exception 'Not authorized';
  end if;

  select current_stage into v_old
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'Lead not found';
  end if;

  if v_old is distinct from p_new_stage then
    update public.leads
      set current_stage = p_new_stage,
          status = case
            when p_new_stage = 'enrolled' then 'won'::public.lead_status
            when p_new_stage in ('lost','unqualified','duplicate') then 'lost'::public.lead_status
            else 'open'::public.lead_status
          end
      where id = p_lead_id
      returning * into v_row;

    insert into public.lead_stage_history(
      lead_id, from_stage, to_stage, changed_by_type, changed_by_id, reason
    ) values (
      p_lead_id, v_old, p_new_stage, p_changed_by_type, p_changed_by_id, p_reason
    );
  else
    select * into v_row from public.leads where id = p_lead_id;
  end if;

  return v_row;
end;
$$;

-- ---------- ATOMIC CREATE LEAD RPC ----------
create or replace function public.create_crm_lead(
  p_first_name text,
  p_last_name text default null,
  p_email text default null,
  p_phone text default null,
  p_course_id uuid default null,
  p_preferred_location text default null,
  p_preferred_month date default null,
  p_preferred_mode text default null,
  p_country text default null,
  p_timezone text default null,
  p_lead_creation_channel public.contact_channel default 'website',
  p_current_contact_channel public.contact_channel default 'website',
  p_first_touch_source text default null,
  p_first_touch_medium text default null,
  p_first_touch_campaign text default null,
  p_notes text default null
)
returns public.leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads;
  v_touchpoint_id uuid;
begin
  if not public.can_write_crm() then
    raise exception 'Not authorized';
  end if;

  insert into public.leads(
    first_name, last_name, display_name, interested_course_id, preferred_location, preferred_month,
    preferred_mode, country, timezone, lead_creation_channel, current_contact_channel, owner_user_id, notes
  ) values (
    nullif(trim(p_first_name), ''), nullif(trim(p_last_name), ''),
    nullif(trim(concat_ws(' ', p_first_name, p_last_name)), ''), p_course_id,
    nullif(trim(p_preferred_location), ''), p_preferred_month, nullif(trim(p_preferred_mode), ''),
    nullif(trim(p_country), ''), nullif(trim(p_timezone), ''), p_lead_creation_channel,
    p_current_contact_channel, auth.uid(), nullif(trim(p_notes), '')
  ) returning * into v_lead;

  if nullif(trim(p_email), '') is not null then
    insert into public.lead_contacts(lead_id, contact_type, value, normalized_value, is_primary)
    values (v_lead.id, 'email', trim(p_email), lower(trim(p_email)), true);
  end if;

  if nullif(trim(p_phone), '') is not null then
    insert into public.lead_contacts(lead_id, contact_type, value, normalized_value, is_primary)
    values (v_lead.id, 'phone', trim(p_phone), regexp_replace(p_phone, '[^0-9+]', '', 'g'), nullif(trim(p_email), '') is null);
  end if;

  if p_first_touch_source is not null or p_first_touch_campaign is not null then
    insert into public.touchpoints(
      lead_id, occurred_at, source, medium, campaign_name, channel, event_type,
      utm_source, utm_medium, utm_campaign
    ) values (
      v_lead.id, now(), p_first_touch_source, p_first_touch_medium, p_first_touch_campaign,
      p_lead_creation_channel, 'lead_created', p_first_touch_source, p_first_touch_medium, p_first_touch_campaign
    ) returning id into v_touchpoint_id;

    insert into public.lead_attribution(
      lead_id, first_touchpoint_id, last_touchpoint_id, lead_creation_touchpoint_id,
      first_touch_source, first_touch_medium, first_touch_campaign,
      last_touch_source, last_touch_medium, last_touch_campaign
    ) values (
      v_lead.id, v_touchpoint_id, v_touchpoint_id, v_touchpoint_id,
      p_first_touch_source, p_first_touch_medium, p_first_touch_campaign,
      p_first_touch_source, p_first_touch_medium, p_first_touch_campaign
    );
  else
    insert into public.lead_attribution(lead_id) values (v_lead.id);
  end if;

  insert into public.activities(
    lead_id, activity_type, channel, actor_type, actor_id, title, details
  ) values (
    v_lead.id, 'lead_created', p_lead_creation_channel, 'human', auth.uid()::text,
    'Lead created', 'Created manually in CRM'
  );

  return v_lead;
end;
$$;

-- ---------- ATOMIC FOLLOW-UP RPCS ----------
create or replace function public.create_followup_task(
  p_lead_id uuid,
  p_title text,
  p_due_at timestamptz,
  p_description text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks;
begin
  if not public.can_write_crm() then
    raise exception 'Not authorized';
  end if;

  insert into public.tasks(
    lead_id, task_type, title, description, status, due_at, assigned_to,
    created_by_type, created_by_id
  ) values (
    p_lead_id, 'follow_up', trim(p_title), nullif(trim(p_description), ''), 'open', p_due_at,
    auth.uid(), 'human', auth.uid()::text
  ) returning * into v_task;

  update public.leads
  set next_followup_at = case
    when next_followup_at is null then p_due_at
    else least(next_followup_at, p_due_at)
  end
  where id = p_lead_id;

  return v_task;
end;
$$;

create or replace function public.complete_followup_task(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks;
begin
  if not public.can_write_crm() then
    raise exception 'Not authorized';
  end if;

  update public.tasks
  set status = 'completed', completed_at = now()
  where id = p_task_id
  returning * into v_task;

  if not found then
    raise exception 'Task not found';
  end if;

  update public.leads l
  set next_followup_at = (
    select min(t.due_at)
    from public.tasks t
    where t.lead_id = v_task.lead_id
      and t.status in ('open','snoozed')
      and t.due_at is not null
  )
  where l.id = v_task.lead_id;

  return v_task;
end;
$$;

-- Function execution is authenticated-only. The functions also enforce CRM roles internally.
revoke execute on function public.set_lead_stage(uuid, public.lead_stage, public.actor_type, text, text) from public;
revoke execute on function public.create_crm_lead(text,text,text,text,uuid,text,date,text,text,text,public.contact_channel,public.contact_channel,text,text,text,text) from public;
revoke execute on function public.create_followup_task(uuid,text,timestamptz,text) from public;
revoke execute on function public.complete_followup_task(uuid) from public;

grant execute on function public.set_lead_stage(uuid, public.lead_stage, public.actor_type, text, text) to authenticated;
grant execute on function public.create_crm_lead(text,text,text,text,uuid,text,date,text,text,text,public.contact_channel,public.contact_channel,text,text,text,text) to authenticated;
grant execute on function public.create_followup_task(uuid,text,timestamptz,text) to authenticated;
grant execute on function public.complete_followup_task(uuid) to authenticated;
