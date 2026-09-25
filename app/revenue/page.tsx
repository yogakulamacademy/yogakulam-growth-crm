import Link from 'next/link';
import {
  ArrowRight,
  Banknote,
  CircleDollarSign,
  MapPin,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui';


type ForecastRow = {
  id: string;
  lead_code: string;
  lead_name: string | null;
  current_stage: string;
  preferred_location: string | null;
  preferred_month: string | null;
  preferred_mode: string | null;
  first_touch_source: string | null;
  first_touch_medium: string | null;
  first_touch_campaign: string | null;
  lead_creation_channel: string | null;
  expected_close_date: string | null;
  created_at: string;

  potential_value: number | string | null;
  currency: string | null;
  probability: number | string | null;
  weighted_value: number | string | null;
  actual_revenue: number | string | null;
  forecast_month: string | null;
};


type StageRow = {
  currency: string;
  current_stage: string;
  lead_count: number | string;
  pipeline_value: number | string | null;
  weighted_forecast: number | string | null;
  actual_revenue: number | string | null;
};


type MonthlyRow = {
  forecast_month: string;
  currency: string;
  lead_count: number | string;
  pipeline_value: number | string | null;
  weighted_forecast: number | string | null;
  actual_revenue: number | string | null;
};


type SourceRow = {
  source: string;
  currency: string;
  lead_count: number | string;
  pipeline_value: number | string | null;
  weighted_forecast: number | string | null;
  actual_revenue: number | string | null;
};


type LocationRow = {
  location: string;
  currency: string;
  lead_count: number | string;
  pipeline_value: number | string | null;
  weighted_forecast: number | string | null;
  actual_revenue: number | string | null;
};


export default async function RevenuePage() {
  const supabase = await createClient();


  const [
    forecastResult,
    stageResult,
    monthlyResult,
    sourceResult,
    locationResult,
  ] = await Promise.all([
    supabase
      .from('v_revenue_forecast')
      .select('*')
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('v_revenue_forecast_by_stage')
      .select('*'),

    supabase
      .from('v_revenue_forecast_monthly')
      .select('*')
      .order('forecast_month', {
        ascending: true,
      }),

    supabase
      .from('v_revenue_forecast_by_source')
      .select('*'),

    supabase
      .from('v_revenue_forecast_by_location')
      .select('*'),
  ]);


  if (forecastResult.error) {
    throw new Error(
      `Unable to load revenue forecast: ${forecastResult.error.message}`
    );
  }

  if (stageResult.error) {
    throw new Error(
      `Unable to load stage forecast: ${stageResult.error.message}`
    );
  }

  if (monthlyResult.error) {
    throw new Error(
      `Unable to load monthly forecast: ${monthlyResult.error.message}`
    );
  }

  if (sourceResult.error) {
    throw new Error(
      `Unable to load source forecast: ${sourceResult.error.message}`
    );
  }

  if (locationResult.error) {
    throw new Error(
      `Unable to load location forecast: ${locationResult.error.message}`
    );
  }


  const forecasts =
    (forecastResult.data ?? []) as ForecastRow[];

  const stages =
    (stageResult.data ?? []) as StageRow[];

  const monthly =
    (monthlyResult.data ?? []) as MonthlyRow[];

  const sources =
    (sourceResult.data ?? []) as SourceRow[];

  const locations =
    (locationResult.data ?? []) as LocationRow[];


  /*
   * Keep INR and USD independent.
   *
   * We should never add:
   *
   * ₹60,000 + $1,500
   *
   * until we add an FX conversion layer later.
   */
  const currencies = Array.from(
    new Set(
      forecasts
        .map((row) => row.currency)
        .filter(Boolean)
        .map((value) =>
          String(value).toUpperCase()
        )
    )
  );


  if (!currencies.includes('INR')) {
    currencies.unshift('INR');
  }

  if (!currencies.includes('USD')) {
    currencies.push('USD');
  }


  /*
   * Open stages used for pipeline / opportunity metrics.
   */
  const closedStages = new Set([
    'enrolled',
    'lost',
    'unqualified',
    'duplicate',
  ]);


  const totalsByCurrency = currencies.map(
  (currency) => {

    const rows = forecasts.filter(
      (row) =>
        String(
          row.currency || ''
        ).toUpperCase() === currency
    );


    /*
     * Only financially valued leads count
     * as revenue opportunities.
     */
    const valuedRows = rows.filter(
      (row) =>
        toNumber(
          row.potential_value
        ) > 0
    );


    const openRows = valuedRows.filter(
      (row) =>
        !closedStages.has(
          String(
            row.current_stage
          )
        )
    );


    return {

      currency,

      pipeline: sum(
        openRows.map(
          (row) =>
            row.potential_value
        )
      ),

      weighted: sum(
        openRows.map(
          (row) =>
            row.weighted_value
        )
      ),

      actual: sum(
        valuedRows.map(
          (row) =>
            row.actual_revenue
        )
      ),

      opportunities:
        openRows.length,

    };

  }
);


const unvaluedLeads = forecasts.filter(
  (row) =>
    !closedStages.has(
      String(
        row.current_stage
      )
    ) &&
    toNumber(
      row.potential_value
    ) <= 0
).length;


/* CURRENCY SUMMARY */

{unvaluedLeads > 0 && (

  <div
    className="
      mt-6
      rounded-xl
      border
      border-amber-100
      bg-amber-50
      px-4
      py-3
    "
  >

    <div className="text-sm font-bold text-amber-800">
      {unvaluedLeads} unvalued lead
      {unvaluedLeads === 1 ? '' : 's'}
    </div>

    <div className="mt-1 text-xs text-amber-700">
      These leads do not yet have a batch or potential value assigned,
      so they are excluded from revenue forecasting.
    </div>

  </div>

)}





  const topOpportunities = [...forecasts]
    .filter(
      (row) =>
        !closedStages.has(
          String(row.current_stage)
        ) &&
        toNumber(row.potential_value) > 0
    )
    .sort(
      (a, b) =>
        toNumber(b.weighted_value) -
        toNumber(a.weighted_value)
    )
    .slice(0, 10);


  const currentMonth =
    new Date()
      .toISOString()
      .slice(0, 7);


  const closingThisMonth =
    forecasts
      .filter((row) => {
        if (!row.expected_close_date) {
          return false;
        }

        if (
          closedStages.has(
            String(row.current_stage)
          )
        ) {
          return false;
        }

        return (
          row.expected_close_date.slice(
            0,
            7
          ) === currentMonth
        );
      })
      .sort(
        (a, b) =>
          toNumber(b.weighted_value) -
          toNumber(a.weighted_value)
      );


  return (
    <>
      <PageHeader
        title="Revenue Forecast"
        description="Pipeline value, weighted forecast and revenue intelligence from Yogakulam CRM leads."
      />


      {/* ===================================================
          CURRENCY SUMMARY
      =================================================== */}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">

        {totalsByCurrency.map((group) => (

          <section
            key={group.currency}
            className="card-pad"
          >

            <div className="flex items-center justify-between">

              <div>

                <div className="eyebrow">
                  {group.currency} Forecast
                </div>

                <div className="section-title mt-1">
                  Revenue overview
                </div>

              </div>


              <div
                className="
                  rounded-xl
                  bg-slate-50
                  px-3
                  py-2
                  text-sm
                  font-bold
                  text-slate-600
                "
              >
                {group.currency}
              </div>

            </div>


            <div
              className="
                mt-5
                grid
                gap-3
                sm:grid-cols-2
              "
            >

              <MetricCard
                icon={
                  <CircleDollarSign size={17} />
                }
                label="Open pipeline"
                value={formatMoney(
                  group.pipeline,
                  group.currency
                )}
              />


              <MetricCard
                icon={
                  <TrendingUp size={17} />
                }
                label="Weighted forecast"
                value={formatMoney(
                  group.weighted,
                  group.currency
                )}
              />


              <MetricCard
                icon={
                  <Banknote size={17} />
                }
                label="Actual revenue"
                value={formatMoney(
                  group.actual,
                  group.currency
                )}
              />


              <MetricCard
                icon={
                  <Target size={17} />
                }
                label="Open opportunities"
                value={String(
                  group.opportunities
                )}
              />

            </div>

          </section>

        ))}

      </div>


      {/* ===================================================
          PIPELINE BY STAGE
      =================================================== */}

      <section className="card-pad mt-4">

        <div>

          <div className="eyebrow">
            Pipeline
          </div>

          <div className="section-title mt-1">
            Forecast by stage
          </div>

        </div>


        <div className="mt-5 overflow-x-auto">

          <table className="min-w-full text-left text-sm">

            <thead>

              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">

                <th className="px-3 py-3">
                  Stage
                </th>

                <th className="px-3 py-3">
                  Currency
                </th>

                <th className="px-3 py-3 text-right">
                  Leads
                </th>

                <th className="px-3 py-3 text-right">
                  Pipeline
                </th>

                <th className="px-3 py-3 text-right">
                  Weighted
                </th>

                <th className="px-3 py-3 text-right">
                  Revenue
                </th>

              </tr>

            </thead>


            <tbody>

              {stages
              .filter(
                (row) =>
                  toNumber(
                    row.pipeline_value
                  ) > 0 ||
                  toNumber(
                    row.weighted_forecast
                  ) > 0 ||
                  toNumber(
                    row.actual_revenue
                  ) > 0
              )
              .sort(
                  (a, b) =>
                    toNumber(
                      b.weighted_forecast
                    ) -
                    toNumber(
                      a.weighted_forecast
                    )
                )
                .map((row) => (

                  <tr
                    key={`${row.currency}-${row.current_stage}`}
                    className="border-b border-slate-50 last:border-0"
                  >

                    <td className="px-3 py-3 font-semibold capitalize text-slate-700">
                      {pretty(
                        row.current_stage
                      )}
                    </td>

                    <td className="px-3 py-3 text-slate-500">
                      {row.currency}
                    </td>

                    <td className="px-3 py-3 text-right text-slate-600">
                      {Number(
                        row.lead_count
                      )}
                    </td>

                    <td className="px-3 py-3 text-right font-semibold text-slate-700">
                      {formatMoney(
                        row.pipeline_value,
                        row.currency
                      )}
                    </td>

                    <td className="px-3 py-3 text-right font-bold text-slate-800">
                      {formatMoney(
                        row.weighted_forecast,
                        row.currency
                      )}
                    </td>

                    <td className="px-3 py-3 text-right font-semibold text-slate-700">
                      {formatMoney(
                        row.actual_revenue,
                        row.currency
                      )}
                    </td>

                  </tr>

                ))}

            </tbody>

          </table>

        </div>

      </section>


      {/* ===================================================
          MONTHLY FORECAST
      =================================================== */}

      <section className="card-pad mt-4">

        <div>

          <div className="eyebrow">
            Forecast
          </div>

          <div className="section-title mt-1">
            Monthly revenue forecast
          </div>

        </div>


        <div
          className="
            mt-5
            grid
            gap-3
            md:grid-cols-2
            xl:grid-cols-3
          "
        >

          {monthly
  .filter(
    (row) =>
      toNumber(
        row.pipeline_value
      ) > 0 ||
      toNumber(
        row.weighted_forecast
      ) > 0 ||
      toNumber(
        row.actual_revenue
      ) > 0
  )
  .map((row) => (

            <div
              key={`${row.currency}-${row.forecast_month}`}
              className="
                rounded-xl
                border
                border-slate-100
                bg-slate-50
                p-4
              "
            >

              <div className="flex items-start justify-between gap-4">

                <div>

                  <div className="text-sm font-bold text-slate-800">
                    {formatMonth(
                      row.forecast_month
                    )}
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    {Number(
                      row.lead_count
                    )}
                    {' '}
                    opportunities
                  </div>

                </div>


                <span
                  className="
                    rounded-lg
                    bg-white
                    px-2
                    py-1
                    text-xs
                    font-bold
                    text-slate-500
                  "
                >
                  {row.currency}
                </span>

              </div>


              <div className="mt-4 space-y-2">

                <MiniValue
                  label="Pipeline"
                  value={formatMoney(
                    row.pipeline_value,
                    row.currency
                  )}
                />

                <MiniValue
                  label="Weighted"
                  value={formatMoney(
                    row.weighted_forecast,
                    row.currency
                  )}
                />

                <MiniValue
                  label="Revenue"
                  value={formatMoney(
                    row.actual_revenue,
                    row.currency
                  )}
                />

              </div>

            </div>

          ))}

        </div>

      </section>


      {/* ===================================================
          SOURCE + LOCATION
      =================================================== */}

      <div
        className="
          mt-4
          grid
          gap-4
          xl:grid-cols-2
        "
      >

        <BreakdownCard
          title="Revenue by source"
          eyebrow="Attribution"
          icon={<TrendingUp size={16} />}
          rows={sources.map(
            (row) => ({
              name: pretty(
                row.source
              ),

              currency:
                row.currency,

              count:
                Number(
                  row.lead_count
                ),

              pipeline:
                toNumber(
                  row.pipeline_value
                ),

              weighted:
                toNumber(
                  row.weighted_forecast
                ),
            })
          )}
        />


        <BreakdownCard
          title="Revenue by location"
          eyebrow="Markets"
          icon={<MapPin size={16} />}
          rows={locations.map(
            (row) => ({
              name:
                row.location,

              currency:
                row.currency,

              count:
                Number(
                  row.lead_count
                ),

              pipeline:
                toNumber(
                  row.pipeline_value
                ),

              weighted:
                toNumber(
                  row.weighted_forecast
                ),
            })
          )}
        />

      </div>


      {/* ===================================================
          TOP OPPORTUNITIES
      =================================================== */}

      <section className="card-pad mt-4">

        <div className="flex items-center justify-between gap-4">

          <div>

            <div className="eyebrow">
              Opportunities
            </div>

            <div className="section-title mt-1">
              Highest-value open leads
            </div>

          </div>


          <Users
            size={20}
            className="text-slate-400"
          />

        </div>


        <div className="mt-5 overflow-x-auto">

          <table className="min-w-full text-left text-sm">

            <thead>

              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">

                <th className="px-3 py-3">
                  Lead
                </th>

                <th className="px-3 py-3">
                  Stage
                </th>

                <th className="px-3 py-3">
                  Location
                </th>

                <th className="px-3 py-3">
                  Source
                </th>

                <th className="px-3 py-3 text-right">
                  Potential
                </th>

                <th className="px-3 py-3 text-right">
                  Weighted
                </th>

                <th className="px-3 py-3">
                </th>

              </tr>

            </thead>


            <tbody>

              {topOpportunities.length === 0 && (

                <tr>

                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-sm text-slate-400"
                  >
                    No valued opportunities yet.
                  </td>

                </tr>

              )}


              {topOpportunities.map(
                (row) => (

                  <tr
                    key={row.id}
                    className="border-b border-slate-50 last:border-0"
                  >

                    <td className="px-3 py-3">

                      <div className="font-semibold text-slate-800">
                        {row.lead_name ||
                          row.lead_code}
                      </div>

                      <div className="mt-0.5 text-xs text-slate-400">
                        {row.lead_code}
                      </div>

                    </td>


                    <td className="px-3 py-3 capitalize text-slate-600">
                      {pretty(
                        row.current_stage
                      )}
                    </td>


                    <td className="px-3 py-3 text-slate-600">
                      {row.preferred_location ||
                        '—'}
                    </td>


                    <td className="px-3 py-3 text-slate-600">
                      {pretty(
                        row.first_touch_source ||
                          'Unknown'
                      )}
                    </td>


                    <td className="px-3 py-3 text-right font-semibold text-slate-700">
                      {formatMoney(
                        row.potential_value,
                        row.currency
                      )}
                    </td>


                    <td className="px-3 py-3 text-right font-bold text-slate-800">
                      {formatMoney(
                        row.weighted_value,
                        row.currency
                      )}
                    </td>


                    <td className="px-3 py-3 text-right">

                      <Link
                        href={`/leads/${row.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand"
                      >
                        View

                        <ArrowRight
                          size={13}
                        />
                      </Link>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* ===================================================
          CLOSING THIS MONTH
      =================================================== */}

      <section className="card-pad mt-4">

        <div>

          <div className="eyebrow">
            Closing
          </div>

          <div className="section-title mt-1">
            Expected to close this month
          </div>

        </div>


        <div className="mt-5 space-y-3">

          {closingThisMonth.length === 0 && (

            <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
              No open opportunities currently have an expected close date this month.
            </div>

          )}


          {closingThisMonth.map(
            (row) => (

              <Link
                key={row.id}
                href={`/leads/${row.id}`}
                className="
                  flex
                  items-center
                  justify-between
                  gap-4
                  rounded-xl
                  border
                  border-slate-100
                  px-4
                  py-3
                  transition
                  hover:bg-slate-50
                "
              >

                <div>

                  <div className="font-semibold text-slate-800">
                    {row.lead_name ||
                      row.lead_code}
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    {pretty(
                      row.current_stage
                    )}
                    {' · '}
                    {row.preferred_location ||
                      'Unknown location'}
                    {' · '}
                    {formatDate(
                      row.expected_close_date
                    )}
                  </div>

                </div>


                <div className="text-right">

                  <div className="font-bold text-slate-800">
                    {formatMoney(
                      row.weighted_value,
                      row.currency
                    )}
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    weighted
                  </div>

                </div>

              </Link>

            )
          )}

        </div>

      </section>

    </>
  );
}


/* =========================================================
   COMPONENTS
========================================================= */

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {

  return (
    <div className="rounded-xl bg-slate-50 p-4">

      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">

        {icon}

        {label}

      </div>


      <div className="mt-2 text-xl font-bold text-slate-800">
        {value}
      </div>

    </div>
  );
}


function MiniValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (
    <div className="flex items-center justify-between gap-4">

      <span className="text-xs text-slate-400">
        {label}
      </span>

      <span className="text-sm font-bold text-slate-700">
        {value}
      </span>

    </div>
  );
}


function BreakdownCard({
  title,
  eyebrow,
  icon,
  rows,
}: {
  title: string;
  eyebrow: string;
  icon: React.ReactNode;

  rows: Array<{
    name: string;
    currency: string;
    count: number;
    pipeline: number;
    weighted: number;
  }>;
}) {

  const sorted = [...rows]
    .sort(
      (a, b) =>
        b.weighted -
        a.weighted
    )
    .slice(0, 10);


  return (
    <section className="card-pad">

      <div className="flex items-center justify-between">

        <div>

          <div className="eyebrow">
            {eyebrow}
          </div>

          <div className="section-title mt-1">
            {title}
          </div>

        </div>

        <div className="text-slate-400">
          {icon}
        </div>

      </div>


      <div className="mt-5 space-y-3">

        {sorted.length === 0 && (

          <div className="text-sm text-slate-400">
            No forecast data yet.
          </div>

        )}


        {sorted.map(
          (row, index) => (

            <div
              key={`${row.name}-${row.currency}-${index}`}
              className="
                rounded-xl
                border
                border-slate-100
                p-3
              "
            >

              <div className="flex items-start justify-between gap-4">

                <div>

                  <div className="text-sm font-semibold text-slate-800">
                    {row.name}
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    {row.count}
                    {' '}
                    leads
                    {' · '}
                    {row.currency}
                  </div>

                </div>


                <div className="text-right">

                  <div className="text-sm font-bold text-slate-800">
                    {formatMoney(
                      row.weighted,
                      row.currency
                    )}
                  </div>

                  <div className="mt-1 text-[11px] text-slate-400">
                    weighted
                  </div>

                </div>

              </div>


              <div className="mt-3 flex items-center justify-between text-xs">

                <span className="text-slate-400">
                  Pipeline
                </span>

                <span className="font-semibold text-slate-600">
                  {formatMoney(
                    row.pipeline,
                    row.currency
                  )}
                </span>

              </div>

            </div>

          )
        )}

      </div>

    </section>
  );
}


/* =========================================================
   HELPERS
========================================================= */

function toNumber(
  value:
    | number
    | string
    | null
    | undefined
) {

  const number =
    Number(value ?? 0);

  return Number.isFinite(number)
    ? number
    : 0;
}


function sum(
  values: Array<
    number |
    string |
    null |
    undefined
  >
) {

  return values.reduce<number>(
    (total, value) =>
      total +
      toNumber(value),
    0
  );
}


function formatMoney(
  value:
    | number
    | string
    | null
    | undefined,

  currency:
    | string
    | null
    | undefined
) {

  const amount =
    toNumber(value);

  const code =
    String(
      currency ||
      'INR'
    ).toUpperCase();


  try {

    return new Intl.NumberFormat(
      code === 'INR'
        ? 'en-IN'
        : 'en-US',
      {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 0,
      }
    ).format(amount);

  } catch {

    return `${code} ${amount.toLocaleString()}`;

  }
}


function pretty(
  value:
    | string
    | null
    | undefined
) {

  if (!value) {
    return '—';
  }


  return String(value)
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}


function formatMonth(
  value:
    | string
    | null
    | undefined
) {

  if (!value) {
    return 'Unknown month';
  }


  const date =
    new Date(
      `${value.slice(0, 10)}T00:00:00Z`
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return new Intl.DateTimeFormat(
    'en',
    {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }
  ).format(date);
}


function formatDate(
  value:
    | string
    | null
    | undefined
) {

  if (!value) {
    return 'No date';
  }


  const date =
    new Date(
      `${value.slice(0, 10)}T00:00:00Z`
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return new Intl.DateTimeFormat(
    'en',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }
  ).format(date);
}