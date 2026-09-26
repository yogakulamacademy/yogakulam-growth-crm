import {
  NextRequest,
  NextResponse,
} from 'next/server';


export const dynamic =
  'force-dynamic';


function cleanAccountId(
  value: string
) {
  return value
    .replace(
      /^act_/i,
      ''
    )
    .trim();
}


async function metaGet(
  url: URL,
  accessToken: string
) {
  url.searchParams.set(
    'access_token',
    accessToken
  );

  const response =
    await fetch(
      url,
      {
        cache:
          'no-store',
      }
    );

  const text =
    await response.text();

  let json:
    any = null;

  try {
    json =
      text
        ? JSON.parse(
            text
          )
        : null;
  } catch {
    json = {
      raw:
        text,
    };
  }

  return {
    ok:
      response.ok,

    status:
      response.status,

    json,
  };
}


export async function GET(
  request: NextRequest
) {
  const rawAccountId =
    process.env
      .META_AD_ACCOUNT_ID
      ?.trim();

  const accessToken =
    process.env
      .META_ACCESS_TOKEN
      ?.trim();

  const apiVersion =
    process.env
      .META_API_VERSION
      ?.trim() ||
    'v26.0';


  if (
    !rawAccountId ||
    !accessToken
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        error:
          'Meta environment variables are not configured.',

        env: {
          adAccountConfigured:
            Boolean(
              rawAccountId
            ),

          tokenConfigured:
            Boolean(
              accessToken
            ),

          tokenLength:
            accessToken
              ?.length ??
            0,

          apiVersion,
        },
      },
      {
        status:
          500,
      }
    );
  }


  const accountId =
    cleanAccountId(
      rawAccountId
    );

  const adAccountResource =
    `act_${accountId}`;

  const since =
    request.nextUrl
      .searchParams
      .get(
        'since'
      ) ||
    '2026-01-01';

  const until =
    request.nextUrl
      .searchParams
      .get(
        'until'
      ) ||
    '2026-09-25';


  const accountUrl =
    new URL(
      `https://graph.facebook.com/${apiVersion}/${adAccountResource}`
    );

  accountUrl
    .searchParams
    .set(
      'fields',
      [
        'id',
        'account_id',
        'name',
        'account_status',
        'currency',
        'timezone_name',
        'timezone_offset_hours_utc',
        'amount_spent',
        'business',
      ].join(
        ','
      )
    );


  const campaignsUrl =
    new URL(
      `https://graph.facebook.com/${apiVersion}/${adAccountResource}/campaigns`
    );

  campaignsUrl
    .searchParams
    .set(
      'fields',
      [
        'id',
        'name',
        'status',
        'effective_status',
        'objective',
        'created_time',
        'updated_time',
        'start_time',
        'stop_time',
      ].join(
        ','
      )
    );

  campaignsUrl
    .searchParams
    .set(
      'limit',
      '100'
    );


  const insightsUrl =
    new URL(
      `https://graph.facebook.com/${apiVersion}/${adAccountResource}/insights`
    );

  insightsUrl
    .searchParams
    .set(
      'fields',
      [
        'campaign_id',
        'campaign_name',
        'date_start',
        'date_stop',
        'spend',
        'impressions',
        'reach',
        'clicks',
        'inline_link_clicks',
      ].join(
        ','
      )
    );

  insightsUrl
    .searchParams
    .set(
      'level',
      'campaign'
    );

  insightsUrl
    .searchParams
    .set(
      'time_increment',
      '1'
    );

  insightsUrl
    .searchParams
    .set(
      'time_range',
      JSON.stringify({
        since,
        until,
      })
    );

  insightsUrl
    .searchParams
    .set(
      'limit',
      '100'
    );


  const [
    accountResult,
    campaignsResult,
    insightsResult,
  ] =
    await Promise.all([
      metaGet(
        accountUrl,
        accessToken
      ),

      metaGet(
        campaignsUrl,
        accessToken
      ),

      metaGet(
        insightsUrl,
        accessToken
      ),
    ]);


  const accountError =
    accountResult
      .json
      ?.error ??
    null;

  const campaignsError =
    campaignsResult
      .json
      ?.error ??
    null;

  const insightsError =
    insightsResult
      .json
      ?.error ??
    null;


  return NextResponse.json({
    ok:
      accountResult.ok &&
      campaignsResult.ok &&
      insightsResult.ok,

    env: {
      adAccountId:
        adAccountResource,

      apiVersion,

      tokenConfigured:
        true,

      tokenLength:
        accessToken.length,
    },

    requestedRange: {
      since,
      until,
    },

    account: accountResult.ok
      ? accountResult.json
      : null,

    accountError,

    campaigns: {
      httpStatus:
        campaignsResult.status,

      count:
        Array.isArray(
          campaignsResult
            .json
            ?.data
        )
          ? campaignsResult
              .json
              .data
              .length
          : 0,

      sample:
        Array.isArray(
          campaignsResult
            .json
            ?.data
        )
          ? campaignsResult
              .json
              .data
              .slice(
                0,
                10
              )
          : [],

      pagingAvailable:
        Boolean(
          campaignsResult
            .json
            ?.paging
            ?.next
        ),

      error:
        campaignsError,
    },

    insights: {
      httpStatus:
        insightsResult.status,

      count:
        Array.isArray(
          insightsResult
            .json
            ?.data
        )
          ? insightsResult
              .json
              .data
              .length
          : 0,

      sample:
        Array.isArray(
          insightsResult
            .json
            ?.data
        )
          ? insightsResult
              .json
              .data
              .slice(
                0,
                10
              )
          : [],

      pagingAvailable:
        Boolean(
          insightsResult
            .json
            ?.paging
            ?.next
        ),

      error:
        insightsError,
    },
  });
}
