# Slots, conflicts & directional buffers

## Client-visible lead time (slot lists)

Before showing a time, apps typically hide slots that start **too soon**:

- **`BOOKING_CONFIG.MIN_BOOKING_BUFFER_HOURS`** — **`2`** in **`theramate-ios-client/constants/config.ts`**.
- **`src/lib/clientMarketplaceBooking.ts`** — same constant (**`MIN_BOOKING_BUFFER_HOURS = 2`**) with comment to keep aligned with native.

Used when filtering generated slots (e.g. **`fetchAvailableStartTimes`** paths).

## Slot grid

Comments in **`theramate-ios-client/lib/api/booking.ts`** and **`src/lib/clientMarketplaceBooking.ts`** describe:

- **15-minute** grid steps from **`practitioner_availability`** (or defaults),
- subtraction of **`client_sessions`**, **`slot_holds`**, **`calendar_events`** (blocks).

## Server-side directional buffers (hybrid / mobile travel)

Overlaps are **not** only “end time vs start time”. Migrations define **`get_directional_booking_buffer_minutes`** and use it in:

- **`create_booking_with_validation`** conflict checks,
- **`accept_mobile_booking_request`** (and related),
- triggers aligning blocked times vs bookings.

Examples:

- **`supabase/migrations/20260309123000_align_trigger_buffer_and_blocked_conflicts.sql`**
- **`supabase/migrations/20260314140000_comprehensive_gap_fixes.sql`**

**Frontend implication:** even if the slot picker looks free, the **RPC may reject** a time that violates directional gaps between **clinic** and **mobile** sessions for the same practitioner (especially **hybrid**).

## Deeper narrative

Exact minute rules per transition (clinic↔mobile, mobile↔mobile) live in SQL and in legacy **`PRACTITIONER_TYPE_HYBRID.md`** / **`slot-generation-utils`** discussions (`peer-care-connect`). Treat **`get_directional_booking_buffer_minutes`** in **`supabase/migrations`** as **source of truth** when debugging conflicts.
