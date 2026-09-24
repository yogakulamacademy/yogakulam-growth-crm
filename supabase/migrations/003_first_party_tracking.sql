-- Yogakulam Growth CRM v0.3
-- First-party website tracking, anonymous journey linking and attribution refresh.

-- ---------- TRACKING HARDENING ----------
alter table public.web_sessions
  add column if not exists last_seen_at timestamptz,
  add column if not exists site text,
  add column if not exists source text,
  add column if not exists medium text,
  add column if not exists campaign_name text;

update public.web_sessions
set last_seen_at = coalesce(last_seen_at, started_at)
where last_seen_at is null;

create unique index if not exists uq_web_sessions_session_key
  on public.web_sessions(session_key);

alter table public.touchpoints
  add column if not exists event_id text;

create unique index if not exists uq_touchpoints_event_id
  on public.touchpoints(event_id);

create index if not exists idx_touchpoints_click_ids
  on public.touchpoints(gclid, gbraid, wbraid, fbclid);

-- Keep acquisition credit separate from later direct/contact events.
alter table public.lead_attribution
  add column if not exists first_marketing_touchpoint_id uuid references public.touchpoints(id) on delete set null,
  add column if not exists last_marketing_touchpoint_id uuid references public.touchpoints(id) on delete set null,
  add column if not exists lead_creation_source text,
  add column if not exists lead_creation_medium text,
  add column if not exists lead_creation_campaign text,
  add column if not exists conversion_source text,
  add column if not exists conversion_medium text,
  add column if not exists conversion_campaign text;

-- ---------- ATTRIBUTION REFRESH ----------
create or replace function public.refresh_lead_attribution_internal(p_lead_id uuid)
returns public.lead_attribution
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first public.touchpoints;
  v_last public.touchpoints;
  v_first_marketing public.touchpoints;
  v_last_marketing public.touchpoints;
  v_creation public.touchpoints;
  v_conversion public.touchpoints;
  v_result public.lead_attribution;
begin
  select * into v_first from public.touchpoints
    where lead_id = p_lead_id
    order by occurred_at asc, created_at asc limit 1;

  select * into v_last from public.touchpoints
    where lead_id = p_lead_id
    order by occurred_at desc, created_at desc limit 1;

  select * into v_first_marketing from public.touchpoints
    where lead_id = p_lead_id
      and (
        gclid is not null or gbraid is not null or wbraid is not null or fbclid is not null
        or coalesce(nullif(lower(source), ''), 'direct') not in ('direct','unknown')
      )
      and coalesce(lower(medium), '') <> 'internal'
    order by occurred_at asc, created_at asc limit 1;

  select * into v_last_marketing from public.touchpoints
    where lead_id = p_lead_id
      and (
        gclid is not null or gbraid is not null or wbraid is not null or fbclid is not null
        or coalesce(nullif(lower(source), ''), 'direct') not in ('direct','unknown')
      )
      and coalesce(lower(medium), '') <> 'internal'
    order by occurred_at desc, created_at desc limit 1;

  select * into v_creation from public.touchpoints
    where lead_id = p_lead_id
      and event_type in ('lead_created','form_submit','lead_form_submit','instagram_dm_started','whatsapp_started','meta_lead_created')
    order by occurred_at asc, created_at asc limit 1;

  select * into v_conversion from public.touchpoints
    where lead_id = p_lead_id
      and event_type in ('deposit_paid','payment_completed','enrolled','conversion')
    order by occurred_at desc, created_at desc limit 1;

  insert into public.lead_attribution(
    lead_id,
    first_touchpoint_id, last_touchpoint_id,
    first_marketing_touchpoint_id, last_marketing_touchpoint_id,
    lead_creation_touchpoint_id, conversion_touchpoint_id,
    first_touch_source, first_touch_medium, first_touch_campaign,
    last_touch_source, last_touch_medium, last_touch_campaign,
    lead_creation_source, lead_creation_medium, lead_creation_campaign,
    conversion_source, conversion_medium, conversion_campaign,
    updated_at
  ) values (
    p_lead_id,
    v_first.id, v_last.id,
    v_first_marketing.id, v_last_marketing.id,
    v_creation.id, v_conversion.id,
    coalesce(v_first_marketing.source, v_first.source), coalesce(v_first_marketing.medium, v_first.medium), coalesce(v_first_marketing.campaign_name, v_first.campaign_name),
    coalesce(v_last_marketing.source, v_last.source), coalesce(v_last_marketing.medium, v_last.medium), coalesce(v_last_marketing.campaign_name, v_last.campaign_name),
    v_creation.source, v_creation.medium, v_creation.campaign_name,
    v_conversion.source, v_conversion.medium, v_conversion.campaign_name,
    now()
  )
  on conflict (lead_id) do update set
    first_touchpoint_id = excluded.first_touchpoint_id,
    last_touchpoint_id = excluded.last_touchpoint_id,
    first_marketing_touchpoint_id = excluded.first_marketing_touchpoint_id,
    last_marketing_touchpoint_id = excluded.last_marketing_touchpoint_id,
    lead_creation_touchpoint_id = excluded.lead_creation_touchpoint_id,
    conversion_touchpoint_id = excluded.conversion_touchpoint_id,
    first_touch_source = excluded.first_touch_source,
    first_touch_medium = excluded.first_touch_medium,
    first_touch_campaign = excluded.first_touch_campaign,
    last_touch_source = excluded.last_touch_source,
    last_touch_medium = excluded.last_touch_medium,
    last_touch_campaign = excluded.last_touch_campaign,
    lead_creation_source = excluded.lead_creation_source,
    lead_creation_medium = excluded.lead_creation_medium,
    lead_creation_campaign = excluded.lead_creation_campaign,
    conversion_source = excluded.conversion_source,
    conversion_medium = excluded.conversion_medium,
    conversion_campaign = excluded.conversion_campaign,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.refresh_lead_attribution_internal(uuid) from public, anon, authenticated;
