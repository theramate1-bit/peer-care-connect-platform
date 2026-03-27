# Notifications audit and fixes

## Summary

This audit covered the notification dropdown, notifications page, dashboard notification surfaces, Supabase notification schema, RLS, and notification RPCs.

Implemented fixes:

- Aligned frontend read-state handling with the live database by treating `read_at` as canonical.
- Added soft-dismiss support via `notifications.dismissed_at`.
- Patched `mark_notifications_read` to keep legacy `read` in sync with `read_at`.
- Updated all frontend notification fetches to exclude dismissed rows.
- Replaced hard deletes in the UI with soft dismiss updates.

## Root causes found

### 1. Read-state mismatch

The `notifications` table contains both:

- `read boolean`
- `read_at timestamptz`

The frontend normalized notifications with:

```ts
read: input.read ?? input.read_at != null;
```

That meant a row with `read = false` and `read_at != null` still rendered as unread.

The live `mark_notifications_read(p_ids uuid[])` function only updated `read_at`, not `read`, so "Mark all read" could succeed in the database and still look unread in the UI after refresh.

### 2. Dismiss path was using hard delete

The notification dropdown and notifications page used:

```ts
supabase.from("notifications").delete().eq("id", notificationId);
```

But the live `notifications` table did not have a DELETE policy for end users, so dismiss/delete could fail.

### 3. Notification type drift

The live `notifications.type` enum is much smaller than the set assumed in parts of the frontend.

Observed live values included:

- `booking_request`
- `booking_confirmed`
- `session_reminder`
- `session_cancelled`
- `exchange_reciprocal_booking_reminder`

Some exchange notifications are stored with:

- `type = booking_confirmed`
- exchange-specific `source_type`
- exchange-specific `title`

So the frontend cannot rely only on `type`; it must also use `source_type` and title/payload context.

## Best-practice decisions applied

### Soft dismiss instead of hard delete

Following Supabase soft-delete guidance, notifications now use `dismissed_at` instead of deleting rows. This preserves auditability and avoids RLS delete requirements.

### Canonical read field

`read_at` is treated as the source of truth for "read". The legacy boolean `read` is kept synchronized for compatibility, but frontend rendering no longer trusts `read` over `read_at`.

### Client-side classification

Notification surfaces that present specialized subsets (such as "New Bookings") should classify notifications using:

- `type`
- `source_type`
- payload ids
- title/message context

instead of assuming the enum values are always fully expanded and aligned everywhere.

## Files changed

- `peer-care-connect/src/lib/notification-utils.ts`
- `peer-care-connect/src/components/notifications/RealTimeNotifications.tsx`
- `peer-care-connect/src/pages/Notifications.tsx`
- `peer-care-connect/src/components/dashboards/TherapistDashboard.tsx`
- `supabase/migrations/20260313133000_notifications_read_and_dismiss_alignment.sql`

## Supabase changes applied

Migration applied via Supabase MCP:

- add `public.notifications.dismissed_at timestamptz`
- add visible-notification index on `(recipient_id, created_at desc)` where `dismissed_at is null`
- backfill `read = true` where `read_at is not null`
- patch `public.mark_notifications_read(uuid[])` to set both `read_at` and `read = true`

## Recommended next steps

- Consider a dedicated `active_notifications` view (`dismissed_at is null`) so every surface queries one canonical source.
- Consider consolidating all notification fetch/mutate logic into a shared hook or service to avoid dropdown/page drift.
- Consider normalizing notification typing server-side so exchange/mobile/session variants do not overload generic enum values.
- Add a small automated test around:
  - mark one as read
  - mark all as read
  - dismiss one notification
  - re-open dropdown/page and confirm persistence
