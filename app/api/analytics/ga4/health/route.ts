import {
  NextResponse,
} from 'next/server';

import {
  createClient,
} from '@/lib/supabase/server';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


export async function GET() {
  try {
    const supabase =
      await createClient();

    const {
      data: authData,
      error: authError,
    } =
      await supabase
        .auth
        .getUser();

    if (
      authError ||
      !authData.user
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Unauthorized',
        },
        {
          status: 401,
        }
      );
    }

    const [
      healthResult,
      runsResult,
    ] =
      await Promise.all([
        supabase
          .from(
            'v_ga4_sync_health'
          )
          .select('*')
          .maybeSingle(),

        supabase
          .from(
            'ga4_sync_runs'
          )
          .select(`
            id,
            property_id,
            status,
            from_date,
            to_date,
            overview_rows,
            source_rows,
            landing_page_rows,
            campaign_rows,
            country_rows,
            total_rows,
            error_message,
            started_at,
            completed_at
          `)
          .order(
            'started_at',
            {
              ascending: false,
            }
          )
          .limit(10),
      ]);

    if (healthResult.error) {
      throw new Error(
        `Unable to load GA4 health: ${healthResult.error.message}`
      );
    }

    if (runsResult.error) {
      throw new Error(
        `Unable to load GA4 sync history: ${runsResult.error.message}`
      );
    }

    return NextResponse.json({
      ok: true,
      health:
        healthResult.data ??
        null,
      recentRuns:
        runsResult.data ??
        [],
    });

  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown GA4 health error';

    console.error(
      'GA4 health failed:',
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}
