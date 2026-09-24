# Yogakulam Growth CRM v0.7 patch

This patch is UI-only. No Supabase migration is required.

1. Stop the local server (`Ctrl+C`).
2. Copy the patch contents over the current CRM project and replace matching files.
3. Run `npm run typecheck` and `npm run build`.
4. Commit and push to `main`; Vercel will redeploy automatically.

Changes:
- fixed sidebar user/sign-out card overlay
- persistent night/light mode
- current-domain tracking snippet
- copy-snippet button
