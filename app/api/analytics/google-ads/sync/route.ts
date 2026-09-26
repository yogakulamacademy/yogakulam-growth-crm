import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  createGoogleAdsAdminClient,
  getGoogleAdsCustomerId,
  syncGoogleAdsToSupabase,
} from '@/lib/google-ads';


export const dynamic =
  'force-dynamic';

export const maxDuration =
  300;


const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}$/;


function isoDate(
  value: Date
) {
  return value
    .toISOString()
    .slice(
      0,
      10
    );
}


function addUtcDays(
  dateValue: string,
  days: number
) {
  const date =
    new Date(
      `${dateValue}T00:00:00Z`
    );

  date.setUTCDate(
    date.getUTCDate() +
    days
  );

  return isoDate(
    date
  );
}


function validateRange(
  startDate: string,
  endDate: string
) {
  if (
    !ISO_DATE.test(
      startDate
    ) ||
    !ISO_DATE.test(
      endDate
    )
  ) {
    throw new Error(
      'Dates must use YYYY-MM-DD.'
    );
  }

  const start =
    new Date(
      `${startDate}T00:00:00Z`
    );

  const end =
    new Date(
      `${endDate}T00:00:00Z`
    );

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    )
  ) {
    throw new Error(
      'Invalid date range.'
    );
  }

  if (
    start >
    end
  ) {
    throw new Error(
      'startDate must be before or equal to endDate.'
    );
  }

  const days =
    Math.floor(
      (
        end.getTime() -
        start.getTime()
      ) /
      86400000
    ) +
    1;

  if (
    days >
    93
  ) {
    throw new Error(
      'A single Google Ads sync can cover at most 93 days.'
    );
  }
}


function authState(
  request: NextRequest,
  allowCron = false
) {
  const manualSecret =
    process.env
      .GOOGLE_ADS_SYNC_SECRET
      ?.trim();

  const cronSecret =
    process.env
      .CRON_SECRET
      ?.trim();

  const headerSecret =
    request.headers
      .get(
        'x-google-ads-sync-secret'
      )
      ?.trim();

  const authorization =
    request.headers
      .get(
        'authorization'
      )
      ?.trim();

  const manualHeaderMatch =
    Boolean(
      manualSecret &&
      headerSecret &&
      headerSecret ===
        manualSecret
    );

  const manualBearerMatch =
    Boolean(
      manualSecret &&
      authorization ===
        `Bearer ${manualSecret}`
    );

  const cronBearerMatch =
    Boolean(
      allowCron &&
      cronSecret &&
      authorization ===
        `Bearer ${cronSecret}`
    );

  return {
    authorized:
      manualHeaderMatch ||
      manualBearerMatch ||
      cronBearerMatch,

    diagnostics: {
      manualSecretConfigured:
        Boolean(
          manualSecret
        ),

      manualSecretLength:
        manualSecret
          ?.length ??
        0,

      receivedHeader:
        Boolean(
          headerSecret
        ),

      receivedHeaderLength:
        headerSecret
          ?.length ??
        0,

      authorizationHeaderReceived:
        Boolean(
          authorization
        ),

      manualHeaderMatch,

      manualBearerMatch,

      cronBearerMatch,
    },
  };
}


async function runSync({
  startDate,
  endDate,
  triggeredBy,
}: {
  startDate: string;
  endDate: string;
  triggeredBy: string;
}) {
  validateRange(
    startDate,
    endDate
  );

  const customerId =
    getGoogleAdsCustomerId();

  const supabase =
    createGoogleAdsAdminClient();


  const {
    data: run,
    error:
      runError,
  } =
    await supabase
      .from(
        'google_ads_sync_runs'
      )
      .insert({
        customer_id:
          customerId,

        start_date:
          startDate,

        end_date:
          endDate,

        status:
          'running',

        triggered_by:
          triggeredBy,
      })
      .select(
        'id'
      )
      .single();


  if (
    runError ||
    !run
  ) {
    throw new Error(
      `Unable to create Google Ads sync run: ${runError?.message ?? 'Unknown error'}`
    );
  }


  try {
    const counts =
      await syncGoogleAdsToSupabase({
        startDate,
        endDate,
        syncRunId:
          run.id,
      });


    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          'google_ads_sync_runs'
        )
        .update({
          status:
            'success',

          campaign_rows:
            counts
              .campaignRows,

          ad_group_rows:
            counts
              .adGroupRows,

          keyword_rows:
            counts
              .keywordRows,

          search_term_rows:
            counts
              .searchTermRows,

          geo_rows:
            counts
              .geoRows,

          device_rows:
            counts
              .deviceRows,

          total_rows:
            counts
              .totalRows,

          request_ids:
            counts
              .requestIds,

          completed_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'id',
          run.id
        );


    if (
      updateError
    ) {
      throw new Error(
        `Google Ads data synced, but sync-run status could not be updated: ${updateError.message}`
      );
    }


    return {
      ok:
        true,

      customerId,
      startDate,
      endDate,
      counts,
      trigger:
        triggeredBy,
    };

  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown Google Ads sync error';


    await supabase
      .from(
        'google_ads_sync_runs'
      )
      .update({
        status:
          'failed',

        error_message:
          message,

        completed_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        run.id
      );


    throw error;
  }
}


export async function POST(
  request: NextRequest
) {
  const auth =
    authState(
      request,
      true
    );


  if (
    !auth.authorized
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        error:
          'Unauthorized.',

        authDiagnostics:
          auth.diagnostics,
      },
      {
        status:
          401,
      }
    );
  }


  try {
    const body =
      await request
        .json()
        .catch(
          () => ({})
        ) as {
          startDate?: string;
          endDate?: string;
        };


    const yesterday =
      isoDate(
        new Date(
          Date.now() -
          86400000
        )
      );


    const endDate =
      body.endDate ??
      yesterday;


    const startDate =
      body.startDate ??
      addUtcDays(
        endDate,
        -6
      );


    const result =
      await runSync({
        startDate,
        endDate,
        triggeredBy:
          'manual',
      });


    return NextResponse.json(
      result
    );

  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown Google Ads sync error';


    console.error(
      'Google Ads manual sync failed:',
      error
    );


    return NextResponse.json(
      {
        ok:
          false,

        error:
          message,
      },
      {
        status:
          500,
      }
    );
  }
}


export async function GET(
  request: NextRequest
) {
  const auth =
    authState(
      request,
      true
    );


  if (
    !auth.authorized
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        error:
          'Unauthorized.',

        authDiagnostics:
          auth.diagnostics,
      },
      {
        status:
          401,
      }
    );
  }


  try {
    const endDate =
      isoDate(
        new Date(
          Date.now() -
          86400000
        )
      );


    const startDate =
      addUtcDays(
        endDate,
        -6
      );


    const result =
      await runSync({
        startDate,
        endDate,
        triggeredBy:
          'cron',
      });


    return NextResponse.json(
      result
    );

  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown Google Ads cron error';


    console.error(
      'Google Ads cron sync failed:',
      error
    );


    return NextResponse.json(
      {
        ok:
          false,

        error:
          message,
      },
      {
        status:
          500,
      }
    );
  }
}
