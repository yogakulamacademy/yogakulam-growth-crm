-- Yogakulam Growth CRM v0.6
-- Website identity linking, idempotent website-form lead ingestion and live website funnel health.

begin;

-- ---------- VISITOR → LEAD IDENTITY MAP ----------
-- Keeps future website events attached after an anonymous visitor becomes a known lead.
create table if not exists public.visitor_identity_links (
  anonymous_visitor_id text primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  last_session_key text,
  source_system text not null default 'website',
  linked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_visitor_identity_links_lead
  on public.visitor_identity_links(lead_id, updated_at desc);

drop trigger if exists visitor_identity_links_set_updated_at on public.visitor_identity_links;
create trigger visitor_identity_links_set_updated_at
before update on public.visitor_identity_links
for each row execute function public.set_updated_at();

-- ---------- IDEMPOTENT WEBSITE INGEST EVENTS ----------
create table if not exists public.lead_ingest_events (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  external_event_id text not null,
  lead_id uuid not null references public.leads(id) on delete cascade,
  site text,
  form_name text,
  matched_existing boolean not null default false,
  status text not null default 'processed' check (status in ('processed','ignored','failed')),
  metadata jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  unique(source_system, external_event_id)
);

create index if not exists idx_lead_ingest_events_received
  on public.lead_ingest_events(received_at desc);
create index if not exists idx_lead_ingest_events_lead
  on public.lead_ingest_events(lead_id, received_at desc);

alter table public.visitor_identity_links enable row level security;
alter table public.lead_ingest_events enable row level security;

drop policy if exists visitor_identity_links_read on public.visitor_identity_links;
create policy visitor_identity_links_read on public.visitor_identity_links
for select to authenticated using (public.is_crm_user());

drop policy if exists lead_ingest_events_read on public.lead_ingest_events;
create policy lead_ingest_events_read on public.lead_ingest_events
for select to authenticated using (public.is_crm_user());

-- Writes are intentionally service-role only. No authenticated write policy is created.
revoke all on public.visitor_identity_links from anon;
revoke all on public.lead_ingest_events from anon;
grant select on public.visitor_identity_links to authenticated;
grant select on public.lead_ingest_events to authenticated;

-- ---------- WEBSITE LEAD INGEST RPC ----------
-- Called only by the CRM server using the Supabase secret/service-role key.
create or replace function public.ingest_website_lead(
  p_external_event_id text,
  p_site text default null,
  p_form_name text default null,
  p_first_name text default null,
  p_last_name text default null,
  p_email text default null,
  p_phone text default null,
  p_course_code text default null,
  p_preferred_location text default null,
  p_preferred_month date default null,
  p_preferred_mode text default null,
  p_country text default null,
  p_timezone text default null,
  p_message text default null,
  p_anonymous_visitor_id text default null,
  p_session_key text default null,
  p_first_touch jsonb default '{}'::jsonb,
  p_session_touch jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_event public.lead_ingest_events;
  v_email_norm text := lower(nullif(trim(p_email), ''));
  v_phone_norm text := nullif(regexp_replace(coalesce(p_phone,''), '[^0-9+]', '', 'g'), '');
  v_email_lead uuid;
  v_phone_lead uuid;
  v_lead public.leads;
  v_course_id uuid;
  v_matched_existing boolean := false;
  v_conversation_id uuid;
  v_now timestamptz := now();
  v_source text := nullif(trim(coalesce(p_session_touch->>'source', p_first_touch->>'source')), '');
  v_medium text := nullif(trim(coalesce(p_session_touch->>'medium', p_first_touch->>'medium')), '');
  v_campaign text := nullif(trim(coalesce(p_session_touch->>'campaign', p_first_touch->>'campaign')), '');
  v_touchpoint_id uuid;
begin
  if nullif(trim(p_external_event_id), '') is null then
    raise exception 'external_event_id is required';
  end if;

  -- Serialize simultaneous retries of the same website submission.
  perform pg_advisory_xact_lock(hashtext('website:' || trim(p_external_event_id)));

  -- Idempotency: retries return the already-processed lead instead of creating a duplicate.
  select * into v_existing_event
  from public.lead_ingest_events
  where source_system = 'website'
    and external_event_id = trim(p_external_event_id)
  limit 1;

  if found then
    select * into v_lead from public.leads where id = v_existing_event.lead_id;
    return jsonb_build_object(
      'ok', true,
      'duplicate_event', true,
      'created', false,
      'matched_existing', v_existing_event.matched_existing,
      'lead_id', v_lead.id,
      'lead_code', v_lead.lead_code
    );
  end if;

  if v_email_norm is not null then
    select lead_id into v_email_lead
    from public.lead_contacts
    where contact_type = 'email' and normalized_value = v_email_norm
    limit 1;
  end if;

  if v_phone_norm is not null then
    select lead_id into v_phone_lead
    from public.lead_contacts
    where contact_type in ('phone','whatsapp') and normalized_value = v_phone_norm
    limit 1;
  end if;

  if v_email_lead is not null and v_phone_lead is not null and v_email_lead <> v_phone_lead then
    raise exception 'Email and phone belong to different existing leads';
  end if;

  if nullif(trim(p_course_code), '') is not null then
    select id into v_course_id
    from public.courses
    where code = trim(p_course_code) and active = true
    limit 1;
  end if;

  if coalesce(v_email_lead, v_phone_lead) is not null then
    v_matched_existing := true;

    update public.leads
    set first_name = coalesce(nullif(trim(p_first_name), ''), first_name),
        last_name = coalesce(nullif(trim(p_last_name), ''), last_name),
        display_name = coalesce(
          nullif(trim(concat_ws(' ', nullif(trim(p_first_name), ''), nullif(trim(p_last_name), ''))), ''),
          display_name
        ),
        interested_course_id = coalesce(v_course_id, interested_course_id),
        preferred_location = coalesce(nullif(trim(p_preferred_location), ''), preferred_location),
        preferred_month = coalesce(p_preferred_month, preferred_month),
        preferred_mode = coalesce(nullif(trim(p_preferred_mode), ''), preferred_mode),
        country = coalesce(nullif(trim(p_country), ''), country),
        timezone = coalesce(nullif(trim(p_timezone), ''), timezone),
        current_contact_channel = 'website',
        first_contacted_at = coalesce(first_contacted_at, v_now),
        last_contacted_at = v_now,
        last_inbound_at = v_now,
        notes = case
          when nullif(trim(p_message), '') is null then notes
          when notes is null or trim(notes) = '' then left(trim(p_message), 4000)
          else notes
        end,
        metadata = metadata || jsonb_build_object(
          'last_website_submission', jsonb_build_object(
            'event_id', trim(p_external_event_id),
            'site', nullif(trim(p_site), ''),
            'form_name', nullif(trim(p_form_name), ''),
            'received_at', v_now
          )
        )
    where id = coalesce(v_email_lead, v_phone_lead)
    returning * into v_lead;
  else
    insert into public.leads(
      first_name, last_name, display_name, interested_course_id,
      preferred_location, preferred_month, preferred_mode, country, timezone,
      lead_creation_channel, current_contact_channel,
      first_contacted_at, last_contacted_at, last_inbound_at,
      notes, metadata
    ) values (
      nullif(trim(p_first_name), ''),
      nullif(trim(p_last_name), ''),
      coalesce(
        nullif(trim(concat_ws(' ', nullif(trim(p_first_name), ''), nullif(trim(p_last_name), ''))), ''),
        nullif(v_email_norm, ''), nullif(v_phone_norm, ''), 'Website Lead'
      ),
      v_course_id,
      nullif(trim(p_preferred_location), ''), p_preferred_month,
      nullif(trim(p_preferred_mode), ''), nullif(trim(p_country), ''), nullif(trim(p_timezone), ''),
      'website', 'website', v_now, v_now, v_now,
      nullif(left(trim(p_message), 4000), ''),
      jsonb_build_object(
        'website_capture', jsonb_build_object(
          'event_id', trim(p_external_event_id),
          'site', nullif(trim(p_site), ''),
          'form_name', nullif(trim(p_form_name), ''),
          'received_at', v_now
        )
      ) || coalesce(p_metadata, '{}'::jsonb)
    ) returning * into v_lead;
  end if;

  -- Add any newly supplied contact identifiers to the resolved lead.
  if v_email_norm is not null then
    insert into public.lead_contacts(lead_id, contact_type, value, normalized_value, is_primary)
    values (v_lead.id, 'email', trim(p_email), v_email_norm, true)
    on conflict (contact_type, normalized_value) do nothing;
  end if;

  if v_phone_norm is not null then
    insert into public.lead_contacts(lead_id, contact_type, value, normalized_value, is_primary)
    values (v_lead.id, 'phone', trim(p_phone), v_phone_norm, v_email_norm is null)
    on conflict (contact_type, normalized_value) do nothing;
  end if;

  -- Persist identity so both historical and future first-party events attach to this lead.
  if nullif(trim(p_anonymous_visitor_id), '') is not null then
    insert into public.visitor_identity_links(
      anonymous_visitor_id, lead_id, last_session_key, source_system, metadata
    ) values (
      trim(p_anonymous_visitor_id), v_lead.id, nullif(trim(p_session_key), ''), 'website',
      jsonb_build_object('last_external_event_id', trim(p_external_event_id))
    )
    on conflict (anonymous_visitor_id) do update set
      lead_id = excluded.lead_id,
      last_session_key = excluded.last_session_key,
      source_system = excluded.source_system,
      linked_at = now(),
      metadata = public.visitor_identity_links.metadata || excluded.metadata,
      updated_at = now();

    perform public.attach_visitor_journey_to_lead(
      v_lead.id,
      trim(p_anonymous_visitor_id),
      nullif(trim(p_session_key), '')
    );
  end if;

  -- Ensure a lead-creation touchpoint exists even if the browser tracker was unavailable.
  insert into public.touchpoints(
    lead_id, anonymous_visitor_id, occurred_at,
    source, medium, campaign_name, platform, channel,
    event_type, utm_source, utm_medium, utm_campaign,
    gclid, gbraid, wbraid, fbclid,
    external_campaign_id, external_adset_id, external_ad_id,
    metadata
  ) values (
    v_lead.id, nullif(trim(p_anonymous_visitor_id), ''), v_now,
    v_source, v_medium, v_campaign, v_source, 'website',
    'lead_created', v_source, v_medium, v_campaign,
    nullif(p_session_touch->>'gclid',''), nullif(p_session_touch->>'gbraid',''),
    nullif(p_session_touch->>'wbraid',''), nullif(p_session_touch->>'fbclid',''),
    nullif(p_session_touch->>'campaignId',''), nullif(p_session_touch->>'adsetId',''),
    coalesce(nullif(p_session_touch->>'adId',''), nullif(p_session_touch->>'creativeId','')),
    jsonb_build_object(
      'external_event_id', trim(p_external_event_id),
      'site', nullif(trim(p_site), ''),
      'form_name', nullif(trim(p_form_name), ''),
      'capture', 'server'
    ) || coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_touchpoint_id;

  perform public.refresh_lead_attribution_internal(v_lead.id);

  -- Record the website form as an inbound conversation message when it includes a message/query.
  if nullif(trim(p_message), '') is not null then
    select id into v_conversation_id
    from public.conversations
    where lead_id = v_lead.id and channel = 'website' and status = 'open'
    order by coalesce(last_message_at, started_at) desc
    limit 1;

    if v_conversation_id is null then
      insert into public.conversations(
        lead_id, channel, status, started_at, last_message_at,
        external_conversation_id, metadata
      ) values (
        v_lead.id, 'website', 'open', v_now, v_now,
        null,
        jsonb_build_object('site', p_site, 'form_name', p_form_name)
      ) returning id into v_conversation_id;
    else
      update public.conversations set last_message_at = v_now where id = v_conversation_id;
    end if;

    insert into public.messages(
      conversation_id, lead_id, external_message_id, direction,
      sender_type, message_type, body, status, received_at, metadata
    )
    select
      v_conversation_id, v_lead.id, 'website:' || trim(p_external_event_id),
      'inbound', 'lead', 'text', left(trim(p_message), 8000),
      'received', v_now,
      jsonb_build_object('site', p_site, 'form_name', p_form_name)
    where not exists (
      select 1 from public.messages
      where external_message_id = 'website:' || trim(p_external_event_id)
    );
  end if;

  insert into public.activities(
    lead_id, activity_type, channel, actor_type, actor_id,
    title, details, metadata, occurred_at
  ) values (
    v_lead.id,
    case when v_matched_existing then 'website_form_repeat' else 'website_lead_created' end,
    'website', 'automation', 'website-capture',
    case when v_matched_existing then 'Website enquiry received' else 'Website lead created' end,
    left(coalesce(nullif(trim(p_message), ''), coalesce(p_form_name, 'Website form submission')), 500),
    jsonb_build_object(
      'external_event_id', trim(p_external_event_id),
      'site', p_site,
      'form_name', p_form_name,
      'matched_existing', v_matched_existing
    ) || coalesce(p_metadata, '{}'::jsonb),
    v_now
  );

  insert into public.lead_ingest_events(
    source_system, external_event_id, lead_id, site, form_name,
    matched_existing, status, metadata, received_at
  ) values (
    'website', trim(p_external_event_id), v_lead.id,
    nullif(trim(p_site), ''), nullif(trim(p_form_name), ''),
    v_matched_existing, 'processed',
    jsonb_build_object(
      'anonymous_visitor_id', nullif(trim(p_anonymous_visitor_id), ''),
      'session_key', nullif(trim(p_session_key), '')
    ) || coalesce(p_metadata, '{}'::jsonb),
    v_now
  );

  return jsonb_build_object(
    'ok', true,
    'duplicate_event', false,
    'created', not v_matched_existing,
    'matched_existing', v_matched_existing,
    'lead_id', v_lead.id,
    'lead_code', v_lead.lead_code,
    'touchpoint_id', v_touchpoint_id
  );
end;
$$;

revoke all on function public.ingest_website_lead(
  text,text,text,text,text,text,text,text,text,date,text,text,text,text,text,text,jsonb,jsonb,jsonb
) from public, anon, authenticated;
grant execute on function public.ingest_website_lead(
  text,text,text,text,text,text,text,text,text,date,text,text,text,text,text,text,jsonb,jsonb,jsonb
) to service_role;

-- ---------- WEBSITE FUNNEL / CAPTURE HEALTH ----------
create or replace view public.v_website_capture_health
with (security_invoker = true)
as
select
  count(*) filter (where received_at >= now() - interval '24 hours') as submissions_24h,
  count(*) filter (where received_at >= now() - interval '24 hours' and matched_existing = false) as new_leads_24h,
  count(*) filter (where received_at >= now() - interval '24 hours' and matched_existing = true) as matched_existing_24h,
  count(*) filter (where received_at >= now() - interval '7 days') as submissions_7d,
  max(received_at) as last_submission_at
from public.lead_ingest_events;

revoke all on public.v_website_capture_health from anon;
grant select on public.v_website_capture_health to authenticated;

create or replace view public.v_web_funnel_7d
with (security_invoker = true)
as
select
  count(*) filter (where event_type = 'page_view' and occurred_at >= now() - interval '7 days') as page_views,
  count(distinct anonymous_visitor_id) filter (where event_type = 'page_view' and occurred_at >= now() - interval '7 days') as visitors,
  count(*) filter (where event_type = 'form_start' and occurred_at >= now() - interval '7 days') as form_starts,
  count(*) filter (where event_type = 'lead_form_submit' and occurred_at >= now() - interval '7 days') as browser_form_submits,
  count(*) filter (where event_type in ('whatsapp_click','instagram_click','email_click','phone_click','enrollment_cta_click') and occurred_at >= now() - interval '7 days') as contact_cta_clicks,
  count(*) filter (where lead_id is not null and occurred_at >= now() - interval '7 days') as identified_touchpoints
from public.touchpoints;

revoke all on public.v_web_funnel_7d from anon;
grant select on public.v_web_funnel_7d to authenticated;

-- Include the new operational tables in Supabase Realtime when available.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lead_ingest_events'
    ) then
      alter publication supabase_realtime add table public.lead_ingest_events;
    end if;
  end if;
end $$;

commit;
