# v0.9 Public Tracking Route Fix

This patch fixes the CRM middleware redirecting public tracking resources to `/login`.

## Install
1. Replace the project's root `middleware.ts` with the `middleware.ts` in this patch.
2. No Supabase migration is required.
3. Commit and push:

```powershell
git add middleware.ts
git commit -m "Fix public tracking routes"
git push origin main
```

4. Wait for Vercel to deploy.

## Verify in Incognito
Open:

- `https://YOUR-PRODUCTION-DOMAIN/yogakulam-tracker.js`
  - Expected: JavaScript source text, NOT the CRM login page.
- `https://YOUR-PRODUCTION-DOMAIN/api/tracking/health`
  - Expected: JSON.

Then test your GTM tag on `yogakulam.com`.

## Public routes after this patch
- `/login`
- `/yogakulam-tracker.js`
- `/api/tracking/*`
- `/api/leads/capture`

All CRM pages such as `/dashboard`, `/leads`, `/pipeline`, etc. remain protected by Supabase Auth.
