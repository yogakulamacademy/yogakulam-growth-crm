-- Yogakulam Growth CRM v0.5
-- Realtime refresh + practical admissions operations for live testing.

begin;

-- ---------- REALTIME PUBLICATION ----------
do $$
declare
  tbl text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tbl in array array['leads','tasks','messages','activities','lead_stage_history','conversations']
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = tbl
      ) then
        execute format('alter publication supabase_realtime add table public.%I', tbl);
      end if;
    end loop;
  end if;
end $$;

-- ---------- LOG A MANUAL INTERACTION ----------
create or replace function public.log_lead_interaction(
  p_lead_id uuid,
  p_channel public.contact_channel,
  p_direction public.message_direction,
  p_body text,
  p_conversation_id uuid default null
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation public.conversations;
  v_message public.messages;
  v_stage public.lead_stage;
  v_now timestamptz := now();
begin
  if not public.can_write_crm() then
    raise exception 'Not authorized';
  end if;

  if nullif(trim(p_body), '') is null then
    raise exception 'Interaction text is required';
  end if;

  select current_stage into v_stage
  from public.leads
  where id = p_lead_id;

  if not found then
    raise exception 'Lead not found';
  end if;

  if p_conversation_id is not null then
    select * into v_conversation
    from public.conversations
    where id = p_conversation_id
      and lead_id = p_lead_id;

    if not found then
      raise exception 'Conversation not found for this lead';
    end if;
  else
    select * into v_conversation
    from public.conversations
    where lead_id = p_lead_id
      and channel = p_channel
      and status = 'open'
    order by coalesce(last_message_at, started_at) desc
    limit 1;

    if not found then
      insert into public.conversations(
        lead_id, channel, status, assigned_to, started_at, last_message_at
      ) values (
        p_lead_id, p_channel, 'open', auth.uid(), v_now, v_now
      ) returning * into v_conversation;
    end if;
  end if;

  insert into public.messages(
    conversation_id,
    lead_id,
    direction,
    sender_type,
    sender_id,
    message_type,
    body,
    status,
    human_approved,
    sent_at,
    received_at
  ) values (
    v_conversation.id,
    p_lead_id,
    p_direction,
    case when p_direction = 'inbound' then 'lead'::public.actor_type else 'human'::public.actor_type end,
    case when p_direction = 'outbound' then auth.uid()::text else null end,
    'text',
    trim(p_body),
    case when p_direction = 'inbound' then 'received'::public.message_status else 'sent'::public.message_status end,
    p_direction = 'outbound',
    case when p_direction = 'outbound' then v_now else null end,
    case when p_direction = 'inbound' then v_now else null end
  ) returning * into v_message;

  update public.conversations
  set last_message_at = v_now,
      assigned_to = coalesce(assigned_to, auth.uid())
  where id = v_conversation.id;

  update public.leads
  set current_contact_channel = p_channel,
      first_contacted_at = coalesce(first_contacted_at, v_now),
      last_contacted_at = v_now,
      last_inbound_at = case when p_direction = 'inbound' then v_now else last_inbound_at end,
      last_outbound_at = case when p_direction = 'outbound' then v_now else last_outbound_at end
  where id = p_lead_id;

  -- Practical stage assistance for manual testing. Humans can still change stage explicitly.
  if p_direction = 'outbound' and v_stage = 'new' then
    perform public.set_lead_stage(
      p_lead_id,
      'contacted',
      'human',
      auth.uid()::text,
      'First outbound interaction logged'
    );
  elsif p_direction = 'inbound' and v_stage in ('new','contacted') then
    perform public.set_lead_stage(
      p_lead_id,
      'engaged',
      'human',
      auth.uid()::text,
      'Inbound response logged'
    );
  end if;

  insert into public.activities(
    lead_id,
    activity_type,
    channel,
    actor_type,
    actor_id,
    title,
    details,
    metadata,
    occurred_at
  ) values (
    p_lead_id,
    case when p_direction = 'inbound' then 'inbound_interaction' else 'outbound_interaction' end,
    p_channel,
    case when p_direction = 'inbound' then 'lead'::public.actor_type else 'human'::public.actor_type end,
    case when p_direction = 'outbound' then auth.uid()::text else null end,
    case when p_direction = 'inbound' then 'Inbound interaction' else 'Outbound interaction' end,
    left(trim(p_body), 500),
    jsonb_build_object('conversation_id', v_conversation.id, 'message_id', v_message.id),
    v_now
  );

  return v_message;
end;
$$;

-- ---------- FOLLOW-UP OPERATIONS ----------
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

  insert into public.activities(
    lead_id, activity_type, actor_type, actor_id, title, details, metadata
  ) values (
    p_lead_id, 'followup_created', 'human', auth.uid()::text,
    'Follow-up scheduled', trim(p_title), jsonb_build_object('task_id', v_task.id, 'due_at', p_due_at)
  );

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

  insert into public.activities(
    lead_id, activity_type, actor_type, actor_id, title, details, metadata
  ) values (
    v_task.lead_id, 'followup_completed', 'human', auth.uid()::text,
    'Follow-up completed', v_task.title, jsonb_build_object('task_id', v_task.id)
  );

  return v_task;
end;
$$;

create or replace function public.snooze_followup_task(
  p_task_id uuid,
  p_due_at timestamptz
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

  update public.tasks
  set status = 'snoozed', due_at = p_due_at, completed_at = null
  where id = p_task_id
    and status in ('open','snoozed')
  returning * into v_task;

  if not found then
    raise exception 'Open task not found';
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

  insert into public.activities(
    lead_id, activity_type, actor_type, actor_id, title, details, metadata
  ) values (
    v_task.lead_id, 'followup_snoozed', 'human', auth.uid()::text,
    'Follow-up rescheduled', v_task.title, jsonb_build_object('task_id', v_task.id, 'due_at', p_due_at)
  );

  return v_task;
end;
$$;

-- ---------- AUTHENTICATED EXECUTION ONLY ----------
revoke execute on function public.log_lead_interaction(uuid, public.contact_channel, public.message_direction, text, uuid) from public;
revoke execute on function public.snooze_followup_task(uuid, timestamptz) from public;

grant execute on function public.log_lead_interaction(uuid, public.contact_channel, public.message_direction, text, uuid) to authenticated;
grant execute on function public.snooze_followup_task(uuid, timestamptz) to authenticated;

-- Existing functions were replaced above; keep authenticated-only execution.
revoke execute on function public.create_followup_task(uuid,text,timestamptz,text) from public;
revoke execute on function public.complete_followup_task(uuid) from public;
grant execute on function public.create_followup_task(uuid,text,timestamptz,text) to authenticated;
grant execute on function public.complete_followup_task(uuid) to authenticated;

commit;