grant execute on function public.refresh_lead_attribution_internal(uuid) to service_role;

-- Automatically keep attribution current when already-identified touchpoints are added.
create or replace function public.touchpoint_refresh_attribution_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.lead_id is not null then
    perform public.refresh_lead_attribution_internal(new.lead_id);
  end if;
  if tg_op = 'UPDATE' and old.lead_id is not null and old.lead_id is distinct from new.lead_id then
    perform public.refresh_lead_attribution_internal(old.lead_id);
  end if;
  return new;
end;
$$;

revoke all on function public.touchpoint_refresh_attribution_trigger() from public, anon, authenticated;

drop trigger if exists touchpoints_refresh_attribution on public.touchpoints;
create trigger touchpoints_refresh_attribution
after insert or update of lead_id, occurred_at, source, medium, campaign_name, event_type
on public.touchpoints
for each row execute function public.touchpoint_refresh_attribution_trigger();

-- ---------- LINK ANONYMOUS JOURNEY TO A KNOWN LEAD ----------
create or replace function public.attach_visitor_journey_to_lead(
  p_lead_id uuid,
  p_anonymous_visitor_id text,
  p_session_key text default null
)
returns public.lead_attribution
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.lead_attribution;
begin
  if not exists (select 1 from public.leads where id = p_lead_id) then
    raise exception 'Lead not found';
  end if;
  if nullif(trim(p_anonymous_visitor_id), '') is null then
    raise exception 'anonymous visitor id is required';
  end if;

  -- Link all sessions from the same first-party visitor ID. Session key remains useful
  -- for diagnosis and can identify the current session even when no historical cookie exists.
  update public.web_sessions
  set lead_id = p_lead_id
  where anonymous_visitor_id = p_anonymous_visitor_id
     or (p_session_key is not null and session_key = p_session_key);

  update public.touchpoints
  set lead_id = p_lead_id
  where anonymous_visitor_id = p_anonymous_visitor_id
     or (p_session_key is not null and web_session_id in (
       select id from public.web_sessions where session_key = p_session_key
     ));

  select * into v_result from public.refresh_lead_attribution_internal(p_lead_id);
  return v_result;
end;
$$;

revoke all on function public.attach_visitor_journey_to_lead(uuid,text,text) from public, anon, authenticated;
grant execute on function public.attach_visitor_journey_to_lead(uuid,text,text) to service_role;

-- ---------- TRACKING HEALTH VIEW ----------
create or replace view public.v_tracking_health
with (security_invoker = true)
as
select
  count(*) filter (where occurred_at >= now() - interval '24 hours') as events_24h,
  count(distinct anonymous_visitor_id) filter (where occurred_at >= now() - interval '24 hours') as visitors_24h,
  count(*) filter (where lead_id is not null and occurred_at >= now() - interval '24 hours') as identified_events_24h,
  count(*) filter (where gclid is not null and occurred_at >= now() - interval '7 days') as gclid_events_7d,
  count(*) filter (where fbclid is not null and occurred_at >= now() - interval '7 days') as fbclid_events_7d,
  max(occurred_at) as last_event_at
from public.touchpoints;

revoke all on public.v_tracking_health from anon;
grant select on public.v_tracking_health to authenticated;

-- ---------- LEADS OVERVIEW ATTRIBUTION ADDITIONS ----------
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
  l.updated_at,
  -- v0.3 additions must remain after v0.2 columns for CREATE OR REPLACE VIEW compatibility.
  la.lead_creation_source,
  la.lead_creation_medium,
  la.lead_creation_campaign,
  la.conversion_source,
  la.conversion_medium,
  la.conversion_campaign,
  la.first_marketing_touchpoint_id,
  la.last_marketing_touchpoint_id
from public.leads l
left join public.courses c on c.id = l.interested_course_id
left join public.lead_attribution la on la.lead_id = l.id
left join public.profiles p on p.id = l.owner_user_id;

revoke all on public.v_leads_overview from anon;
grant select on public.v_leads_overview to authenticated;
