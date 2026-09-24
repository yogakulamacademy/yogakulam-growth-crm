-- Yogakulam Growth CRM v0.4
-- Course catalog + upcoming batches + batch-aware lead creation.
-- Run after 001, 002 and 003.

begin;

-- ---------- COURSE CATALOG ----------
insert into public.courses (code, name, category, hours, active)
values
  ('200H-YTT', '200-Hour Yoga Teacher Training', 'ytt', 200, true),
  ('300H-YTT', '300-Hour Yoga Teacher Training', 'ytt', 300, true),
  ('500H-YTT', '500-Hour Yoga Teacher Training', 'ytt', 500, true),
  ('100H-YTT', '100-Hour Yoga Teacher Training', 'ytt', 100, true),
  ('85H-PRENATAL', '85-Hour Prenatal & Postnatal Yoga TTC', 'prenatal', 85, true),
  ('100H-KUNDALINI', '100-Hour Tantra & Kundalini YTT', 'kundalini', 100, true),
  ('SOUND-L1', 'Sound Healing Level 1', 'sound_healing', null, true),
  ('SOUND-L2', 'Sound Healing Level 2', 'sound_healing', null, true),
  ('ONLINE-200H', 'Online 200-Hour Yoga Teacher Training', 'online_ytt', 200, true),
  ('ONLINE-PRENATAL', 'Online Prenatal & Postnatal TTC', 'online_prenatal', 85, true),
  ('FACE-YOGA', 'Online Face Yoga TTC', 'face_yoga', null, true),
  ('KIDS-YOGA', 'Online Kids Yoga TTC', 'kids_yoga', 95, true),
  ('YOGA-RETREAT', 'Yoga Retreat', 'retreat', null, true)
on conflict (code) do update
set name = excluded.name,
    category = excluded.category,
    hours = excluded.hours,
    active = true,
    updated_at = now();

-- ---------- UPCOMING / CURRENT BATCHES ----------
-- Batch codes are stable identifiers. Re-running this migration updates the same rows.
insert into public.course_batches
  (course_id, batch_code, location, mode, start_date, end_date, start_time, end_time, timezone, active, metadata)
select c.id, v.batch_code, v.location, v.mode, v.start_date, v.end_date, v.start_time, v.end_time,
       'Asia/Kolkata', true, jsonb_build_object('seed', 'v0.4')
from public.courses c
join (values
  ('200H-YTT', 'MYS-200H-2026-10', 'Mysore', 'residential', date '2026-10-07', date '2026-10-30', null::time, null::time),
  ('200H-YTT', 'MYS-200H-2026-11', 'Mysore', 'residential', date '2026-11-07', date '2026-11-30', null::time, null::time),
  ('200H-YTT', 'MYS-200H-2026-12', 'Mysore', 'residential', date '2026-12-07', date '2026-12-30', null::time, null::time),
  ('200H-YTT', 'MYS-200H-2027-01', 'Mysore', 'residential', date '2027-01-07', date '2027-01-30', null::time, null::time),

  ('200H-YTT', 'VARK-200H-2026-10', 'Varkala, Kerala', 'residential', date '2026-10-02', date '2026-10-25', null::time, null::time),
  ('200H-YTT', 'VARK-200H-2026-11', 'Varkala, Kerala', 'residential', date '2026-11-02', date '2026-11-25', null::time, null::time),
  ('200H-YTT', 'VARK-200H-2026-12', 'Varkala, Kerala', 'residential', date '2026-12-02', date '2026-12-25', null::time, null::time),
  ('200H-YTT', 'BLR-200H-2027-02-WD', 'Bengaluru - RT Nagar', 'non_residential', date '2027-02-01', date '2027-03-08', time '10:00', time '16:30'),

  ('300H-YTT', 'KER-300H-2026-10', 'Paravur, Kerala', 'residential', date '2026-10-02', date '2026-10-29', null::time, null::time),
  ('300H-YTT', 'VARK-300H-2026-12', 'Varkala, Kerala', 'residential', date '2026-12-02', date '2026-12-29', null::time, null::time),

  ('500H-YTT', 'MYS-500H-2026-10', 'Mysore', 'residential', date '2026-10-07', date '2026-12-04', null::time, null::time),
  ('100H-YTT', 'MYS-100H-2026-10', 'Mysore', 'residential', date '2026-10-07', date '2026-10-18', null::time, null::time),

  ('85H-PRENATAL', 'MYS-PRENATAL-2026-09', 'Mysore', 'residential', date '2026-09-17', date '2026-09-26', null::time, null::time),

  ('100H-KUNDALINI', 'MYS-KUND-2026-10', 'Mysore', 'residential', date '2026-10-20', date '2026-10-28', null::time, null::time),
  ('100H-KUNDALINI', 'MYS-KUND-2026-12', 'Mysore', 'residential', date '2026-12-20', date '2026-12-28', null::time, null::time),

  ('SOUND-L1', 'MYS-SOUND-L1-2026-10', 'Mysore', 'residential', date '2026-10-01', date '2026-10-05', null::time, null::time),
  ('SOUND-L2', 'MYS-SOUND-L2-2026-10', 'Mysore', 'residential', date '2026-10-07', date '2026-10-11', null::time, null::time),

  ('ONLINE-200H', 'ONLINE-200H-2026-10', 'Online', 'online', date '2026-10-15', date '2026-11-28', time '18:30', time '20:30'),
  ('ONLINE-PRENATAL', 'ONLINE-PRENATAL-166', 'Online', 'online', date '2026-10-21', date '2026-11-17', null::time, null::time),
  ('FACE-YOGA', 'ONLINE-FACE-2026-10', 'Online', 'online', date '2026-10-15', date '2026-10-29', time '15:00', time '17:00')
) as v(course_code, batch_code, location, mode, start_date, end_date, start_time, end_time)
  on c.code = v.course_code
