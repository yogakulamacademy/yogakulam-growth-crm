import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';


const DEFAULT_META_API_VERSION =
  'v26.0';

const UPSERT_CHUNK_SIZE =
  500;


type MetaInsightRow = {
  account_currency?: string;

  date_start?: string;
  date_stop?: string;

  campaign_id?: string;
  campaign_name?: string;
  objective?: string;

  adset_id?: string;
  adset_name?: string;

  ad_id?: string;
  ad_name?: string;

  publisher_platform?: string;
  platform_position?: string;

  country?: string;
  impression_device?: string;

  spend?: string | number;
  impressions?: string | number;
  reach?: string | number;
  clicks?: string | number;
  inline_link_clicks?: string | number;
  ctr?: string | number;
  cpc?: string | number;
  cpm?: string | number;
  frequency?: string | number;

  actions?: unknown[];
  action_values?: unknown[];
};


type MetaInsightsResponse = {
  data?: MetaInsightRow[];

  paging?: {
    next?: string;
  };

  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};


export type MetaAdsSyncCounts = {
  campaignRows: number;
  adsetRows: number;
  adRows: number;
  publisherRows: number;
  countryRows: number;
  deviceRows: number;
  totalRows: number;
};


type SyncMetaAdsOptions = {
  startDate: string;
  endDate: string;
  syncRunId?: string;
};


function requireEnv(
  name: string
) {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is not configured.`
    );
  }

  return value;
}


function normalizeAdAccountId(
  value: string
) {
  return value
    .replace(
      /^act_/i,
      ''
    )
    .trim();
}


export function getMetaAdAccountId() {
  return normalizeAdAccountId(
    requireEnv(
      'META_AD_ACCOUNT_ID'
    )
  );
}


export function getMetaApiVersion() {
  const value =
    process.env
      .META_API_VERSION
      ?.trim() ||
    DEFAULT_META_API_VERSION;

  if (
    !/^v\d+\.\d+$/.test(
      value
    )
  ) {
    throw new Error(
      'META_API_VERSION must look like v26.0.'
    );
  }

  return value;
}


function getMetaAccessToken() {
  return requireEnv(
    'META_ACCESS_TOKEN'
  );
}


export function createMetaAdsAdminClient():
SupabaseClient {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL
      ?.trim() ||
    process.env
      .SUPABASE_URL
      ?.trim();

  const key =
    process.env
      .SUPABASE_SECRET_KEY
      ?.trim() ||
    process.env
      .SUPABASE_SERVICE_ROLE_KEY
      ?.trim();

  if (
    !url ||
    !key
  ) {
    throw new Error(
      'Supabase admin environment variables are not configured.'
    );
  }

  return createClient(
    url,
    key,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,
      },
    }
  );
}


function numberValue(
  value:
    | string
    | number
    | null
    | undefined
) {
  const parsed =
    Number(
      value ??
      0
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}


function intValue(
  value:
    | string
    | number
    | null
    | undefined
) {
  const parsed =
    Number(
      value ??
      0
    );

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return 0;
  }

  return Math.trunc(
    parsed
  );
}


function safeActions(
  value:
    | unknown[]
    | undefined
) {
  return Array.isArray(
    value
  )
    ? value
    : [];
}


async function fetchMetaInsights({
  level,
  startDate,
  endDate,
  fields,
  breakdowns,
}: {
  level:
    | 'campaign'
    | 'adset'
    | 'ad'
    | 'account';

  startDate: string;
  endDate: string;

  fields: string[];

  breakdowns?: string[];
}) {
  const accountId =
    getMetaAdAccountId();

  const apiVersion =
    getMetaApiVersion();

  const accessToken =
    getMetaAccessToken();


  const params =
    new URLSearchParams();

  params.set(
    'level',
    level
  );

  params.set(
    'fields',
    fields.join(
      ','
    )
  );

  params.set(
    'time_increment',
    '1'
  );

  params.set(
    'limit',
    '500'
  );

  params.set(
    'time_range',
    JSON.stringify({
      since:
        startDate,

      until:
        endDate,
    })
  );

  if (
    breakdowns &&
    breakdowns.length >
      0
  ) {
    params.set(
      'breakdowns',
      breakdowns.join(
        ','
      )
    );
  }


  let url =
    `https://graph.facebook.com/${apiVersion}` +
    `/act_${accountId}/insights?${params.toString()}`;


  const rows:
    MetaInsightRow[] =
      [];


  while (url) {
    const response =
      await fetch(
        url,
        {
          method:
            'GET',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },

          cache:
            'no-store',
        }
      );


    const payload =
      await response
        .json() as
          MetaInsightsResponse;


    if (
      !response.ok ||
      payload.error
    ) {
      const error =
        payload.error;

      const parts = [
        error?.message,
        error?.type
          ? `type=${error.type}`
          : null,
        error?.code != null
          ? `code=${error.code}`
          : null,
        error?.error_subcode != null
          ? `subcode=${error.error_subcode}`
          : null,
        error?.fbtrace_id
          ? `fbtrace_id=${error.fbtrace_id}`
          : null,
      ]
        .filter(
          Boolean
        )
        .join(
          ' | '
        );


      throw new Error(
        parts ||
        `Meta Marketing API request failed with HTTP ${response.status}.`
      );
    }


    if (
      Array.isArray(
        payload.data
      )
    ) {
      rows.push(
        ...payload.data
      );
    }


    url =
      payload.paging
        ?.next ||
      '';
  }


  return rows;
}


