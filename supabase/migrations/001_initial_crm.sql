-- Yogakulam Growth CRM v0.1
-- Initial Supabase/PostgreSQL schema

create extension if not exists pgcrypto;

-- ---------- ENUMS ----------
do $$ begin
  create type public.crm_user_role as enum ('admin','manager','admissions','analyst','viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lead_stage as enum (
    'new','contacted','engaged','qualified','high_intent','payment_pending','enrolled',
    'nurture','not_now','lost','unqualified','duplicate'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lead_status as enum ('open','won','lost','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.intent_level as enum ('unknown','low','medium','high','very_high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.contact_channel as enum ('website','instagram','whatsapp','email','phone','meta_lead_form','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.contact_type as enum ('email','phone','whatsapp','instagram_user_id','instagram_username','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.actor_type as enum ('lead','human','ai','automation','system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_direction as enum ('inbound','outbound');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_status as enum ('queued','sent','delivered','read','failed','received');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum ('open','completed','cancelled','snoozed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_type as enum ('follow_up','call','payment_check','human_review','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending','paid','failed','refunded','partially_refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_kind as enum ('deposit','balance','full','refund','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.enrollment_status as enum ('pending','confirmed','cancelled','completed','deferred');
exception when duplicate_object then null; end $$;

-- ---------- HELPERS ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- USERS / ACCESS ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.crm_user_role not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.is_crm_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true
  );
$$;

create or replace function public.can_write_crm()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and p.role in ('admin','manager','admissions')
  );
$$;

-- ---------- COURSE CATALOG ----------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text,
  hours integer,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create table if not exists public.course_batches (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  batch_code text unique,
  location text,
  mode text check (mode in ('residential','online','non_residential','hybrid')),
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  timezone text default 'Asia/Kolkata',
  capacity integer check (capacity is null or capacity >= 0),
  seats_remaining integer check (seats_remaining is null or seats_remaining >= 0),
  currency text,
  price_private numeric(12,2),
  price_shared numeric(12,2),
  price_course_only numeric(12,2),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_course_batches_course_dates on public.course_batches(course_id, start_date, end_date);
create trigger course_batches_set_updated_at
before update on public.course_batches
for each row execute function public.set_updated_at();

-- ---------- LEADS ----------
create sequence if not exists public.lead_number_seq start 1;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_number bigint not null unique default nextval('public.lead_number_seq'),
  lead_code text generated always as ('LD-' || lpad(lead_number::text, 6, '0')) stored,

  first_name text,
  last_name text,
  display_name text,

  current_stage public.lead_stage not null default 'new',
  status public.lead_status not null default 'open',
  intent public.intent_level not null default 'unknown',

  interested_course_id uuid references public.courses(id) on delete set null,
  preferred_batch_id uuid references public.course_batches(id) on delete set null,
  preferred_location text,
  preferred_month date,
  preferred_mode text,

  country text,
  timezone text,
  language text,

  lead_creation_channel public.contact_channel,
  current_contact_channel public.contact_channel,
  owner_user_id uuid references public.profiles(id) on delete set null,

  first_contacted_at timestamptz,
  last_contacted_at timestamptz,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  next_followup_at timestamptz,

  summary text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_stage on public.leads(current_stage);
create index if not exists idx_leads_status on public.leads(status);
create index if not exists idx_leads_intent on public.leads(intent);
create index if not exists idx_leads_owner on public.leads(owner_user_id);
create index if not exists idx_leads_course on public.leads(interested_course_id);
create index if not exists idx_leads_followup on public.leads(next_followup_at) where next_followup_at is not null;
create index if not exists idx_leads_created_at on public.leads(created_at desc);
create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

create table if not exists public.lead_contacts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  contact_type public.contact_type not null,
  value text not null,
  normalized_value text not null,
  is_primary boolean not null default false,
  verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(contact_type, normalized_value)
);

create index if not exists idx_lead_contacts_lead on public.lead_contacts(lead_id);

create table if not exists public.lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_stage public.lead_stage,
  to_stage public.lead_stage not null,
  changed_by_type public.actor_type not null default 'system',
  changed_by_id text,
  reason text,
  changed_at timestamptz not null default now()
);

create index if not exists idx_lead_stage_history_lead_time on public.lead_stage_history(lead_id, changed_at desc);

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
            else status
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

-- ---------- ACTIVITIES / TASKS ----------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  activity_type text not null,
  channel public.contact_channel,
  actor_type public.actor_type not null default 'human',
  actor_id text,
  title text,
  details text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_activities_lead_time on public.activities(lead_id, occurred_at desc);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  task_type public.task_type not null default 'follow_up',
  title text not null,
  description text,
  status public.task_status not null default 'open',
  due_at timestamptz,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by_type public.actor_type not null default 'human',
  created_by_id text,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_due on public.tasks(status, due_at) where status in ('open','snoozed');
create index if not exists idx_tasks_lead on public.tasks(lead_id);
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- ---------- CONVERSATIONS / MESSAGES ----------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  channel public.contact_channel not null,
  external_conversation_id text,
  external_account_id text,
  status text not null default 'open',
  assigned_to uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  last_message_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_conversation_external
  on public.conversations(channel, external_conversation_id)
  where external_conversation_id is not null;
create index if not exists idx_conversations_lead on public.conversations(lead_id, last_message_at desc);
create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  external_message_id text,
  direction public.message_direction not null,
  sender_type public.actor_type not null,
  sender_id text,
  message_type text not null default 'text',
  body text,
  template_key text,
  status public.message_status not null default 'received',
  ai_generated boolean not null default false,
  human_approved boolean not null default false,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  received_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_messages_external
  on public.messages(external_message_id)
  where external_message_id is not null;
create index if not exists idx_messages_conversation_time on public.messages(conversation_id, created_at desc);
create index if not exists idx_messages_lead_time on public.messages(lead_id, created_at desc);

-- ---------- MARKETING / ATTRIBUTION ----------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  external_campaign_id text,
  name text not null,
  source text,
  medium text,
  objective text,
  status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, external_campaign_id)
);

