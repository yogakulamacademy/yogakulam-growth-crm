import type { ReactNode } from 'react';

import {
  Activity,
  BarChart3,
  CircleDollarSign,
  Eye,
  FileText,
  Globe2,
  MousePointerClick,
  RefreshCw,
  Route,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';

import { PageHeader } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';


type OverviewRow = {
  range_start: string | null;
  range_end: string | null;

  ga4_sessions: number | string | null;
  ga4_page_views: number | string | null;
  ga4_new_users: number | string | null;
  ga4_avg_daily_users: number | string | null;
  ga4_engaged_sessions: number | string | null;
  ga4_engagement_rate: number | string | null;
  ga4_avg_session_duration: number | string | null;
  ga4_key_events: number | string | null;

  crm_sessions: number | string | null;
  crm_visitors: number | string | null;
  crm_page_views: number | string | null;
  crm_form_submits: number | string | null;
  crm_web_leads: number | string | null;
  crm_qualified_leads: number | string | null;
  crm_enrolled_leads: number | string | null;

  website_lead_conversion_rate: number | string | null;
};


type Ga4SourceRow = {
  source: string;
  medium: string;
  sessions: number | string | null;
  new_users: number | string | null;
  user_days: number | string | null;
  engaged_sessions: number | string | null;
  key_events: number | string | null;
};


type CrmSourceRow = {
  source: string;
  medium: string;
  lead_count: number | string | null;
  qualified_count: number | string | null;
  enrolled_count: number | string | null;
};


type CrmSourceRevenueRow = {
  source: string;
  medium: string;
  currency: string;
  net_revenue: number | string | null;
};


type Ga4LandingRow = {
  landing_page: string;
  sessions: number | string | null;
  user_days: number | string | null;
  engaged_sessions: number | string | null;
  key_events: number | string | null;
};


type CrmLandingRow = {
  landing_page: string;
  lead_count: number | string | null;
  qualified_count: number | string | null;
  enrolled_count: number | string | null;
};


type Ga4CampaignRow = {
  campaign: string;
  source: string;
  medium: string;
  sessions: number | string | null;
  engaged_sessions: number | string | null;
  key_events: number | string | null;
};


type CrmCampaignRow = {
  campaign: string;
  lead_count: number | string | null;
  qualified_count: number | string | null;
  enrolled_count: number | string | null;
};


type Ga4CountryRow = {
  country: string;
  sessions: number | string | null;
  user_days: number | string | null;
  engaged_sessions: number | string | null;
  key_events: number | string | null;
};


type CrmCountryRow = {
  country: string;
  lead_count: number | string | null;
  qualified_count: number | string | null;
  enrolled_count: number | string | null;
};


type ReconciliationRow = {
  analytics_date: string;
  ga4_sessions: number | string | null;
  crm_sessions: number | string | null;
  ga4_page_views: number | string | null;
  crm_page_views: number | string | null;
  crm_visitors: number | string | null;
  crm_form_submits: number | string | null;
  crm_web_leads: number | string | null;
};


type SyncHealthRow = {
  latest_analytics_date: string | null;
  latest_data_update: string | null;
  last_successful_sync: string | null;
  daily_rows: number | string | null;
  source_rows: number | string | null;
  landing_page_rows: number | string | null;
  campaign_rows: number | string | null;
  country_rows: number | string | null;
};


type SyncRunRow = {
  id: string;
  status: string;
  from_date: string | null;
  to_date: string | null;
  total_rows: number | string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};


type SourcePerformance = {
  key: string;
  source: string;
  medium: string;
  sessions: number;
  engaged: number;
  leads: number;
  qualified: number;
  enrolled: number;
  inrRevenue: number;
  usdRevenue: number;
};


type LandingPerformance = {
  key: string;
  page: string;
  sessions: number;
  engaged: number;
  leads: number;
  qualified: number;
  enrolled: number;
};


type CompactPerformance = {
  name: string;
  sessions: number;
  leads: number;
  enrolled: number;
};


export default async function AnalyticsPage() {
  const supabase =
    await createClient();


  const [
    overviewResult,
    ga4SourceResult,
    crmSourceResult,
    crmSourceRevenueResult,
    ga4LandingResult,
    crmLandingResult,
    ga4CampaignResult,
    crmCampaignResult,
    ga4CountryResult,
    crmCountryResult,
    reconciliationResult,
    healthResult,
    syncRunsResult,
  ] =
    await Promise.all([
      supabase
        .from('v_analytics_30d_overview')
        .select('*')
        .maybeSingle(),

      supabase
        .from('v_ga4_source_30d')
        .select('*')
        .order('sessions', {
          ascending: false,
        })
        .limit(50),

      supabase
        .from('v_crm_source_30d')
        .select('*')
        .order('lead_count', {
          ascending: false,
        })
        .limit(100),

      supabase
        .from('v_crm_source_revenue_30d')
        .select('*'),

      supabase
        .from('v_ga4_landing_page_30d')
        .select('*')
        .order('sessions', {
          ascending: false,
        })
        .limit(50),

      supabase
        .from('v_crm_landing_page_30d')
        .select('*')
        .order('lead_count', {
          ascending: false,
        })
        .limit(250),

      supabase
        .from('v_ga4_campaign_30d')
        .select('*')
        .order('sessions', {
          ascending: false,
        })
        .limit(50),

      supabase
        .from('v_crm_campaign_30d')
        .select('*')
        .order('lead_count', {
          ascending: false,
        })
        .limit(100),

      supabase
        .from('v_ga4_country_30d')
        .select('*')
        .order('sessions', {
          ascending: false,
        })
        .limit(50),

      supabase
        .from('v_crm_country_30d')
        .select('*')
        .order('lead_count', {
          ascending: false,
        })
        .limit(100),

      supabase
        .from('v_analytics_reconciliation_daily_30d')
        .select('*')
        .order('analytics_date', {
          ascending: false,
        }),

      supabase
        .from('v_ga4_sync_health')
        .select('*')
        .maybeSingle(),

      supabase
        .from('ga4_sync_runs')
        .select(`
          id,
          status,
          from_date,
          to_date,
          total_rows,
          error_message,
          started_at,
          completed_at
        `)
        .order('started_at', {
          ascending: false,
        })
        .limit(6),
    ]);


  const errors =
    [
      overviewResult.error,
      ga4SourceResult.error,
      crmSourceResult.error,
      crmSourceRevenueResult.error,
      ga4LandingResult.error,
      crmLandingResult.error,
      ga4CampaignResult.error,
      crmCampaignResult.error,
      ga4CountryResult.error,
      crmCountryResult.error,
      reconciliationResult.error,
      healthResult.error,
      syncRunsResult.error,
    ].filter(Boolean);


  if (errors.length > 0) {
    throw new Error(
      `Unable to load Analytics dashboard: ${errors
        .map(
          (error) =>
            error?.message
        )
        .join(' | ')}`
    );
  }


  const overview =
    (
      overviewResult.data ??
      {}
    ) as Partial<OverviewRow>;


  const ga4Sources =
    (
      ga4SourceResult.data ??
      []
    ) as Ga4SourceRow[];


  const crmSources =
    (
      crmSourceResult.data ??
      []
    ) as CrmSourceRow[];


  const crmSourceRevenue =
    (
      crmSourceRevenueResult.data ??
      []
    ) as CrmSourceRevenueRow[];


  const ga4Landing =
    (
      ga4LandingResult.data ??
      []
    ) as Ga4LandingRow[];


  const crmLanding =
    (
      crmLandingResult.data ??
      []
    ) as CrmLandingRow[];


  const ga4Campaigns =
    (
      ga4CampaignResult.data ??
      []
    ) as Ga4CampaignRow[];


  const crmCampaigns =
    (
      crmCampaignResult.data ??
      []
    ) as CrmCampaignRow[];


  const ga4Countries =
    (
      ga4CountryResult.data ??
      []
    ) as Ga4CountryRow[];


  const crmCountries =
    (
      crmCountryResult.data ??
      []
    ) as CrmCountryRow[];


  const reconciliation =
    (
      reconciliationResult.data ??
      []
    ) as ReconciliationRow[];


  const health =
    (
      healthResult.data ??
      {}
    ) as Partial<SyncHealthRow>;


  const syncRuns =
    (
      syncRunsResult.data ??
      []
    ) as SyncRunRow[];


  const sourceRows =
    mergeSources(
      ga4Sources,
      crmSources,
      crmSourceRevenue
    );


  const landingRows =
    mergeLandingPages(
      ga4Landing,
      crmLanding
    );


  const campaignRows =
    mergeCampaigns(
      ga4Campaigns,
      crmCampaigns
    );


  const countryRows =
    mergeCountries(
      ga4Countries,
      crmCountries
    );


  const ga4Sessions =
    toNumber(
      overview.ga4_sessions
    );


  const crmSessions =
    toNumber(
      overview.crm_sessions
    );


  const crmVisitors =
    toNumber(
      overview.crm_visitors
    );


  const crmWebLeads =
    toNumber(
      overview.crm_web_leads
    );


  const sessionDifference =
    differencePercent(
      crmSessions,
      ga4Sessions
    );


  const dateRange =
    overview.range_start &&
    overview.range_end
      ? `${formatDate(
          overview.range_start
        )} – ${formatDate(
          overview.range_end
        )}`
      : 'Latest 30 synced GA4 days';


  return (
    <>
      <PageHeader
        title="Analytics"
        description="GA4 traffic, first-party CRM tracking, lead conversion and acquisition performance in one view."
      />


      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span
          className="
            rounded-full
            border
            border-slate-200
            bg-white
            px-3
            py-1.5
            font-semibold
          "
        >
          {dateRange}
        </span>

        <span>
          Latest synced GA4 date:{' '}
          <strong className="font-semibold text-slate-600">
            {health.latest_analytics_date
              ? formatDate(
                  health.latest_analytics_date
                )
              : '—'}
          </strong>
        </span>
      </div>


      {/* ===================================================
          GA4 OVERVIEW
      =================================================== */}

      <section className="card-pad mt-6">
        <div className="eyebrow">
          Website performance
        </div>

        <div className="section-title mt-1">
          GA4 overview
        </div>


        <div
          className="
            mt-5
            grid
            gap-3
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >
          <MetricCard
            icon={
              <Route size={17} />
            }
            label="GA4 sessions"
            value={
              formatNumber(
                overview.ga4_sessions
              )
            }
          />

          <MetricCard
            icon={
              <Eye size={17} />
            }
            label="Page views"
            value={
              formatNumber(
                overview.ga4_page_views
              )
            }
          />

          <MetricCard
            icon={
              <Users size={17} />
            }
            label="New users"
            value={
              formatNumber(
                overview.ga4_new_users
              )
            }
          />

          <MetricCard
            icon={
              <Users size={17} />
            }
            label="Avg daily users"
            value={
              formatNumber(
                overview.ga4_avg_daily_users,
                1
              )
            }
            sub="Average of GA4 daily users, not 30-day unique users"
          />

          <MetricCard
            icon={
              <Activity size={17} />
            }
            label="Engagement rate"
            value={
              formatFractionPercent(
                overview.ga4_engagement_rate
              )
            }
          />

          <MetricCard
            icon={
              <TrendingUp size={17} />
            }
            label="Engaged sessions"
            value={
              formatNumber(
                overview.ga4_engaged_sessions
              )
            }
          />

          <MetricCard
            icon={
              <Activity size={17} />
            }
            label="Avg session duration"
            value={
              formatDuration(
                overview.ga4_avg_session_duration
              )
            }
          />

          <MetricCard
            icon={
              <MousePointerClick size={17} />
            }
            label="GA4 key events"
            value={
              formatNumber(
                overview.ga4_key_events
              )
            }
          />
        </div>
      </section>


      {/* ===================================================
          CRM FUNNEL
      =================================================== */}

      <section className="card-pad mt-4">
        <div className="eyebrow">
          First-party tracking
        </div>

        <div className="section-title mt-1">
          CRM website funnel
        </div>


        <div
          className="
            mt-5
            grid
            gap-3
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >
          <MetricCard
            icon={
              <Route size={17} />
            }
            label="CRM sessions"
            value={
              formatNumber(
                overview.crm_sessions
              )
            }
          />

          <MetricCard
            icon={
              <Users size={17} />
            }
            label="CRM visitors"
            value={
              formatNumber(
                overview.crm_visitors
              )
            }
          />

          <MetricCard
            icon={
              <Eye size={17} />
            }
            label="Tracked page views"
            value={
              formatNumber(
                overview.crm_page_views
              )
            }
          />

          <MetricCard
            icon={
              <FileText size={17} />
            }
            label="Form submissions"
            value={
              formatNumber(
                overview.crm_form_submits
              )
            }
          />

          <MetricCard
            icon={
              <Target size={17} />
            }
            label="Website leads"
            value={
              formatNumber(
                overview.crm_web_leads
              )
            }
          />

          <MetricCard
            icon={
              <TrendingUp size={17} />
            }
            label="Qualified leads"
            value={
              formatNumber(
                overview.crm_qualified_leads
              )
            }
          />

          <MetricCard
            icon={
              <CircleDollarSign size={17} />
            }
            label="Enrolled leads"
            value={
              formatNumber(
                overview.crm_enrolled_leads
              )
            }
          />

          <MetricCard
            icon={
              <MousePointerClick size={17} />
            }
            label="Session → lead"
            value={
              formatHundredPercent(
                overview.website_lead_conversion_rate
              )
            }
          />
        </div>
      </section>


      {/* ===================================================
          RECONCILIATION
      =================================================== */}

      <section className="card-pad mt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow">
              Reconciliation
            </div>

            <div className="section-title mt-1">
              GA4 vs CRM tracking
            </div>
          </div>

          <BarChart3
            size={20}
            className="text-slate-400"
          />
        </div>


        <div
          className="
            mt-5
            grid
            gap-3
            md:grid-cols-3
          "
        >
          <ComparisonCard
            label="Sessions"
            leftLabel="GA4"
            leftValue={
              formatNumber(
                ga4Sessions
              )
            }
            rightLabel="CRM"
            rightValue={
              formatNumber(
                crmSessions
              )
            }
            detail={
              `${signedPercent(
                sessionDifference
              )} CRM vs GA4`
            }
          />

          <ComparisonCard
            label="Visitors"
            leftLabel="GA4 avg daily users"
            leftValue={
              formatNumber(
                overview.ga4_avg_daily_users,
                1
              )
            }
            rightLabel="CRM unique visitors"
            rightValue={
              formatNumber(
                crmVisitors
              )
            }
            detail="Different identity definitions; use as a directional comparison"
          />

          <ComparisonCard
            label="Conversions"
            leftLabel="GA4 key events"
            leftValue={
              formatNumber(
                overview.ga4_key_events
              )
            }
            rightLabel="CRM website leads"
            rightValue={
              formatNumber(
                crmWebLeads
              )
            }
            detail="GA4 key events may contain actions beyond CRM lead creation"
          />
        </div>


        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3">
                  Date
                </th>

                <th className="px-3 py-3 text-right">
                  GA4 sessions
                </th>

                <th className="px-3 py-3 text-right">
                  CRM sessions
                </th>

                <th className="px-3 py-3 text-right">
                  GA4 views
                </th>

                <th className="px-3 py-3 text-right">
                  CRM views
                </th>

                <th className="px-3 py-3 text-right">
                  CRM visitors
                </th>

                <th className="px-3 py-3 text-right">
                  Forms
                </th>

                <th className="px-3 py-3 text-right">
                  Leads
                </th>
              </tr>
            </thead>

            <tbody>
              {reconciliation
                .slice(0, 14)
                .map(
                  (row) => (
                    <tr
                      key={
                        row.analytics_date
                      }
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-3 py-3 font-semibold text-slate-700">
                        {formatDate(
                          row.analytics_date
                        )}
                      </td>

                      <td className="px-3 py-3 text-right text-slate-600">
                        {formatNumber(
                          row.ga4_sessions
                        )}
                      </td>

                      <td className="px-3 py-3 text-right text-slate-600">
                        {formatNumber(
                          row.crm_sessions
                        )}
                      </td>

                      <td className="px-3 py-3 text-right text-slate-600">
                        {formatNumber(
                          row.ga4_page_views
                        )}
                      </td>

                      <td className="px-3 py-3 text-right text-slate-600">
                        {formatNumber(
                          row.crm_page_views
                        )}
                      </td>

                      <td className="px-3 py-3 text-right text-slate-600">
                        {formatNumber(
                          row.crm_visitors
                        )}
                      </td>

                      <td className="px-3 py-3 text-right text-slate-600">
                        {formatNumber(
                          row.crm_form_submits
                        )}
                      </td>

                      <td className="px-3 py-3 text-right font-bold text-slate-800">
                        {formatNumber(
                          row.crm_web_leads
                        )}
                      </td>
                    </tr>
                  )
                )}
            </tbody>
          </table>
        </div>
      </section>


      {/* ===================================================
          SOURCE / MEDIUM
      =================================================== */}

      <section className="card-pad mt-4">
        <div>
          <div className="eyebrow">
            Acquisition
          </div>

          <div className="section-title mt-1">
            Source / medium performance
          </div>
        </div>


        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3">
                  Source / medium
                </th>

                <th className="px-3 py-3 text-right">
                  Sessions
                </th>

                <th className="px-3 py-3 text-right">
                  Engaged
                </th>

                <th className="px-3 py-3 text-right">
                  Leads
                </th>

                <th className="px-3 py-3 text-right">
                  Qualified
                </th>

                <th className="px-3 py-3 text-right">
                  Enrolled
                </th>

                <th className="px-3 py-3 text-right">
                  Lead rate
                </th>

                <th className="px-3 py-3 text-right">
                  INR revenue
                </th>

                <th className="px-3 py-3 text-right">
                  USD revenue
                </th>
              </tr>
            </thead>


            <tbody>
              {sourceRows.map(
                (row) => (
                  <tr
                    key={
                      row.key
                    }
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-800">
                        {row.source}
                      </div>

                      <div className="mt-0.5 text-xs text-slate-400">
                        {row.medium}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-right text-slate-600">
                      {formatNumber(
                        row.sessions
                      )}
                    </td>

                    <td className="px-3 py-3 text-right text-slate-600">
                      {formatNumber(
                        row.engaged
                      )}
                    </td>

                    <td className="px-3 py-3 text-right font-bold text-slate-800">
                      {formatNumber(
                        row.leads
                      )}
                    </td>

                    <td className="px-3 py-3 text-right text-slate-600">
                      {formatNumber(
                        row.qualified
                      )}
                    </td>

                    <td className="px-3 py-3 text-right text-slate-600">
                      {formatNumber(
                        row.enrolled
                      )}
                    </td>

                    <td className="px-3 py-3 text-right text-slate-600">
                      {formatHundredPercent(
                        row.sessions > 0
                          ? (
                              row.leads /
                              row.sessions
                            ) * 100
                          : 0
                      )}
                    </td>

                    <td className="px-3 py-3 text-right font-semibold text-slate-700">
                      {formatMoney(
                        row.inrRevenue,
                        'INR'
                      )}
                    </td>

                    <td className="px-3 py-3 text-right font-semibold text-slate-700">
                      {formatMoney(
                        row.usdRevenue,
                        'USD'
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>


      {/* ===================================================
          LANDING PAGES
      =================================================== */}

      <section className="card-pad mt-4">
        <div>
          <div className="eyebrow">
            Content
          </div>

          <div className="section-title mt-1">
            Landing page performance
          </div>
        </div>


        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3">
                  Landing page
                </th>

                <th className="px-3 py-3 text-right">
                  Sessions
                </th>

                <th className="px-3 py-3 text-right">
                  Engaged
                </th>

                <th className="px-3 py-3 text-right">
                  Leads
                </th>

                <th className="px-3 py-3 text-right">
                  Qualified
                </th>

                <th className="px-3 py-3 text-right">
                  Enrolled
                </th>

                <th className="px-3 py-3 text-right">
                  Lead rate
                </th>
              </tr>
            </thead>

            <tbody>
              {landingRows.map(
                (row) => (
                  <tr
                    key={
                      row.key
                    }
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="max-w-[560px] px-3 py-3">
                      <div className="truncate font-semibold text-slate-800">
                        {row.page}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-right text-slate-600">
                      {formatNumber(
                        row.sessions
                      )}
                    </td>

                    <td className="px-3 py-3 text-right text-slate-600">
                      {formatNumber(
                        row.engaged
                      )}
                    </td>

                    <td className="px-3 py-3 text-right font-bold text-slate-800">
                      {formatNumber(
                        row.leads
                      )}
                    </td>

                    <td className="px-3 py-3 text-right text-slate-600">
                      {formatNumber(
                        row.qualified
                      )}
                    </td>

                    <td className="px-3 py-3 text-right text-slate-600">
                      {formatNumber(
                        row.enrolled
                      )}
                    </td>

                    <td className="px-3 py-3 text-right text-slate-600">
                      {formatHundredPercent(
                        row.sessions > 0
                          ? (
                              row.leads /
                              row.sessions
                            ) * 100
                          : 0
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>


      {/* ===================================================
          CAMPAIGNS / COUNTRIES
      =================================================== */}

      <div
        className="
          mt-4
          grid
          gap-4
          xl:grid-cols-2
        "
      >
        <CompactTableCard
          eyebrow="Campaigns"
          title="Campaign performance"
          icon={
            <Target size={18} />
          }
          headers={[
            'Campaign',
            'Sessions',
            'Leads',
            'Enrolled',
          ]}
          rows={
            campaignRows.map(
              (row) => [
                row.name,
                formatNumber(
                  row.sessions
                ),
                formatNumber(
                  row.leads
                ),
                formatNumber(
                  row.enrolled
                ),
              ]
            )
          }
        />


        <CompactTableCard
          eyebrow="Geography"
          title="Country performance"
          icon={
            <Globe2 size={18} />
          }
          headers={[
            'Country',
            'Sessions',
            'Leads',
            'Enrolled',
          ]}
          rows={
            countryRows.map(
              (row) => [
                row.name,
                formatNumber(
                  row.sessions
                ),
                formatNumber(
                  row.leads
                ),
                formatNumber(
                  row.enrolled
                ),
              ]
            )
          }
        />
      </div>


      {/* ===================================================
          SYNC HEALTH
      =================================================== */}

      <section className="card-pad mt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow">
              Data health
            </div>

            <div className="section-title mt-1">
              GA4 sync status
            </div>
          </div>

          <RefreshCw
            size={19}
            className="text-slate-400"
          />
        </div>


        <div
          className="
            mt-5
            grid
            gap-3
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >
          <MetricCard
            icon={
              <Activity size={17} />
            }
            label="Latest GA4 date"
            value={
              health.latest_analytics_date
                ? formatDate(
                    health.latest_analytics_date
                  )
                : '—'
            }
          />

          <MetricCard
            icon={
              <RefreshCw size={17} />
            }
            label="Last successful sync"
            value={
              health.last_successful_sync
                ? formatDateTime(
                    health.last_successful_sync
                  )
                : '—'
            }
          />

          <MetricCard
            icon={
              <Route size={17} />
            }
            label="Daily rows"
            value={
              formatNumber(
                health.daily_rows
              )
            }
          />

          <MetricCard
            icon={
              <FileText size={17} />
            }
            label="Landing-page rows"
            value={
              formatNumber(
                health.landing_page_rows
              )
            }
          />
        </div>


        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3">
                  Status
                </th>

                <th className="px-3 py-3">
                  Range
                </th>

                <th className="px-3 py-3 text-right">
                  Rows
                </th>

                <th className="px-3 py-3">
                  Started
                </th>

                <th className="px-3 py-3">
                  Error
                </th>
              </tr>
            </thead>

            <tbody>
              {syncRuns.map(
                (run) => (
                  <tr
                    key={
                      run.id
                    }
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-3 py-3">
                      <StatusBadge
                        status={
                          run.status
                        }
                      />
                    </td>

                    <td className="px-3 py-3 text-slate-600">
                      {run.from_date
                        ? formatDate(
                            run.from_date
                          )
                        : '—'}
                      {' → '}
                      {run.to_date
                        ? formatDate(
                            run.to_date
                          )
                        : '—'}
                    </td>

                    <td className="px-3 py-3 text-right font-semibold text-slate-700">
                      {formatNumber(
                        run.total_rows
                      )}
                    </td>

                    <td className="px-3 py-3 text-slate-500">
                      {formatDateTime(
                        run.started_at
                      )}
                    </td>

                    <td className="max-w-[360px] px-3 py-3 text-xs text-slate-500">
                      {run.error_message ||
                        '—'}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>


      <div
        className="
          mt-4
          rounded-xl
          border
          border-slate-100
          bg-slate-50
          px-4
          py-3
          text-xs
          leading-5
          text-slate-500
        "
      >
        GA4 and CRM will not match exactly. Consent choices, blockers,
        GA4 identity rules, session definitions and first-party tracking
        coverage can create legitimate differences. Use reconciliation
        to identify meaningful gaps rather than expecting a 100% match.
      </div>
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
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
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

      {sub && (
        <div className="mt-1 text-[11px] leading-4 text-slate-400">
          {sub}
        </div>
      )}
    </div>
  );
}


function ComparisonCard({
  label,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  detail,
}: {
  label: string;
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
  detail: string;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-100
        bg-slate-50
        p-4
      "
    >
      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] text-slate-400">
            {leftLabel}
          </div>

          <div className="mt-1 text-lg font-bold text-slate-800">
            {leftValue}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400">
            {rightLabel}
          </div>

          <div className="mt-1 text-lg font-bold text-slate-800">
            {rightValue}
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px] leading-4 text-slate-400">
        {detail}
      </div>
    </div>
  );
}


function CompactTableCard({
  eyebrow,
  title,
  icon,
  headers,
  rows,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  headers: string[];
  rows: string[][];
}) {
  return (
    <section className="card-pad">
      <div className="flex items-start justify-between gap-4">
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


      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              {headers.map(
                (
                  header,
                  index
                ) => (
                  <th
                    key={
                      `${header}-${index}`
                    }
                    className={
                      index === 0
                        ? 'px-3 py-3'
                        : 'px-3 py-3 text-right'
                    }
                  >
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={
                    headers.length
                  }
                  className="px-3 py-8 text-center text-sm text-slate-400"
                >
                  No data yet.
                </td>
              </tr>
            )}

            {rows.map(
              (
                row,
                rowIndex
              ) => (
                <tr
                  key={
                    rowIndex
                  }
                  className="border-b border-slate-50 last:border-0"
                >
                  {row.map(
                    (
                      cell,
                      index
                    ) => (
                      <td
                        key={
                          `${rowIndex}-${index}`
                        }
                        className={
                          index === 0
                            ? 'px-3 py-3 font-semibold text-slate-700'
                            : 'px-3 py-3 text-right text-slate-600'
                        }
                      >
                        {cell}
                      </td>
                    )
                  )}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}


function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    String(
      status ||
      ''
    ).toLowerCase();

  const className =
    normalized === 'completed'
      ? 'bg-emerald-50 text-emerald-700'
      : normalized === 'failed'
        ? 'bg-rose-50 text-rose-700'
        : 'bg-amber-50 text-amber-700';

  return (
    <span
      className={`
        inline-flex
        rounded-full
        px-2.5
        py-1
        text-xs
        font-bold
        ${className}
      `}
    >
      {pretty(
        status
      )}
    </span>
  );
}


/* =========================================================
   MERGING
========================================================= */

function mergeSources(
  ga4Rows: Ga4SourceRow[],
  crmRows: CrmSourceRow[],
  revenueRows: CrmSourceRevenueRow[]
): SourcePerformance[] {
  const map =
    new Map<
      string,
      SourcePerformance
    >();


  for (const row of ga4Rows) {
    const source =
      cleanSource(
        row.source
      );

    const medium =
      cleanMedium(
        row.medium
      );

    const key =
      sourceMediumKey(
        source,
        medium
      );

    map.set(
      key,
      {
        key,
        source,
        medium,
        sessions:
          toNumber(
            row.sessions
          ),
        engaged:
          toNumber(
            row.engaged_sessions
          ),
        leads: 0,
        qualified: 0,
        enrolled: 0,
        inrRevenue: 0,
        usdRevenue: 0,
      }
    );
  }


  for (const row of crmRows) {
    const source =
      cleanSource(
        row.source
      );

    const medium =
      cleanMedium(
        row.medium
      );

    const key =
      sourceMediumKey(
        source,
        medium
      );

    const item =
      map.get(key) ?? {
        key,
        source,
        medium,
        sessions: 0,
        engaged: 0,
        leads: 0,
        qualified: 0,
        enrolled: 0,
        inrRevenue: 0,
        usdRevenue: 0,
      };

    item.leads +=
      toNumber(
        row.lead_count
      );

    item.qualified +=
      toNumber(
        row.qualified_count
      );

    item.enrolled +=
      toNumber(
        row.enrolled_count
      );

    map.set(
      key,
      item
    );
  }


  for (const row of revenueRows) {
    const source =
      cleanSource(
        row.source
      );

    const medium =
      cleanMedium(
        row.medium
      );

    const key =
      sourceMediumKey(
        source,
        medium
      );

    const item =
      map.get(key) ?? {
        key,
        source,
        medium,
        sessions: 0,
        engaged: 0,
        leads: 0,
        qualified: 0,
        enrolled: 0,
        inrRevenue: 0,
        usdRevenue: 0,
      };

    const currency =
      String(
        row.currency ||
        ''
      ).toUpperCase();

    if (currency === 'INR') {
      item.inrRevenue +=
        toNumber(
          row.net_revenue
        );
    }

    if (currency === 'USD') {
      item.usdRevenue +=
        toNumber(
          row.net_revenue
        );
    }

    map.set(
      key,
      item
    );
  }


  return [
    ...map.values(),
  ]
    .sort(
      (a, b) =>
        b.sessions -
        a.sessions ||
        b.leads -
        a.leads
    )
    .slice(0, 20);
}


function mergeLandingPages(
  ga4Rows: Ga4LandingRow[],
  crmRows: CrmLandingRow[]
): LandingPerformance[] {
  const map =
    new Map<
      string,
      LandingPerformance
    >();


  for (const row of ga4Rows) {
    const page =
      normalizeLandingPage(
        row.landing_page
      );

    map.set(
      page,
      {
        key: page,
        page,
        sessions:
          toNumber(
            row.sessions
          ),
        engaged:
          toNumber(
            row.engaged_sessions
          ),
        leads: 0,
        qualified: 0,
        enrolled: 0,
      }
    );
  }


  for (const row of crmRows) {
    const page =
      normalizeLandingPage(
        row.landing_page
      );

    const item =
      map.get(page) ?? {
        key: page,
        page,
        sessions: 0,
        engaged: 0,
        leads: 0,
        qualified: 0,
        enrolled: 0,
      };

    item.leads +=
      toNumber(
        row.lead_count
      );

    item.qualified +=
      toNumber(
        row.qualified_count
      );

    item.enrolled +=
      toNumber(
        row.enrolled_count
      );

    map.set(
      page,
      item
    );
  }


  return [
    ...map.values(),
  ]
    .sort(
      (a, b) =>
        b.sessions -
        a.sessions ||
        b.leads -
        a.leads
    )
    .slice(0, 20);
}


function mergeCampaigns(
  ga4Rows: Ga4CampaignRow[],
  crmRows: CrmCampaignRow[]
): CompactPerformance[] {
  const map =
    new Map<
      string,
      CompactPerformance
    >();


  for (const row of ga4Rows) {
    const name =
      cleanCampaign(
        row.campaign
      );

    const key =
      normalizeText(
        name
      );

    const item =
      map.get(key) ?? {
        name,
        sessions: 0,
        leads: 0,
        enrolled: 0,
      };

    item.sessions +=
      toNumber(
        row.sessions
      );

    map.set(
      key,
      item
    );
  }


  for (const row of crmRows) {
    const name =
      cleanCampaign(
        row.campaign
      );

    const key =
      normalizeText(
        name
      );

    const item =
      map.get(key) ?? {
        name,
        sessions: 0,
        leads: 0,
        enrolled: 0,
      };

    item.leads +=
      toNumber(
        row.lead_count
      );

    item.enrolled +=
      toNumber(
        row.enrolled_count
      );

    map.set(
      key,
      item
    );
  }


  return [
    ...map.values(),
  ]
    .filter(
      (row) =>
        ![
          '(not set)',
          '(direct)',
          'unattributed',
          'unknown',
        ].includes(
          normalizeText(
            row.name
          )
        )
    )
    .sort(
      (a, b) =>
        b.sessions -
        a.sessions ||
        b.leads -
        a.leads
    )
    .slice(0, 12);
}


function mergeCountries(
  ga4Rows: Ga4CountryRow[],
  crmRows: CrmCountryRow[]
): CompactPerformance[] {
  const map =
    new Map<
      string,
      CompactPerformance
    >();


  for (const row of ga4Rows) {
    const name =
      cleanLabel(
        row.country
      );

    const key =
      normalizeText(
        name
      );

    map.set(
      key,
      {
        name,
        sessions:
          toNumber(
            row.sessions
          ),
        leads: 0,
        enrolled: 0,
      }
    );
  }


  for (const row of crmRows) {
    const name =
      cleanLabel(
        row.country
      );

    const key =
      normalizeText(
        name
      );

    const item =
      map.get(key) ?? {
        name,
        sessions: 0,
        leads: 0,
        enrolled: 0,
      };

    item.leads +=
      toNumber(
        row.lead_count
      );

    item.enrolled +=
      toNumber(
        row.enrolled_count
      );

    map.set(
      key,
      item
    );
  }


  return [
    ...map.values(),
  ]
    .sort(
      (a, b) =>
        b.sessions -
        a.sessions ||
        b.leads -
        a.leads
    )
    .slice(0, 12);
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
    Number(
      value ??
      0
    );

  return Number.isFinite(number)
    ? number
    : 0;
}


function formatNumber(
  value:
    | number
    | string
    | null
    | undefined,
  maximumFractionDigits = 0
) {
  return new Intl.NumberFormat(
    'en-IN',
    {
      maximumFractionDigits,
    }
  ).format(
    toNumber(
      value
    )
  );
}


function formatFractionPercent(
  value:
    | number
    | string
    | null
    | undefined
) {
  return `${(
    toNumber(value) *
    100
  ).toFixed(1)}%`;
}


function formatHundredPercent(
  value:
    | number
    | string
    | null
    | undefined
) {
  return `${toNumber(
    value
  ).toFixed(1)}%`;
}


function differencePercent(
  actual: number,
  reference: number
) {
  if (reference === 0) {
    return 0;
  }

  return (
    (
      actual -
      reference
    ) /
    reference
  ) * 100;
}


function signedPercent(
  value: number
) {
  const number =
    Number.isFinite(value)
      ? value
      : 0;

  const sign =
    number > 0
      ? '+'
      : '';

  return `${sign}${number.toFixed(1)}%`;
}


function formatDuration(
  value:
    | number
    | string
    | null
    | undefined
) {
  const seconds =
    Math.max(
      0,
      Math.round(
        toNumber(value)
      )
    );

  const minutes =
    Math.floor(
      seconds /
      60
    );

  const remainder =
    seconds %
    60;

  if (minutes === 0) {
    return `${remainder}s`;
  }

  return `${minutes}m ${remainder}s`;
}


function formatMoney(
  value:
    | number
    | string
    | null
    | undefined,
  currency: string
) {
  const code =
    String(
      currency ||
      'INR'
    ).toUpperCase();

  return new Intl.NumberFormat(
    code === 'INR'
      ? 'en-IN'
      : 'en-US',
    {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }
  ).format(
    toNumber(value)
  );
}


function formatDate(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return '—';
  }

  const date =
    new Date(
      `${value.slice(
        0,
        10
      )}T00:00:00Z`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-IN',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }
  ).format(date);
}


function formatDateTime(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-IN',
    {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    }
  ).format(date);
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
    .replaceAll(
      '_',
      ' '
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}


function cleanSource(
  value:
    | string
    | null
    | undefined
) {
  const normalized =
    normalizeText(value);

  if (
    !normalized ||
    normalized === '(not set)'
  ) {
    return 'Unknown';
  }

  if (
    normalized === '(direct)' ||
    normalized === 'direct'
  ) {
    return 'Direct';
  }

  return String(value).trim();
}


function cleanMedium(
  value:
    | string
    | null
    | undefined
) {
  const normalized =
    normalizeText(value);

  if (
    !normalized ||
    normalized === '(not set)'
  ) {
    return 'Unknown';
  }

  if (
    normalized === '(none)' ||
    normalized === 'none'
  ) {
    return 'None';
  }

  return String(value).trim();
}


function cleanCampaign(
  value:
    | string
    | null
    | undefined
) {
  const normalized =
    normalizeText(value);

  if (!normalized) {
    return 'Unattributed';
  }

  return String(value).trim();
}


function cleanLabel(
  value:
    | string
    | null
    | undefined
) {
  const normalized =
    normalizeText(value);

  if (
    !normalized ||
    normalized === '(not set)'
  ) {
    return 'Unknown';
  }

  return String(value).trim();
}


function sourceMediumKey(
  source: string,
  medium: string
) {
  return `${normalizeText(
    source
  )}||${normalizeText(
    medium
  )}`;
}


function normalizeText(
  value:
    | string
    | null
    | undefined
) {
  return String(
    value ||
    ''
  )
    .trim()
    .toLowerCase();
}


function normalizeLandingPage(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return 'Unknown';
  }

  const raw =
    String(value).trim();

  if (!raw) {
    return 'Unknown';
  }

  try {
    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://')
    ) {
      const url =
        new URL(raw);

      return (
        url.pathname +
        url.search
      ) || '/';
    }
  } catch {
    return raw;
  }

  return raw;
}