on conflict (batch_code) do update
set course_id = excluded.course_id,
    location = excluded.location,
    mode = excluded.mode,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    timezone = excluded.timezone,
    active = true,
    metadata = excluded.metadata,
    updated_at = now();

-- ---------- BATCH-AWARE LEAD CREATION ----------
-- Replace the v0.2 RPC so a selected batch is stored atomically with the lead.
drop function if exists public.create_crm_lead(
  text,text,text,text,uuid,text,date,text,text,text,
  public.contact_channel,public.contact_channel,text,text,text,text
);

create or replace function public.create_crm_lead(
  p_first_name text,
  p_last_name text default null,
  p_email text default null,
  p_phone text default null,
  p_course_id uuid default null,
  p_preferred_batch_id uuid default null,
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
  v_batch_course_id uuid;
  v_course_id uuid := p_course_id;
begin
  if not public.can_write_crm() then
    raise exception 'Not authorized';
  end if;

  if p_preferred_batch_id is not null then
    select course_id into v_batch_course_id
    from public.course_batches
    where id = p_preferred_batch_id and active = true;

    if v_batch_course_id is null then
      raise exception 'Selected batch does not exist or is inactive';
    end if;

    if v_course_id is null then
      v_course_id := v_batch_course_id;
    elsif v_course_id <> v_batch_course_id then
      raise exception 'Selected batch does not belong to the selected course';
    end if;
  end if;

  insert into public.leads(
    first_name, last_name, display_name, interested_course_id, preferred_batch_id,
    preferred_location, preferred_month, preferred_mode, country, timezone,
    lead_creation_channel, current_contact_channel, owner_user_id, notes
  ) values (
    nullif(trim(p_first_name), ''), nullif(trim(p_last_name), ''),
    nullif(trim(concat_ws(' ', p_first_name, p_last_name)), ''), v_course_id,
    p_preferred_batch_id, nullif(trim(p_preferred_location), ''), p_preferred_month,
    nullif(trim(p_preferred_mode), ''), nullif(trim(p_country), ''),
    nullif(trim(p_timezone), ''), p_lead_creation_channel, p_current_contact_channel,
    auth.uid(), nullif(trim(p_notes), '')
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

revoke execute on function public.create_crm_lead(
  text,text,text,text,uuid,uuid,text,date,text,text,text,
  public.contact_channel,public.contact_channel,text,text,text,text
) from public;

grant execute on function public.create_crm_lead(
  text,text,text,text,uuid,uuid,text,date,text,text,text,
  public.contact_channel,public.contact_channel,text,text,text,text
) to authenticated;

commit;
