# Live CRM setup checklist

## Database

- [ ] Create Supabase project.
- [ ] Run `001_initial_crm.sql`.
- [ ] Run `002_live_crm_auth_and_mutations.sql
003_first_party_tracking.sql`.
- [ ] Optionally run `seed.sql`.

## Authentication

- [ ] Create an email/password user in Supabase Auth.
- [ ] Copy the Auth user UUID.
- [ ] Insert the matching `profiles` row with role `admin`.
- [ ] Confirm the profile has `active = true`.

## Environment

- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`.
- [ ] Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy anon key).
- [ ] Set `NEXT_PUBLIC_USE_MOCK_DATA=false`.
- [ ] Restart Next.js.

## Acceptance tests

- [ ] Signed-out user is redirected to `/login`.
- [ ] Valid admin can sign in.
- [ ] Invalid credentials stay on login page.
- [ ] Lead can be created.
- [ ] Duplicate contact identity fails instead of creating a partial duplicate.
- [ ] Lead list reads live rows.
- [ ] Lead detail reads contacts/timeline/messages.
- [ ] Lead can be edited.
- [ ] Stage change writes `lead_stage_history`.
- [ ] Moving a lost lead back to an active stage resets status to `open`.
- [ ] Follow-up can be created.
- [ ] Completing a follow-up recalculates `next_followup_at`.
- [ ] Sign-out clears the session and protects routes again.


For website tracking configuration after CRM setup, see `docs/tracking-attribution-setup.md`.
