begin;

-- =============================================================================
-- 049_instagram_raw_event_processing_state.sql
--
-- Synchronize Instagram DM CRM ingestion with canonical raw_event_processing.
-- Migration 048 remains immutable.
-- =============================================================================

create or replace function public.ingest_instagram_dm_event(
  p_raw_event_id uuid,

  p_sender_username text default null,

  p_message_type text default 'text',

  p_body text default null,

  p_message_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_event public.raw_events%rowtype;

  v_instagram_account_id text;

  v_sender_id text;

  v_external_message_id text;

  v_sender_username text;

  v_message_type text;

  v_body text;

  v_message_at timestamptz;

  v_lead_id uuid;

  v_conversation_id uuid;

  v_external_conversation_id text;

  v_claimed_message_id text;

  v_created_lead boolean := false;

  v_crm_message public.messages%rowtype;
begin

  -- ---------------------------------------------------------------------------
  -- LOAD CANONICAL RAW EVENT
  -- ---------------------------------------------------------------------------

  select *
  into v_event
  from public.raw_events
  where id = p_raw_event_id
  for update;


  if not found then
    return jsonb_build_object(
      'ok',
      false,

      'error',
      'Instagram raw event not found',

      'raw_event_id',
      p_raw_event_id
    );
  end if;


  if v_event.source_system <> 'instagram' then
    return jsonb_build_object(
      'ok',
      false,

      'error',
      'Raw event is not an Instagram event',

      'raw_event_id',
      p_raw_event_id,

      'source_system',
      v_event.source_system
    );
  end if;


  if exists (
    select 1
    from public.raw_event_processing rep
    where rep.raw_event_id =
      p_raw_event_id

      and rep.organization_id =
        v_event.organization_id

      and rep.status =
        'processed'
  ) then

    return jsonb_build_object(
      'ok',
      true,

      'already_processed',
      true,

      'raw_event_id',
      p_raw_event_id
    );

  end if;


  perform public.set_raw_event_processing_status(
    v_event.organization_id,
    'instagram',
    v_event.source_event_id,
    'processing',
    'instagram_dm_ingestion',
    '049',
    null,
    jsonb_build_object(
      'raw_event_id',
      p_raw_event_id
    )
  );


  begin

    -- -------------------------------------------------------------------------
    -- NORMALIZED PROVIDER IDENTITIES
    -- -------------------------------------------------------------------------

    v_instagram_account_id :=
      nullif(
        btrim(
          coalesce(
            v_event.source_account_id,
            ''
          )
        ),
        ''
      );


    v_sender_id :=
      nullif(
        btrim(
          coalesce(
            v_event.source_subject_id,
            ''
          )
        ),
        ''
      );


    v_external_message_id :=
      nullif(
        btrim(
          coalesce(
            v_event.external_message_id,
            ''
          )
        ),
        ''
      );


    v_sender_username :=
      nullif(
        btrim(
          coalesce(
            p_sender_username,
            ''
          )
        ),
        ''
      );


    v_message_type :=
      coalesce(
        nullif(
          btrim(
            coalesce(
              p_message_type,
              ''
            )
          ),
          ''
        ),
        'unknown'
      );


    v_message_at :=
      coalesce(
        p_message_at,
        v_event.occurred_at,
        v_event.received_at,
        now()
      );


    if v_instagram_account_id is null then
      raise exception
        'Instagram receiving account ID is missing';
    end if;


    if v_sender_id is null then
      raise exception
        'Instagram sender ID is missing';
    end if;


    if v_external_message_id is null then
      raise exception
        'Instagram external message ID is missing';
    end if;



    -- -------------------------------------------------------------------------
    -- VERIFY TENANT / CONNECTED INSTAGRAM ACCOUNT
    --
    -- raw_events contains the tenant selected by the webhook adapter.
    -- Verify that the receiving Instagram professional account actually belongs
    -- to a connected Instagram integration in the same workspace.
    -- -------------------------------------------------------------------------

    if not exists (
      select 1

      from public.integration_connections ic

      where ic.organization_id =
        v_event.organization_id

        and ic.provider =
          'instagram'

        and ic.status =
          'connected'

        and ic.external_account_id =
          v_instagram_account_id
    ) then

      raise exception
        'No connected Instagram account mapping exists for account % in organization %',
        v_instagram_account_id,
        v_event.organization_id;

    end if;



    -- -------------------------------------------------------------------------
    -- TENANT + ACCOUNT + SENDER LOCK
    --
    -- Prevent two first messages from the same Instagram user racing each other
    -- and creating duplicate leads/conversations.
    -- -------------------------------------------------------------------------

    perform pg_advisory_xact_lock(
      hashtextextended(
        v_event.organization_id::text
        || ':instagram:'
        || v_instagram_account_id
        || ':'
        || v_sender_id,
        0
      )
    );



    -- -------------------------------------------------------------------------
    -- MESSAGE BODY
    -- -------------------------------------------------------------------------

    v_body :=
      nullif(
        btrim(
          coalesce(
            p_body,
            ''
          )
        ),
        ''
      );


    if v_body is null then

      v_body :=
        case v_message_type

          when 'image' then
            '[Instagram image]'

          when 'video' then
            '[Instagram video]'

          when 'audio' then
            '[Instagram audio message]'

          when 'file' then
            '[Instagram file]'

          when 'share' then
            '[Instagram shared media]'

          when 'story_mention' then
            '[Instagram story mention]'

          when 'reaction' then
            '[Instagram reaction]'

          when 'postback' then
            '[Instagram postback]'

          else
            concat(
              '[Instagram ',
              v_message_type,
              ' message]'
            )

        end;

    end if;



    -- -------------------------------------------------------------------------
    -- EXISTING LEAD LOOKUP
    --
    -- Stable Instagram-scoped user ID is the authoritative identity.
    -- Username is deliberately not used for lead matching because usernames
    -- can change or be reassigned.
    -- -------------------------------------------------------------------------

    select lc.lead_id
    into v_lead_id

    from public.lead_contacts lc

    where lc.organization_id =
      v_event.organization_id

      and lc.contact_type =
        'instagram_user_id'::public.contact_type

      and lc.normalized_value =
        v_sender_id

    order by lc.created_at asc

    limit 1;



    -- -------------------------------------------------------------------------
    -- CREATE NEW TENANT-SCOPED LEAD
    -- -------------------------------------------------------------------------

    if v_lead_id is null then

      select created.id
      into v_lead_id

      from public.create_crm_lead(

        p_organization_id =>
          v_event.organization_id,

        p_first_name =>
          coalesce(
            v_sender_username,
            'Instagram Lead'
          ),

        p_last_name =>
          null,

        p_email =>
          null,

        p_phone =>
          null,

        p_course_id =>
          null,

        p_preferred_batch_id =>
          null,

        p_preferred_location =>
          null,

        p_preferred_month =>
          null,

        p_preferred_mode =>
          null,

        p_country =>
          null,

        p_timezone =>
          null,

        p_lead_creation_channel =>
          'instagram'::public.contact_channel,

        p_current_contact_channel =>
          'instagram'::public.contact_channel,

        p_first_touch_source =>
          'instagram',

        p_first_touch_medium =>
          'messaging',

        p_first_touch_campaign =>
          null,

        p_notes =>
          'Created automatically from an inbound Instagram Messaging API message.'

      ) as created;


      v_created_lead :=
        true;

    end if;


    if v_lead_id is null then
      raise exception
        'Unable to resolve/create CRM lead for Instagram sender %',
        v_sender_id;
    end if;



    -- -------------------------------------------------------------------------
    -- FIRST TOUCHPOINT
    -- -------------------------------------------------------------------------

    if v_created_lead then

      insert into public.touchpoints (
        organization_id,
        lead_id,
        occurred_at,
        source,
        medium,
        campaign_name,
        channel,
        event_type,
        utm_source,
        utm_medium,
        utm_campaign
      )
      values (
        v_event.organization_id,
        v_lead_id,
        v_message_at,
        'instagram',
        'messaging',
        null,
        'instagram'::public.contact_channel,
        'lead_created',
        'instagram',
        'messaging',
        null
      );

    end if;



    -- -------------------------------------------------------------------------
    -- STABLE INSTAGRAM USER IDENTITY
    -- -------------------------------------------------------------------------

    insert into public.lead_contacts (
      organization_id,
      lead_id,
      contact_type,
      value,
      normalized_value,
      is_primary,
      verified,
      metadata
    )
    values (
      v_event.organization_id,
      v_lead_id,
      'instagram_user_id'::public.contact_type,
      v_sender_id,
      v_sender_id,
      false,
      true,

      jsonb_build_object(
        'source',
        'instagram_messaging_api',

        'instagram_user_id',
        v_sender_id,

        'instagram_account_id',
        v_instagram_account_id,

        'username',
        v_sender_username
      )
    )

    on conflict (
      organization_id,
      contact_type,
      normalized_value
    )

    do update set
      value =
        excluded.value,

      verified =
        true,

      metadata =
        coalesce(
          public.lead_contacts.metadata,
          '{}'::jsonb
        )
        || excluded.metadata

    returning lead_id
    into v_lead_id;



    -- -------------------------------------------------------------------------
    -- OPTIONAL USERNAME IDENTITY
    --
    -- Do not transfer an existing username identity from another lead.
    -- Instagram usernames can change/recycle; the numeric scoped ID remains
    -- authoritative.
    -- -------------------------------------------------------------------------

    if v_sender_username is not null then

      insert into public.lead_contacts (
        organization_id,
        lead_id,
        contact_type,
        value,
        normalized_value,
        is_primary,
        verified,
        metadata
      )
      values (
        v_event.organization_id,
        v_lead_id,
        'instagram_username'::public.contact_type,
        v_sender_username,
        lower(v_sender_username),
        false,
        true,

        jsonb_build_object(
          'source',
          'instagram_messaging_api',

          'instagram_user_id',
          v_sender_id,

          'instagram_account_id',
          v_instagram_account_id
        )
      )

      on conflict (
        organization_id,
        contact_type,
        normalized_value
      )

      do update set
        value =
          excluded.value,

        verified =
          true,

        metadata =
          coalesce(
            public.lead_contacts.metadata,
            '{}'::jsonb
          )
          || excluded.metadata

      where public.lead_contacts.lead_id =
        excluded.lead_id;

    end if;



    -- -------------------------------------------------------------------------
    -- CANONICAL PERSON IDENTITY
    -- -------------------------------------------------------------------------

    perform public.resolve_person_for_lead(
      v_lead_id,
      'instagram_webhook'
    );



    -- -------------------------------------------------------------------------
    -- CONVERSATION
    --
    -- Include the receiving professional account ID in the external
    -- conversation key. This prevents the same Instagram customer messaging
    -- two different connected professional accounts from colliding.
    -- -------------------------------------------------------------------------

    v_external_conversation_id :=
      v_instagram_account_id
      || ':'
      || v_sender_id;


    select c.id
    into v_conversation_id

    from public.conversations c

    where c.organization_id =
      v_event.organization_id

      and c.channel =
        'instagram'::public.contact_channel

      and c.external_conversation_id =
        v_external_conversation_id

      and c.external_account_id =
        v_instagram_account_id

    order by c.started_at asc

    limit 1;


    if v_conversation_id is null then

      insert into public.conversations (
        organization_id,
        lead_id,
        channel,
        external_conversation_id,
        external_account_id,
        status,
        started_at,
        last_message_at,
        metadata
      )
      values (
        v_event.organization_id,
        v_lead_id,
        'instagram'::public.contact_channel,
        v_external_conversation_id,
        v_instagram_account_id,
        'open',
        v_message_at,
        v_message_at,

        jsonb_build_object(
          'instagram_user_id',
          v_sender_id,

          'instagram_username',
          v_sender_username,

          'instagram_account_id',
          v_instagram_account_id
        )
      )

      returning id
      into v_conversation_id;

    end if;



    -- -------------------------------------------------------------------------
    -- TENANT-SCOPED MESSAGE IDEMPOTENCY CLAIM
    -- -------------------------------------------------------------------------

    insert into public.instagram_crm_message_links (
      organization_id,
      external_message_id,
      raw_event_id,
      lead_id,
      conversation_id
    )
    values (
      v_event.organization_id,
      v_external_message_id,
      p_raw_event_id,
      v_lead_id,
      v_conversation_id
    )

    on conflict
    do nothing

    returning external_message_id
    into v_claimed_message_id;


    if v_claimed_message_id is null then

      perform public.set_raw_event_processing_status(
        v_event.organization_id,
        'instagram',
        v_event.source_event_id,
        'processed',
        'instagram_dm_ingestion',
        '049',
        null,
        jsonb_build_object(
          'raw_event_id',
          p_raw_event_id,
          'duplicate_message',
          true,
          'external_message_id',
          v_external_message_id
        )
      );


      return jsonb_build_object(
        'ok',
        true,

        'duplicate_message',
        true,

        'raw_event_id',
        p_raw_event_id,

        'external_message_id',
        v_external_message_id,

        'lead_id',
        v_lead_id,

        'conversation_id',
        v_conversation_id
      );

    end if;



    -- -------------------------------------------------------------------------
    -- CANONICAL CRM MESSAGE WRITER
    -- -------------------------------------------------------------------------

    select *
    into v_crm_message

    from public.log_lead_interaction(
      p_lead_id =>
        v_lead_id,

      p_channel =>
        'instagram'::public.contact_channel,

      p_direction =>
        'inbound'::public.message_direction,

      p_body =>
        v_body,

      p_conversation_id =>
        v_conversation_id
    );



    -- Preserve provider-specific message identity and original provider time.
    update public.messages
    set
      external_message_id =
        v_external_message_id,

      message_type =
        v_message_type,

      received_at =
        v_message_at,

      metadata =
        coalesce(
          metadata,
          '{}'::jsonb
        )
        ||
        jsonb_build_object(
          'provider',
          'instagram',

          'instagram_user_id',
          v_sender_id,

          'instagram_username',
          v_sender_username,

          'instagram_account_id',
          v_instagram_account_id,

          'raw_event_id',
          p_raw_event_id
        )

    where id =
      v_crm_message.id

      and lead_id =
        v_lead_id

    returning *
    into v_crm_message;



    -- Preserve original provider message time on the conversation.
    update public.conversations
    set
      last_message_at =
        greatest(
          coalesce(
            last_message_at,
            v_message_at
          ),
          v_message_at
        ),

      metadata =
        coalesce(
          metadata,
          '{}'::jsonb
        )
        ||
        jsonb_build_object(
          'instagram_user_id',
          v_sender_id,

          'instagram_username',
          v_sender_username,

          'instagram_account_id',
          v_instagram_account_id
        )

    where id =
      v_conversation_id

      and organization_id =
        v_event.organization_id;



    perform public.set_raw_event_processing_status(
      v_event.organization_id,
      'instagram',
      v_event.source_event_id,
      'processed',
      'instagram_dm_ingestion',
      '049',
      null,
      jsonb_build_object(
        'raw_event_id',
        p_raw_event_id,
        'external_message_id',
        v_external_message_id,
        'lead_id',
        v_lead_id,
        'conversation_id',
        v_conversation_id,
        'crm_message_id',
        v_crm_message.id
      )
    );


    return jsonb_build_object(
      'ok',
      true,

      'processed',
      true,

      'raw_event_id',
      p_raw_event_id,

      'organization_id',
      v_event.organization_id,

      'external_message_id',
      v_external_message_id,

      'instagram_account_id',
      v_instagram_account_id,

      'instagram_user_id',
      v_sender_id,

      'instagram_username',
      v_sender_username,

      'lead_id',
      v_lead_id,

      'conversation_id',
      v_conversation_id,

      'crm_message_id',
      v_crm_message.id,

      'message_type',
      v_message_type,

      'created_lead',
      v_created_lead
    );


  exception
    when others then

      perform public.set_raw_event_processing_status(
        v_event.organization_id,
        'instagram',
        v_event.source_event_id,
        'failed',
        'instagram_dm_ingestion',
        '049',
        sqlerrm,
        jsonb_build_object(
          'raw_event_id',
          p_raw_event_id
        )
      );


      return jsonb_build_object(
        'ok',
        false,

        'raw_event_id',
        p_raw_event_id,

        'organization_id',
        v_event.organization_id,

        'error',
        sqlerrm
      );

  end;

end;
$function$;


revoke all
on function public.ingest_instagram_dm_event(
  uuid,
  text,
  text,
  text,
  timestamptz
)
from public, anon, authenticated;


grant execute
on function public.ingest_instagram_dm_event(
  uuid,
  text,
  text,
  text,
  timestamptz
)
to service_role;


commit;