async function clearRange(
  supabase: SupabaseClient,
  table: string,
  adAccountId: string,
  startDate: string,
  endDate: string
) {
  const {
    error,
  } =
    await supabase
      .from(
        table
      )
      .delete()
      .eq(
        'ad_account_id',
        adAccountId
      )
      .gte(
        'date',
        startDate
      )
      .lte(
        'date',
        endDate
      );


  if (error) {
    throw new Error(
      `Unable to clear ${table}: ${error.message}`
    );
  }
}


async function upsertInChunks(
  supabase: SupabaseClient,
  table: string,
  rows:
    Record<
      string,
      unknown
    >[],
  onConflict: string
) {
  if (
    rows.length ===
    0
  ) {
    return;
  }


  for (
    let index = 0;
    index <
    rows.length;
    index +=
    UPSERT_CHUNK_SIZE
  ) {
    const chunk =
      rows.slice(
        index,
        index +
        UPSERT_CHUNK_SIZE
      );


    const {
      error,
    } =
      await supabase
        .from(
          table
        )
        .upsert(
          chunk,
          {
            onConflict,
          }
        );


    if (error) {
      throw new Error(
        `Unable to upsert ${table}: ${error.message}`
      );
    }
  }
}


function commonMetrics(
  row: MetaInsightRow
) {
  return {
    currency_code:
      row.account_currency ??
      null,

    spend:
      numberValue(
        row.spend
      ),

    impressions:
      intValue(
        row.impressions
      ),

    reach:
      intValue(
        row.reach
      ),

    clicks:
      intValue(
        row.clicks
      ),

    inline_link_clicks:
      intValue(
        row.inline_link_clicks
      ),

    ctr:
      numberValue(
        row.ctr
      ),

    cpc:
      numberValue(
        row.cpc
      ),

    cpm:
      numberValue(
        row.cpm
      ),

    actions:
      safeActions(
        row.actions
      ),

    action_values:
      safeActions(
        row.action_values
      ),
  };
}


