# v0.4 — Course catalog + batch selector

Run this after v0.3 is already working with Supabase.

## 1. Run migration 004

In Supabase → SQL Editor, run:

`supabase/migrations/004_course_catalog_and_batches.sql`

It is safe to run after you already inserted the course catalog manually: course rows are upserted by `code`, and batch rows are upserted by `batch_code`.

## 2. What it adds

- Yogakulam course catalog upsert
- Upcoming/current course batches for Mysore, Kerala, Bengaluru and Online
- Stable batch codes
- Batch-aware lead creation RPC
- `preferred_batch_id` stored on new leads

## 3. UI behavior

On Add/Edit Lead:

1. Choose Course.
2. Upcoming Batch only shows batches that belong to that course.
3. Choose a batch.
4. Location, preferred month, mode and timezone auto-fill.
5. You can still manually edit those fields when the lead has a custom preference.

## 4. Existing `.env.local`

Do not replace or share your `.env.local`. Keep the same Supabase URL and publishable key you already configured.

## 5. Verify

Create a test lead and select:

- Course: 200-Hour Yoga Teacher Training
- Batch: Mysore, 7 Oct–30 Oct 2026

The form should set:

- Location: Mysore
- Month: October 2026
- Mode: Residential
- Timezone: Asia/Kolkata

After saving, Supabase → `leads` should contain both `interested_course_id` and `preferred_batch_id`.
