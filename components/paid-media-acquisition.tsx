import {
  BadgeCheck,
  CircleDollarSign,
  Link2,
  Megaphone,
  ReceiptIndianRupee,
  Target,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/server';

type AnyRow = Record<string, unknown>;

export async function PaidMediaAcquisition({
  leadId,
}: {
  leadId: string;
}) {
  const supabase = await createClient();

  const [
    attributionResult,
    revenueResult,
    unmatchedResult,
  ] = await Promise.all([
    supabase
      .from('v_google_ads_lead_campaign_attribution')
      .select('*')
      .eq('lead_id', leadId)
      .limit(10),

    supabase
      .from('v_google_ads_lead_revenue')
      .select('*')
      .eq('lead_id', leadId)
      .limit(10),

    supabase
      .from('v_google_ads_unmatched_paid_leads')
      .select('*')
      .eq('lead_id', leadId)
      .limit(10),
  ]);

  const attributionRows =
    (attributionResult.data ?? []) as AnyRow[];

  const revenueRows =
    (revenueResult.data ?? []) as AnyRow[];

  const unmatchedRows =
    (unmatchedResult.data ?? []) as AnyRow[];

  const exactAttribution =
    attributionRows.find((row) =>
      Boolean(
        pickString(row, [
          'campaign_id',
          'external_campaign_id',
          'captured_campaign_id',
        ])
      )
    ) ?? null;

  const revenueRow =
    revenueRows[0] ?? null;

  const unmatchedRow =
    unmatchedRows[0] ?? null;

  const primaryRow =
    exactAttribution ??
    revenueRow ??
    unmatchedRow ??
    attributionRows[0] ??
    null;

  const isGooglePaidLead =
    attributionRows.length > 0 ||
    revenueRows.length > 0 ||
    unmatchedRows.length > 0;

  const campaignId = pickString(primaryRow, [
    'campaign_id',
    'external_campaign_id',
    'captured_campaign_id',
  ]);

  let campaignRow: AnyRow | null = null;
  let campaignError: string | null = null;

  if (campaignId) {
    const campaignResult = await supabase
      .from('v_google_ads_campaign_crm_30d')
      .select('*')
      .eq('campaign_id', campaignId)
      .limit(1);

    campaignRow =
      ((campaignResult.data ?? [])[0] as AnyRow | undefined) ??
      null;

    campaignError =
      campaignResult.error?.message ?? null;
  }

  const campaignName =
    pickString(campaignRow, ['campaign_name']) ??
    pickString(primaryRow, ['campaign_name']) ??
    campaignId;

  const adsCurrency =
    pickString(campaignRow, [
      'currency_code',
      'currency',
    ]) ??
    pickString(primaryRow, [
      'currency_code',
      'currency',
    ]) ??
    'INR';

  const campaignSpend =
    pickNumber(campaignRow, ['spend']);

  const campaignLeadCount =
    pickNumber(campaignRow, [
      'crm_leads',
      'leads',
    ]);

  const reportedCpl =
    pickNumber(campaignRow, ['cpl']);

  const allocatedAcquisitionCost =
    reportedCpl ??
    (
      campaignSpend != null &&
      campaignLeadCount != null &&
      campaignLeadCount > 0
        ? campaignSpend / campaignLeadCount
        : null
    );

  const gclid = pickString(primaryRow, [
    'gclid',
    'google_click_id',
  ]);

  const adGroupName = pickString(primaryRow, [
    'ad_group_name',
    'adgroup_name',
  ]);

  const adGroupId = pickString(primaryRow, [
    'ad_group_id',
    'adgroup_id',
    'external_adset_id',
  ]);

  const adName = pickString(primaryRow, [
    'ad_name',
    'creative_name',
  ]);

  const adId = pickString(primaryRow, [
    'ad_id',
    'creative_id',
    'external_ad_id',
  ]);

  const keyword = pickString(primaryRow, [
    'keyword',
    'matched_keyword',
    'criterion_keyword',
  ]);

  const firstPaidVisit = pickString(primaryRow, [
    'first_paid_visit_at',
    'first_paid_touch_at',
    'first_ads_touch_at',
    'first_touch_at',
    'first_seen_at',
    'created_at',
  ]);

  const paymentStatus =
    pickString(revenueRow, [
      'payment_status',
      'status',
    ]) ?? '—';

  const currentStage =
    pickString(revenueRow, [
      'current_stage',
      'stage',
    ]) ?? '—';

  const revenueInr = pickNumber(revenueRow, [
    'crm_revenue_inr',
    'revenue_inr',
    'net_paid_inr',
  ]);

  const revenueUsd = pickNumber(revenueRow, [
    'crm_revenue_usd',
    'revenue_usd',
    'net_paid_usd',
  ]);

  const genericRevenue = pickNumber(revenueRow, [
    'net_paid',
    'actual_revenue',
    'crm_revenue',
    'revenue',
  ]);

  const genericRevenueCurrency =
    pickString(revenueRow, [
      'revenue_currency',
      'payment_currency',
      'currency',
    ]) ?? null;

  const sameCurrencyRevenue =
    adsCurrency.toUpperCase() === 'INR'
      ? revenueInr ??
        (
          genericRevenueCurrency?.toUpperCase() === 'INR'
            ? genericRevenue
            : null
        )
      : adsCurrency.toUpperCase() === 'USD'
        ? revenueUsd ??
          (
            genericRevenueCurrency?.toUpperCase() === 'USD'
              ? genericRevenue
              : null
          )
        : genericRevenueCurrency?.toUpperCase() ===
            adsCurrency.toUpperCase()
          ? genericRevenue
          : null;

  const revenueToAcquisition =
    sameCurrencyRevenue != null &&
    allocatedAcquisitionCost != null &&
    allocatedAcquisitionCost > 0
      ? sameCurrencyRevenue / allocatedAcquisitionCost
      : null;

  const hasViewDataError =
    Boolean(attributionResult.error) &&
    Boolean(revenueResult.error) &&
    Boolean(unmatchedResult.error);

  if (hasViewDataError) {
    return (
      <section className="card-pad">
        <div className="eyebrow">
          Paid media acquisition
        </div>

        <div className="section-title mt-1">
          Acquisition intelligence unavailable
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          The Google Ads attribution views could not be read for this lead.
          The rest of the lead profile is unaffected.
        </p>
      </section>
    );
  }

  return (
    <section className="card-pad">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow">
            Paid media acquisition
          </div>

          <div className="section-title mt-1">
            Lead acquisition intelligence
          </div>

          <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">
            This section separates paid-media acquisition from payment received.
            Google Ads attribution is deterministic when a campaign ID was captured.
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
            isGooglePaidLead
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          <BadgeCheck size={14} />
          {isGooglePaidLead
            ? 'Paid Media Lead · Google Ads'
            : 'No Google Ads attribution'}
        </div>
      </div>

      {isGooglePaidLead ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PaidMediaMetric
              icon={<Megaphone size={16} />}
              label="Platform"
              value="Google Ads"
            />

            <PaidMediaMetric
              icon={<Target size={16} />}
              label="Campaign"
              value={campaignName || '—'}
              sub={campaignId ? `ID ${campaignId}` : undefined}
            />

            <PaidMediaMetric
              icon={<CircleDollarSign size={16} />}
              label="Allocated acquisition cost"
              value={
                allocatedAcquisitionCost == null
                  ? '—'
                  : formatCurrency(
                      allocatedAcquisitionCost,
                      adsCurrency
                    )
              }
              sub="Campaign CPL allocation"
            />

            <PaidMediaMetric
              icon={<ReceiptIndianRupee size={16} />}
              label="CRM revenue"
              value={formatRevenue({
                revenueInr,
                revenueUsd,
                genericRevenue,
                genericRevenueCurrency,
              })}
              sub={
                revenueToAcquisition == null
                  ? 'Revenue / acquisition ratio unavailable'
                  : `${revenueToAcquisition.toFixed(2)}× revenue / acquisition cost`
              }
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PaidMediaDetail
              label="Ad group"
              value={adGroupName || adGroupId || '—'}
              sub={
                adGroupName && adGroupId
                  ? `ID ${adGroupId}`
                  : undefined
              }
            />

            <PaidMediaDetail
              label="Ad / creative"
              value={adName || adId || '—'}
              sub={
                adName && adId
                  ? `ID ${adId}`
                  : undefined
              }
            />

            <PaidMediaDetail
              label="Keyword"
              value={keyword || 'Not captured yet'}
            />

            <PaidMediaDetail
              label="First paid visit"
              value={formatDateTimeSafe(firstPaidVisit)}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PaidMediaDetail
              label="CRM stage"
              value={pretty(currentStage)}
            />

            <PaidMediaDetail
              label="Payment received"
              value={pretty(paymentStatus)}
            />

            <PaidMediaDetail
              label="GCLID"
              value={gclid || '—'}
            />

            <PaidMediaDetail
              label="Attribution status"
              value={
                campaignId && campaignRow
                  ? 'Campaign matched'
                  : gclid
                    ? 'GCLID only / unmatched'
                    : campaignId
                      ? 'Campaign ID captured'
                      : 'Paid signal captured'
              }
            />
          </div>

          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
            Allocated acquisition cost is not the exact amount Google billed for
            this individual person. It is the campaign CPL allocated to this lead
            from CRM-attributed campaign performance.
            {campaignError
              ? ' The campaign reporting row is currently unavailable, so some cost fields may be blank.'
              : ''}
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <Link2
              size={18}
              className="mt-0.5 shrink-0 text-slate-400"
            />

            <div>
              <div className="text-sm font-bold text-slate-700">
                No Google Ads acquisition record found
              </div>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                This does not yet prove the lead is organic. Facebook and
                Instagram Ads are not included until the Meta Ads integration is
                connected.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PaidMediaMetric({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        {icon}
        {label}
      </div>

      <div className="mt-2 break-words text-lg font-black text-slate-800">
        {value}
      </div>

      {sub && (
        <div className="mt-1 text-xs leading-5 text-slate-400">
          {sub}
        </div>
      )}
    </div>
  );
}

function PaidMediaDetail({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-semibold text-slate-400">
        {label}
      </div>

      <div className="mt-1 break-words text-sm font-bold text-slate-700">
        {value}
      </div>

      {sub && (
        <div className="mt-1 break-words text-[11px] text-slate-400">
          {sub}
        </div>
      )}
    </div>
  );
}

function pickString(
  row: AnyRow | null,
  keys: string[]
) {
  if (!row) return null;

  for (const key of keys) {
    const value = row[key];

    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ''
    ) {
      return String(value);
    }
  }

  return null;
}

function pickNumber(
  row: AnyRow | null,
  keys: string[]
) {
  if (!row) return null;

  for (const key of keys) {
    const raw = row[key];

    if (
      raw === null ||
      raw === undefined ||
      raw === ''
    ) {
      continue;
    }

    const value = Number(raw);

    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function formatCurrency(
  value: number,
  currency: string
) {
  const code = currency.toUpperCase();

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
    ).format(value);
  } catch {
    return `${code} ${value.toFixed(0)}`;
  }
}

function formatRevenue({
  revenueInr,
  revenueUsd,
  genericRevenue,
  genericRevenueCurrency,
}: {
  revenueInr: number | null;
  revenueUsd: number | null;
  genericRevenue: number | null;
  genericRevenueCurrency: string | null;
}) {
  const parts: string[] = [];

  if (revenueInr != null) {
    parts.push(
      formatCurrency(
        revenueInr,
        'INR'
      )
    );
  }

  if (revenueUsd != null) {
    parts.push(
      formatCurrency(
        revenueUsd,
        'USD'
      )
    );
  }

  if (
    parts.length === 0 &&
    genericRevenue != null &&
    genericRevenueCurrency
  ) {
    parts.push(
      formatCurrency(
        genericRevenue,
        genericRevenueCurrency
      )
    );
  }

  return parts.length > 0
    ? parts.join(' · ')
    : '—';
}

function formatDateTimeSafe(
  value: string | null
) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

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
      hour: 'numeric',
      minute: '2-digit',
    }
  ).format(date);
}

function pretty(
  value: string
) {
  if (!value || value === '—') {
    return '—';
  }

  return value
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}