export async function syncMetaAdsToSupabase({
  startDate,
  endDate,
  syncRunId,
}: SyncMetaAdsOptions):
Promise<MetaAdsSyncCounts> {
  const adAccountId =
    getMetaAdAccountId();


  const commonFields = [
    'account_currency',
    'date_start',
    'date_stop',
    'spend',
    'impressions',
    'reach',
    'clicks',
    'inline_link_clicks',
    'ctr',
    'cpc',
    'cpm',
    'actions',
    'action_values',
  ];


  /*
   * Fetch everything before replacing cached rows.
   * If Meta fails, the previous cache remains intact.
   *
   * Breakdowns are requested separately because Meta restricts
   * which breakdown combinations can be used together.
   */
  const [
    campaignResponse,
    adsetResponse,
    adResponse,
    publisherResponse,
    countryResponse,
    deviceResponse,
  ] =
    await Promise.all([
      fetchMetaInsights({
        level:
          'campaign',

        startDate,
        endDate,

        fields: [
          ...commonFields,
          'campaign_id',
          'campaign_name',
          'objective',
          'frequency',
        ],
      }),

      fetchMetaInsights({
        level:
          'adset',

        startDate,
        endDate,

        fields: [
          ...commonFields,
          'campaign_id',
          'campaign_name',
          'adset_id',
          'adset_name',
          'frequency',
        ],
      }),

      fetchMetaInsights({
        level:
          'ad',

        startDate,
        endDate,

        fields: [
          ...commonFields,
          'campaign_id',
          'campaign_name',
          'adset_id',
          'adset_name',
          'ad_id',
          'ad_name',
          'frequency',
        ],
      }),

      fetchMetaInsights({
        level:
          'account',

        startDate,
        endDate,

        fields:
          commonFields,

        breakdowns: [
          'publisher_platform',
          'platform_position',
        ],
      }),

      fetchMetaInsights({
        level:
          'account',

        startDate,
        endDate,

        fields:
          commonFields,

        breakdowns: [
          'country',
        ],
      }),

      fetchMetaInsights({
        level:
          'account',

        startDate,
        endDate,

        fields:
          commonFields,

        breakdowns: [
          'impression_device',
        ],
      }),
    ]);


  const campaignRows =
    campaignResponse
      .map(
        (
          row
        ) => ({
          ad_account_id:
            adAccountId,

          date:
            row.date_start,

          campaign_id:
            row.campaign_id ??
            '',

          campaign_name:
            row.campaign_name ??
            null,

          objective:
            row.objective ??
            null,

          ...commonMetrics(
            row
          ),

          frequency:
            numberValue(
              row.frequency
            ),

          sync_run_id:
            syncRunId ??
            null,
        })
      )
      .filter(
        (
          row
        ) =>
          Boolean(
            row.date &&
            row.campaign_id
          )
      );


  const adsetRows =
    adsetResponse
      .map(
        (
          row
        ) => ({
          ad_account_id:
            adAccountId,

          date:
            row.date_start,

          campaign_id:
            row.campaign_id ??
            '',

          campaign_name:
            row.campaign_name ??
            null,

          adset_id:
            row.adset_id ??
            '',

          adset_name:
            row.adset_name ??
            null,

          ...commonMetrics(
            row
          ),

          frequency:
            numberValue(
              row.frequency
            ),

          sync_run_id:
            syncRunId ??
            null,
        })
      )
      .filter(
        (
          row
        ) =>
          Boolean(
            row.date &&
            row.campaign_id &&
            row.adset_id
          )
      );


  const adRows =
    adResponse
      .map(
        (
          row
        ) => ({
          ad_account_id:
            adAccountId,

          date:
            row.date_start,

          campaign_id:
            row.campaign_id ??
            '',

          campaign_name:
            row.campaign_name ??
            null,

          adset_id:
            row.adset_id ??
            '',

          adset_name:
            row.adset_name ??
            null,

          ad_id:
            row.ad_id ??
            '',

          ad_name:
            row.ad_name ??
            null,

          ...commonMetrics(
            row
          ),

          frequency:
            numberValue(
              row.frequency
            ),

          sync_run_id:
            syncRunId ??
            null,
        })
      )
      .filter(
        (
          row
        ) =>
          Boolean(
            row.date &&
            row.campaign_id &&
            row.adset_id &&
            row.ad_id
          )
      );


  const publisherRows =
    publisherResponse
      .map(
        (
          row
        ) => ({
          ad_account_id:
            adAccountId,

          date:
            row.date_start,

          publisher_platform:
            row.publisher_platform ??
            'unknown',

          platform_position:
            row.platform_position ??
            'unknown',

          ...commonMetrics(
            row
          ),

          sync_run_id:
            syncRunId ??
            null,
        })
      )
      .filter(
        (
          row
        ) =>
          Boolean(
            row.date
          )
      );


  const countryRows =
    countryResponse
      .map(
        (
          row
        ) => ({
          ad_account_id:
            adAccountId,

          date:
            row.date_start,

          country:
            row.country ??
            'unknown',

          ...commonMetrics(
            row
          ),

          sync_run_id:
            syncRunId ??
            null,
        })
      )
      .filter(
        (
          row
        ) =>
          Boolean(
            row.date
          )
      );


  const deviceRows =
    deviceResponse
      .map(
        (
          row
        ) => ({
          ad_account_id:
            adAccountId,

          date:
            row.date_start,

          impression_device:
            row.impression_device ??
            'unknown',

          ...commonMetrics(
            row
          ),

          sync_run_id:
            syncRunId ??
            null,
        })
      )
      .filter(
        (
          row
        ) =>
          Boolean(
            row.date
          )
      );


  const supabase =
    createMetaAdsAdminClient();


  const tables = [
    'meta_ads_campaign_daily',
    'meta_ads_adset_daily',
    'meta_ads_ad_daily',
    'meta_ads_publisher_daily',
    'meta_ads_country_daily',
    'meta_ads_device_daily',
  ];


  for (
    const table of
    tables
  ) {
    await clearRange(
      supabase,
      table,
      adAccountId,
      startDate,
      endDate
    );
  }


  await upsertInChunks(
    supabase,
    'meta_ads_campaign_daily',
    campaignRows,
    'ad_account_id,date,campaign_id'
  );


  await upsertInChunks(
    supabase,
    'meta_ads_adset_daily',
    adsetRows,
    'ad_account_id,date,campaign_id,adset_id'
  );


  await upsertInChunks(
    supabase,
    'meta_ads_ad_daily',
    adRows,
    'ad_account_id,date,campaign_id,adset_id,ad_id'
  );


  await upsertInChunks(
    supabase,
    'meta_ads_publisher_daily',
    publisherRows,
    'ad_account_id,date,publisher_platform,platform_position'
  );


  await upsertInChunks(
    supabase,
    'meta_ads_country_daily',
    countryRows,
    'ad_account_id,date,country'
  );


  await upsertInChunks(
    supabase,
    'meta_ads_device_daily',
    deviceRows,
    'ad_account_id,date,impression_device'
  );


  return {
    campaignRows:
      campaignRows.length,

    adsetRows:
      adsetRows.length,

    adRows:
      adRows.length,

    publisherRows:
      publisherRows.length,

    countryRows:
      countryRows.length,

    deviceRows:
      deviceRows.length,

    totalRows:
      campaignRows.length +
      adsetRows.length +
      adRows.length +
      publisherRows.length +
      countryRows.length +
      deviceRows.length,
  };
}
