# v0.3 First-party tracking + attribution setup

This milestone records anonymous website journeys before a visitor becomes a known CRM lead.

## What v0.3 captures

- First-touch and current-session UTM values
- `gclid`, `gbraid`, `wbraid`, `fbclid`
- Google ValueTrack-style IDs passed as `campaignid`, `adgroupid`, `creative`
- Optional Meta-style `campaign_id`, `adset_id`, `ad_id`
- Landing URL, path, referrer and page title
- Anonymous visitor ID (`yk_vid`) and current session ID (`yk_sid`)
- Page views
- Tagged CTA clicks
- Lead-form-submit events

The public collection endpoint does **not** need the visitor's name, email or phone number.

## 1. Run migration 003

After migrations 001 and 002, run:

```text
supabase/migrations/003_first_party_tracking.sql
```

It adds tracking idempotency, attribution-refresh logic, anonymous-to-lead linking and the tracking-health view.

## 2. Configure server-only environment values

Add to `.env.local` on the CRM server:

```env
SUPABASE_SECRET_KEY=sb_secret_...
# Legacy projects may use SUPABASE_SERVICE_ROLE_KEY instead.

TRACKING_ALLOWED_ORIGINS=https://www.yogakulam.com,https://yogakulam.com,https://www.yogakulamacademy.com,https://yogakulamacademy.com
TRACKING_INGEST_SECRET=<generate-a-long-random-secret>
```

Never expose either server secret in browser JavaScript or GTM.

## 3. Install the tracker

After deploying the CRM, add this to the public site or deploy it through GTM Custom HTML:

```html
<script
  src="https://crm.example.com/yogakulam-tracker.js"
  data-endpoint="https://crm.example.com/api/tracking/collect"
  data-site="yogakulamacademy.com"
  data-consent-mode="required"
  defer>
</script>
```

For `yogakulam.com`, change only `data-site` if both sites use the same CRM endpoint.

### Consent

The default is `required`. The tracker creates local identifiers but does not send analytics events until consent is granted.

After your cookie/consent system receives analytics consent:

```js
window.dispatchEvent(new CustomEvent('yk:consent', {
  detail: { analytics: true }
}));
```

To revoke:

```js
window.dispatchEvent(new CustomEvent('yk:consent', {
  detail: { analytics: false }
}));
```

If your legal/privacy setup permits immediate analytics collection, you can explicitly use `data-consent-mode="granted"`. Do not do this blindly for all visitors; decide based on your consent implementation and applicable requirements.

## 4. Tag important CTAs

Example WhatsApp CTA:

```html
<a
  href="https://wa.me/..."
  data-yk-event="whatsapp_click"
  data-yk-channel="whatsapp"
  data-yk-label="200H Mysore WhatsApp">
  Enquire on WhatsApp
</a>
```

Example Instagram CTA:

```html
<a
  href="https://instagram.com/..."
  data-yk-event="instagram_click"
  data-yk-channel="instagram"
  data-yk-label="Instagram profile">
  Instagram
</a>
```

Use stable event names. Recommended first set:

```text
course_enquire_click
whatsapp_click
instagram_click
reservation_start
payment_start
brochure_download
lead_form_submit
```

## 5. Lead forms

Add `data-yk-lead-form` to a public enquiry form:

```html
<form method="post" data-yk-lead-form>
  ...
</form>
```

The tracker automatically adds hidden fields:

```text
yk_visitor_id
yk_session_id
yk_first_touch
yk_session_touch
```

The form processor should save the two IDs. After the lead exists in this CRM, call the server-to-server identification endpoint:

```http
POST /api/tracking/identify
X-Tracking-Secret: <TRACKING_INGEST_SECRET>
Content-Type: application/json

{
  "leadId": "<CRM UUID>",
  "anonymousVisitorId": "<yk_visitor_id>",
  "sessionKey": "<yk_session_id>"
}
```

This attaches earlier anonymous sessions/touchpoints to the lead and refreshes first/last/creation/conversion attribution.

## 6. Google Ads

Keep Google Ads auto-tagging enabled so Google can append click identifiers such as GCLID. Make sure redirects do not strip query parameters. If you use Google Tag Manager, add a Conversion Linker tag firing on all pages so Google click information can be stored in first-party cookies for conversion measurement.

For additional ad metadata, Google ValueTrack can pass IDs such as campaign, ad group and creative. A final URL suffix can be structured like:

```text
campaignid={campaignid}&adgroupid={adgroupid}&creative={creative}&keyword={keyword}
```

Do not replace auto-tagging with this. Use both when you need CRM-readable ad metadata plus Google's click identifiers.

## 7. UTM naming convention

Use lowercase, predictable values. Suggested convention:

```text
utm_source=google | instagram | facebook | newsletter | partner
utm_medium=cpc | paid_social | organic_social | email | referral
utm_campaign=200h_mysore_oct_2026
utm_content=student_testimonial_01
utm_term=yoga_teacher_training_india
```

Avoid switching between values such as `Instagram`, `instagram`, `ig` and `Instagram_Ads` for the same source.

## 8. GTM

The tracker pushes a `yk_tracking_ready` event to `dataLayer` with:

```text
yk_visitor_id
yk_session_id
yk_source
yk_medium
yk_campaign
```

This can be used for debugging or for sending the same normalized acquisition context into GA4 tags.

## 9. Test checklist

1. Open the website with test UTMs.
2. Grant analytics consent.
3. In browser DevTools → Network, confirm `/api/tracking/collect` returns `{ ok: true }`.
4. Confirm `web_sessions` gets one row for the session.
5. Navigate to another page; confirm new `touchpoints` rows are created.
6. Click a tagged CTA; confirm its event type is stored.
7. Test a URL with a dummy `gclid=TEST-GCLID`; confirm the value is stored.
8. Submit a `data-yk-lead-form` form and confirm hidden visitor/session IDs exist.
9. Create/link a test CRM lead and call `/api/tracking/identify` server-to-server.
10. Confirm old touchpoints now have `lead_id` and `lead_attribution` is populated.
11. Open `/tracking` and `/attribution` in the CRM.

## 10. Security / privacy rules

- Never put the Supabase secret/service-role key in GTM, source code served to visitors or `NEXT_PUBLIC_*` variables.
- The public collector rejects origins not listed in `TRACKING_ALLOWED_ORIGINS`.
- `/api/tracking/identify` additionally requires `TRACKING_INGEST_SECRET`.
- Keep PII out of anonymous tracking metadata.
- Do not send health, payment-card or other sensitive information in event metadata.
- Use your consent-management implementation to decide when analytics/advertising identifiers may be collected or sent.
