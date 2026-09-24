# v0.5 Real-time CRM Testing

## Purpose

Use the CRM with real academy enquiries before Instagram/WhatsApp API automation is enabled. Staff keep using the normal Instagram/WhatsApp apps, while logging the meaningful inbound/outbound interactions in the CRM. This validates funnel logic, follow-ups, ownership, timelines, and live dashboard updates using real data.

## Install

Run after migrations 001–003. Migration 004 is optional if you are postponing the course-batch catalog integration.

```text
supabase/migrations/005_realtime_operations.sql
```

Restart the Next.js app after copying the v0.5 files.

## Test scenario

1. Create a lead in stage `new`.
2. Open the lead. Under **Real-time testing → Log interaction**, choose `Outbound`, choose the actual channel, and paste the message you sent manually.
3. Confirm the lead moves to `contacted`, `last_contacted_at` is populated, and a conversation/message record exists.
4. When the prospect replies, log an `Inbound` interaction. Confirm the lead moves to `engaged`.
5. Set the stage to `qualified` when the course/date/mode are known.
6. Schedule a follow-up.
7. Open `/follow-ups`, then complete or snooze it.
8. Open `/conversations?lead=<lead-id>` and confirm the interaction history.
9. Keep `/dashboard` open in a second tab and verify the green **Live sync** indicator. Changes made in one tab should refresh the other.

## What this tests now

- Real Supabase persistence
- Admissions funnel movement
- Contact timestamps
- Conversation/message records
- Follow-up discipline
- Real-time UI refresh
- Lead timelines
- Attribution fields already stored on the lead

## What is intentionally not automatic yet

- Sending Instagram DMs
- Sending WhatsApp messages
- Receiving Meta webhooks
- Creating website leads from production forms
- Claude qualification/replies
- Google/Meta Ads spend sync

Those integrations will use the same lead, conversation, message, touchpoint, task, and attribution tables after the manual process is proven.
