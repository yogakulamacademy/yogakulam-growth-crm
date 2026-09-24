# Yogakulam Growth CRM v0.8 Tracking Diagnostics Patch

1. Stop the local dev server.
2. Copy this patch into the existing CRM project and replace matching files.
3. No Supabase migration is required.
4. Run `npm run typecheck` and `npm run build`.
5. Commit + push to `main`; Vercel will redeploy.
6. In GTM, temporarily use the testing snippet shown on CRM → Tracking (`data-consent-mode="granted" data-debug="true"`).
7. Open `/api/tracking/health` on the production CRM URL.
8. On the academy site run `window.YKTracking.status()` in DevTools Console.
