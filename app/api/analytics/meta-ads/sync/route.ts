import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  createMetaAdsAdminClient,
  getMetaAdAccountId,
  getMetaApiVersion,
  syncMetaAdsToSupabase,
} from '@/lib/meta-ads';


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
      'A single Meta Ads sync can cover at most 93 days.'
    );
  }
}


function isAuthorized(
  request: NextRequest,
  allowCron = false
) {
  const manualSecret =
    process.env
      .META_ADS_SYNC_SECRET
      ?.trim();

  const cronSecret =
    process.env
      .CRON_SECRET
      ?.trim();

  const headerSecret =
    request.headers
      .get(
        'x-meta-ads-sync-secret'
      )
      ?.trim();

  const authorization =
    request.headers
      .get(
        'authorization'
      )
      ?.trim();


  if (
    manualSecret &&
    headerSecret ===
      manualSecret
  ) {
    return true;
  }


  if (
    manualSecret &&
    authorization ===
      `Bearer ${manualSecret}`
  ) {
    return true;
  }


  if (
    allowCron &&
    cronSecret &&
    authorization ===
      `Bearer ${cronSecret}`
  ) {
    return true;
  }


  return false;
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


  const adAccountId =
    getMetaAdAccountId();

  const apiVersion =
    getMetaApiVersion();

  const supabase =
    createMetaAdsAdminClient();


  const {
    data: run,
    error:
      runError,
  } =
    await supabase
      .from(
        'meta_ads_sync_runs'
      )
      .insert({
        ad_account_id:
          adAccountId,

        start_date:
          startDate,

        end_date:
          endDate,

        status:
          'running',

        triggered_by:
          triggeredBy,

        request_metadata: {
          api_version:
            apiVersion,
        },
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
      `Unable to create Meta Ads sync run: ${runError?.message ?? 'Unknown error'}`
    );
  }


  try {
    const counts =
      await syncMetaAdsToSupabase({
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
          'meta_ads_sync_runs'
        )
        .update({
          status:
            'success',

          campaign_rows:
            counts
              .campaignRows,

          adset_rows:
            counts
              .adsetRows,

          ad_rows:
            counts
              .adRows,

          publisher_rows:
            counts
              .publisherRows,

          country_rows:
            counts
              .countryRows,

          device_rows:
            counts
              .deviceRows,

          total_rows:
            counts
              .totalRows,

          request_metadata: {
            api_version:
              apiVersion,

            counts,
          },

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
        `Meta Ads data synced, but sync-run status could not be updated: ${updateError.message}`
      );
    }


    return {
      ok:
        true,

      adAccountId:
        `act_${adAccountId}`,

      apiVersion,

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
        : 'Unknown Meta Ads sync error';


    await supabase
      .from(
        'meta_ads_sync_runs'
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
  if (
    !isAuthorized(
      request,
      true
    )
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        error:
          'Unauthorized.',
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
        : 'Unknown Meta Ads sync error';


    console.error(
      'Meta Ads manual sync failed:',
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
  if (
    !isAuthorized(
      request,
      true
    )
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        error:
          'Unauthorized.',
      },
      {
        status:
          401,
      }
    );
  }


  try {
    /*
     * Refresh the previous seven completed days because Meta can
     * update attributed actions after the original ad interaction.
     */
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
        : 'Unknown Meta Ads cron error';


    console.error(
      'Meta Ads cron sync failed:',
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