create trigger campaigns_set_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  platform text not null,
  external_adset_id text,
  external_ad_id text,
  adset_name text,
  ad_name text,
  creative_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, external_ad_id)
);

create index if not exists idx_ads_campaign on public.ads(campaign_id);
create trigger ads_set_updated_at
before update on public.ads
for each row execute function public.set_updated_at();

create table if not exists public.ad_spend_daily (
  id uuid primary key default gen_random_uuid(),
  spend_date date not null,
  platform text not null,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  ad_id uuid references public.ads(id) on delete cascade,
  currency text not null,
  spend numeric(14,2) not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  leads_reported bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(spend_date, platform, campaign_id, ad_id)
);

create table if not exists public.web_sessions (
  id uuid primary key default gen_random_uuid(),
  anonymous_visitor_id text not null,
  lead_id uuid references public.leads(id) on delete set null,
  session_key text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  landing_page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  gclid text,
  gbraid text,
  wbraid text,
  fbclid text,
  user_agent text,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_web_sessions_visitor on public.web_sessions(anonymous_visitor_id, started_at desc);
create index if not exists idx_web_sessions_lead on public.web_sessions(lead_id, started_at desc);
create index if not exists idx_web_sessions_gclid on public.web_sessions(gclid) where gclid is not null;
create index if not exists idx_web_sessions_fbclid on public.web_sessions(fbclid) where fbclid is not null;

create table if not exists public.touchpoints (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  web_session_id uuid references public.web_sessions(id) on delete set null,
  anonymous_visitor_id text,
  occurred_at timestamptz not null default now(),

  source text,
  medium text,
  campaign_name text,
  content text,
  term text,
  platform text,
  channel public.contact_channel,

  campaign_id uuid references public.campaigns(id) on delete set null,
  ad_id uuid references public.ads(id) on delete set null,

  landing_page text,
  referrer text,
  event_type text not null,

  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,

  gclid text,
  gbraid text,
  wbraid text,
  fbclid text,

  external_campaign_id text,
  external_adset_id text,
  external_ad_id text,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_touchpoints_lead_time on public.touchpoints(lead_id, occurred_at asc);
create index if not exists idx_touchpoints_visitor_time on public.touchpoints(anonymous_visitor_id, occurred_at asc);
create index if not exists idx_touchpoints_campaign on public.touchpoints(campaign_id);
create index if not exists idx_touchpoints_event on public.touchpoints(event_type, occurred_at desc);

create table if not exists public.lead_attribution (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  first_touchpoint_id uuid references public.touchpoints(id) on delete set null,
  last_touchpoint_id uuid references public.touchpoints(id) on delete set null,
  lead_creation_touchpoint_id uuid references public.touchpoints(id) on delete set null,
  conversion_touchpoint_id uuid references public.touchpoints(id) on delete set null,
  first_touch_source text,
  first_touch_medium text,
  first_touch_campaign text,
  last_touch_source text,
  last_touch_medium text,
  last_touch_campaign text,
  attribution_model text default 'first_last',
  attribution_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- PAYMENTS / ENROLLMENTS ----------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  enrollment_id uuid,
  provider text,
  external_payment_id text,
  payment_kind public.payment_kind not null default 'deposit',
  status public.payment_status not null default 'pending',
  amount numeric(14,2) not null,
  currency text not null,
  payment_link_sent_at timestamptz,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_lead on public.payments(lead_id, created_at desc);
create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  batch_id uuid references public.course_batches(id) on delete set null,
  status public.enrollment_status not null default 'pending',
  total_value numeric(14,2),
  currency text,
  enrolled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments
  drop constraint if exists payments_enrollment_id_fkey;
alter table public.payments
  add constraint payments_enrollment_id_fkey
  foreign key (enrollment_id) references public.enrollments(id) on delete set null;

create index if not exists idx_enrollments_lead on public.enrollments(lead_id, created_at desc);
create trigger enrollments_set_updated_at
before update on public.enrollments
for each row execute function public.set_updated_at();

-- ---------- PREDEFINED RESPONSES ----------
create table if not exists public.response_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  name text not null,
  channel public.contact_channel,
  category text,
  body text not null,
  variables jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  requires_ai boolean not null default false,
  requires_human_approval boolean not null default false,
  provider_template_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger response_templates_set_updated_at
before update on public.response_templates
for each row execute function public.set_updated_at();

-- ---------- USEFUL VIEWS ----------
create or replace view public.v_pipeline_counts as
select
  current_stage,
  count(*) as lead_count
from public.leads
where status <> 'archived'
group by current_stage;

create or replace view public.v_followups_due as
select
  t.id as task_id,
  t.lead_id,
  l.lead_code,
  coalesce(l.display_name, trim(concat_ws(' ', l.first_name, l.last_name)), l.lead_code) as lead_name,
  t.title,
  t.due_at,
  t.assigned_to,
  l.current_stage,
  l.intent
from public.tasks t
join public.leads l on l.id = t.lead_id
where t.status in ('open','snoozed')
  and t.due_at is not null
  and t.due_at <= now();

create or replace view public.v_leads_overview as
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
  l.created_at
from public.leads l
left join public.courses c on c.id = l.interested_course_id
left join public.lead_attribution la on la.lead_id = l.id;

-- ---------- ROW LEVEL SECURITY ----------
-- Internal CRM rule: active authenticated users can read; admin/manager/admissions can write.

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_batches enable row level security;
alter table public.leads enable row level security;
alter table public.lead_contacts enable row level security;
alter table public.lead_stage_history enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.campaigns enable row level security;
alter table public.ads enable row level security;
alter table public.ad_spend_daily enable row level security;
alter table public.web_sessions enable row level security;
alter table public.touchpoints enable row level security;
alter table public.lead_attribution enable row level security;
alter table public.payments enable row level security;
alter table public.enrollments enable row level security;
alter table public.response_templates enable row level security;

-- Profiles: users can read their own profile. Role assignment should be done by service role/admin backend.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using (id = auth.uid());

-- Helper macro via dynamic SQL is not available in policy DDL; define policies explicitly.
-- Read policies
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'courses','course_batches','leads','lead_contacts','lead_stage_history','activities','tasks',
    'conversations','messages','campaigns','ads','ad_spend_daily','web_sessions','touchpoints',
    'lead_attribution','payments','enrollments','response_templates'
  ]
  LOOP
    EXECUTE format('drop policy if exists %I on public.%I', tbl || '_read', tbl);
    EXECUTE format(
      'create policy %I on public.%I for select to authenticated using (public.is_crm_user())',
      tbl || '_read', tbl
    );
  END LOOP;
END $$;

-- Write policies
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'courses','course_batches','leads','lead_contacts','lead_stage_history','activities','tasks',
    'conversations','messages','campaigns','ads','ad_spend_daily','web_sessions','touchpoints',
    'lead_attribution','payments','enrollments','response_templates'
  ]
  LOOP
    EXECUTE format('drop policy if exists %I on public.%I', tbl || '_insert', tbl);
    EXECUTE format('drop policy if exists %I on public.%I', tbl || '_update', tbl);
    EXECUTE format('drop policy if exists %I on public.%I', tbl || '_delete', tbl);

    EXECUTE format(
      'create policy %I on public.%I for insert to authenticated with check (public.can_write_crm())',
      tbl || '_insert', tbl
    );
    EXECUTE format(
      'create policy %I on public.%I for update to authenticated using (public.can_write_crm()) with check (public.can_write_crm())',
      tbl || '_update', tbl
    );
    EXECUTE format(
      'create policy %I on public.%I for delete to authenticated using (public.can_write_crm())',
      tbl || '_delete', tbl
    );
  END LOOP;
END $$;

-- ---------- INITIAL STAGE HISTORY ----------
create or replace function public.log_new_lead_stage()
returns trigger
language plpgsql
as $$
begin
  insert into public.lead_stage_history(lead_id, from_stage, to_stage, changed_by_type, reason)
  values (new.id, null, new.current_stage, 'system', 'Lead created');
  return new;
end;
$$;

drop trigger if exists leads_log_initial_stage on public.leads;
create trigger leads_log_initial_stage
after insert on public.leads
for each row execute function public.log_new_lead_stage();

