import crypto from 'crypto';

import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  createAdminClient,
} from '@/lib/supabase/admin';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


type JsonObject =
  Record<string, unknown>;


type InstagramInboundEvent = {
  accountId: string;
  senderId: string;
  recipientId: string;
  messageId: string;
  messageType: string;
  body: string | null;
  occurredAt: string | null;
  raw: JsonObject;
};


function requireEnv(
  name: string,
) {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is not configured.`,
    );
  }

  return value;
}


export async function GET(
  request: NextRequest,
) {
  const mode =
    request.nextUrl.searchParams.get(
      'hub.mode',
    );

  const token =
    request.nextUrl.searchParams.get(
      'hub.verify_token',
    );

  const challenge =
    request.nextUrl.searchParams.get(
      'hub.challenge',
    );

  const verifyToken =
    process.env
      .INSTAGRAM_VERIFY_TOKEN
      ?.trim();


  if (
    mode === 'subscribe' &&
    verifyToken &&
    token === verifyToken &&
    challenge
  ) {
    return new NextResponse(
      challenge,
      {
        status:
          200,

        headers: {
          'Content-Type':
            'text/plain; charset=utf-8',
        },
      },
    );
  }


  return NextResponse.json(
    {
      ok:
        false,

      error:
        'Webhook verification failed',
    },
    {
      status:
        403,
    },
  );
}


export async function POST(
  request: NextRequest,
) {
  try {
    /*
     * Meta signs the exact raw request bytes.
     *
     * Validate the signature before parsing JSON.
     */
    const rawBytes =
      Buffer.from(
        await request.arrayBuffer(),
      );

    const rawBody =
      rawBytes.toString(
        'utf8',
      );


    const signatureHeader =
      request.headers.get(
        'x-hub-signature-256',
      );

    const appSecret =
      requireEnv(
        'INSTAGRAM_APP_SECRET',
      );


    if (!signatureHeader) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'Missing webhook signature',
        },
        {
          status:
            401,
        },
      );
    }


    if (
      !verifyMetaSignature(
        rawBytes,
        signatureHeader,
        appSecret,
      )
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'Invalid webhook signature',
        },
        {
          status:
            401,
        },
      );
    }


    let payload:
      | JsonObject
      | null =
      null;


    try {
      payload =
        JSON.parse(
          rawBody,
        ) as JsonObject;
    } catch {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'Invalid JSON payload',
        },
        {
          status:
            400,
        },
      );
    }


    /*
     * Only Instagram product webhook
     * envelopes belong on this route.
     *
     * Acknowledge other signed objects
     * without processing them.
     */
    if (
      stringValue(
        payload.object,
      ) !== 'instagram'
    ) {
      return NextResponse.json(
        {
          ok:
            true,

          ignored:
            true,

          reason:
            'unsupported_object',
        },
        {
          status:
            200,
        },
      );
    }


    const events =
      extractInstagramInboundEvents(
        payload,
      );


    if (
      events.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok:
            true,

          received:
            true,

          processed:
            0,

          ignored:
            true,

          reason:
            'no_supported_inbound_messages',
        },
        {
          status:
            200,
        },
      );
    }


    const supabase =
      createAdminClient();


    let processed =
      0;

    let alreadyProcessed =
      0;

    let duplicateMessages =
      0;

    let unknownAccounts =
      0;

    let rawEventsCreated =
      0;


    for (
      const event
      of events
    ) {
      /*
       * Resolve the receiving Instagram
       * professional account directly to
       * its connected workspace.
       *
       * Migration 048 guarantees that
       * one connected Instagram account
       * cannot belong to multiple tenants.
       */
      const {
        data:
          connection,
        error:
          connectionError,
      } =
        await supabase
          .from(
            'integration_connections',
          )
          .select(
            'organization_id',
          )
          .eq(
            'provider',
            'instagram',
          )
          .eq(
            'status',
            'connected',
          )
          .eq(
            'external_account_id',
            event.accountId,
          )
          .maybeSingle();


      if (connectionError) {
        throw connectionError;
      }


      const organizationId =
        stringValue(
          connection
            ?.organization_id,
        );


      /*
       * Signed events can still arrive
       * briefly after an account has been
       * disconnected.
       *
       * Do not attach such events to any
       * tenant and do not retry forever.
       */
      if (!organizationId) {
        unknownAccounts +=
          1;

        console.warn(
          'Ignoring Instagram webhook for unmapped account.',
          {
            instagramAccountId:
              event.accountId,
          },
        );

        continue;
      }


      /*
       * The provider message ID is stable
       * and gives us a deterministic raw
       * event idempotency key.
       */
      const sourceEventId =
        `message:${event.messageId}`;


      const {
        data:
          rawIngestData,
        error:
          rawIngestError,
      } =
        await supabase.rpc(
          'ingest_raw_event',
          {
            p_organization_id:
              organizationId,

            p_source_system:
              'instagram',

            p_source_event_id:
              sourceEventId,

            p_source_event_type:
              `message:${event.messageType}`,

            p_ingestion_method:
              'instagram_webhook',

            p_occurred_at:
              event.occurredAt,

            p_source_account_id:
              event.accountId,

            p_source_subject_id:
              event.senderId,

            p_anonymous_visitor_id:
              null,

            p_session_key:
              null,

            p_external_message_id:
              event.messageId,

            p_site:
              null,

            p_payload:
              event.raw,

            p_context: {
              object_type:
                'instagram',

              recipient_id:
                event.recipientId,

              signature_valid:
                true,
            },

            p_metadata: {
              adapter:
                'app/api/instagram/webhook',
            },

            p_schema_version:
              1,
          },
        );


      if (rawIngestError) {
        throw rawIngestError;
      }


      const rawResult =
        objectValue(
          rawIngestData,
        );

      const rawEventId =
        stringValue(
          rawResult.event_id,
        );


      if (!rawEventId) {
        throw new Error(
          `Instagram raw event could not be resolved for message ${event.messageId}.`,
        );
      }


      if (
        rawResult.created ===
        true
      ) {
        rawEventsCreated +=
          1;
      }


      /*
       * Username is intentionally null
       * at this stage.
       *
       * The webhook gives us the stable
       * Instagram-scoped sender ID, which
       * is enough for identity resolution.
       * Profile enrichment can be added
       * separately without blocking DM
       * ingestion.
       */
      const {
        data:
          crmData,
        error:
          crmError,
      } =
        await supabase.rpc(
          'ingest_instagram_dm_event',
          {
            p_raw_event_id:
              rawEventId,

            p_sender_username:
              null,

            p_message_type:
              event.messageType,

            p_body:
              event.body,

            p_message_at:
              event.occurredAt,
          },
        );


      if (crmError) {
        throw crmError;
      }


      const crmResult =
        objectValue(
          crmData,
        );


      if (
        crmResult.ok !==
        true
      ) {
        throw new Error(
          stringValue(
            crmResult.error,
          ) ||
            `Instagram CRM ingestion failed for message ${event.messageId}.`,
        );
      }


      if (
        crmResult
          .already_processed ===
        true
      ) {
        alreadyProcessed +=
          1;

        continue;
      }


      if (
        crmResult
          .duplicate_message ===
        true
      ) {
        duplicateMessages +=
          1;

        continue;
      }


      if (
        crmResult.processed ===
        true
      ) {
        processed +=
          1;
      }
    }


    return NextResponse.json(
      {
        ok:
          true,

        received:
          events.length,

        raw_events_created:
          rawEventsCreated,

        processed,

        already_processed:
          alreadyProcessed,

        duplicate_messages:
          duplicateMessages,

        unknown_accounts:
          unknownAccounts,
      },
      {
        status:
          200,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Instagram webhook failed';


    console.error(
      'Instagram webhook error:',
      message,
    );


    /*
     * Return 500 for genuine processing
     * failures so Meta can retry.
     *
     * raw_events + CRM idempotency make
     * those retries safe.
     */
    return NextResponse.json(
      {
        ok:
          false,

        error:
          'Instagram webhook failed',
      },
      {
        status:
          500,
      },
    );
  }
}


function extractInstagramInboundEvents(
  payload: JsonObject,
) {
  const result:
    InstagramInboundEvent[] =
    [];


  for (
    const rawEntry
    of arrayValue(
      payload.entry,
    )
  ) {
    const entry =
      objectValue(
        rawEntry,
      );

    const accountId =
      stringValue(
        entry.id,
      );


    if (!accountId) {
      continue;
    }


    for (
      const rawMessagingEvent
      of arrayValue(
        entry.messaging,
      )
    ) {
      const messagingEvent =
        objectValue(
          rawMessagingEvent,
        );

      const sender =
        objectValue(
          messagingEvent.sender,
        );

      const recipient =
        objectValue(
          messagingEvent.recipient,
        );

      const message =
        objectValue(
          messagingEvent.message,
        );


      /*
       * This first adapter handles
       * actual message events only.
       *
       * Reactions, seen events,
       * referrals, postbacks and edits
       * can be introduced independently.
       */
      const messageId =
        stringValue(
          message.mid,
        );


      if (!messageId) {
        continue;
      }


      /*
       * Do not turn our own outbound
       * message echo into an inbound lead
       * interaction.
       */
      if (
        message.is_echo ===
        true
      ) {
        continue;
      }


      if (
        message.is_deleted ===
        true
      ) {
        continue;
      }


      const senderId =
        stringValue(
          sender.id,
        );

      const recipientId =
        stringValue(
          recipient.id,
        );


      if (
        !senderId ||
        !recipientId
      ) {
        continue;
      }


      /*
       * For inbound Instagram DMs the
       * connected professional account
       * is the recipient and entry.id.
       */
      if (
        recipientId !==
        accountId
      ) {
        continue;
      }


      if (
        senderId ===
        accountId
      ) {
        continue;
      }


      const text =
        stringValue(
          message.text,
        );


      const messageType =
        instagramMessageType(
          message,
          text,
        );


      result.push({
        accountId,

        senderId,

        recipientId,

        messageId,

        messageType,

        body:
          text ||
          null,

        occurredAt:
          instagramTimestamp(
            messagingEvent.timestamp,
          ),

        raw:
          messagingEvent,
      });
    }
  }


  return result;
}


function instagramMessageType(
  message: JsonObject,
  text: string,
) {
  if (text) {
    return 'text';
  }


  const attachments =
    arrayValue(
      message.attachments,
    );


  if (
    attachments.length >
    0
  ) {
    const firstAttachment =
      objectValue(
        attachments[0],
      );

    const attachmentType =
      stringValue(
        firstAttachment.type,
      );


    if (attachmentType) {
      return attachmentType;
    }
  }


  return 'unknown';
}


function instagramTimestamp(
  value: unknown,
) {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;


  if (
    !Number.isFinite(
      numericValue,
    ) ||
    numericValue <= 0
  ) {
    return null;
  }


  /*
   * Current Instagram messaging
   * timestamps are milliseconds.
   * Accept Unix seconds too so the
   * adapter remains defensive.
   */
  const milliseconds =
    numericValue <
    100_000_000_000
      ? numericValue *
        1000
      : numericValue;


  const timestamp =
    new Date(
      milliseconds,
    );


  if (
    Number.isNaN(
      timestamp.getTime(),
    )
  ) {
    return null;
  }


  return timestamp.toISOString();
}


function verifyMetaSignature(
  rawBody: Buffer,
  signatureHeader: string,
  appSecret: string,
) {
  const signature =
    signatureHeader.trim();


  if (
    !signature.startsWith(
      'sha256=',
    )
  ) {
    return false;
  }


  const receivedHex =
    signature.slice(
      'sha256='.length,
    );


  if (
    !/^[a-f0-9]{64}$/i.test(
      receivedHex,
    )
  ) {
    return false;
  }


  const expected =
    crypto
      .createHmac(
        'sha256',
        Buffer.from(
          appSecret,
          'utf8',
        ),
      )
      .update(
        rawBody,
      )
      .digest();


  const received =
    Buffer.from(
      receivedHex,
      'hex',
    );


  if (
    received.length !==
    expected.length
  ) {
    return false;
  }


  return crypto.timingSafeEqual(
    received,
    expected,
  );
}


function objectValue(
  value: unknown,
): JsonObject {
  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(
      value,
    )
  ) {
    return {};
  }


  return value as JsonObject;
}


function arrayValue(
  value: unknown,
) {
  return Array.isArray(
    value,
  )
    ? value
    : [];
}


function stringValue(
  value: unknown,
) {
  if (
    typeof value ===
    'string'
  ) {
    return value.trim();
  }


  if (
    typeof value ===
      'number' &&
    Number.isFinite(
      value,
    )
  ) {
    return String(
      value,
    );
  }


  return '';
}
