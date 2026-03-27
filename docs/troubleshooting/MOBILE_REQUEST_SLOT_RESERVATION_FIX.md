# Mobile Request Slot Reservation Fix

**Date:** 2026-03-14  
**Migration:** `20260314120000_mobile_request_reserves_slot.sql`  
**Status:** Applied to production

## Problem

Pending mobile booking requests did **not** reserve inventory against clinic bookings. This created an overlap gap:

1. Client A submits a **mobile request** for Tuesday 10:00
2. Before the practitioner accepts, Client B books a **clinic session** for Tuesday 10:00
3. Both appear valid — the mobile request and clinic booking claim the same slot

The root cause: `create_mobile_booking_request` only checked for duplicate pending requests from the _same client_, not for conflicts against `client_sessions`, `slot_holds`, or `calendar_events`.

## Solution

### 1. Conflict Checks in `create_mobile_booking_request`

Before inserting a mobile request, the function now checks for overlaps against **four** sources:

| Check                             | Source Table              | Logic                                                                                                                                                             |
| --------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (a) Confirmed bookings            | `client_sessions`         | Uses `get_directional_booking_buffer_minutes()` — same buffer logic as the `prevent_overlapping_bookings` trigger (15min default, 30min for hybrid mobile↔clinic) |
| (b) Active slot holds             | `slot_holds`              | Direct time overlap with non-expired active holds                                                                                                                 |
| (c) Other pending mobile requests | `mobile_booking_requests` | Direct time overlap with non-expired pending requests from any client                                                                                             |
| (d) Blocked calendar time         | `calendar_events`         | Direct overlap with `block`/`unavailable` events (matches `prevent_blocked_time_bookings` trigger logic)                                                          |

If any conflict is found, the request is rejected with a clear error message.

### 2. Slot Hold Creation

After a successful insert into `mobile_booking_requests`, the function creates a corresponding `slot_holds` row:

- `mobile_request_id` → links to the mobile request
- `expires_at` → 60 minutes (same as the mobile request expiry)
- `status` → `'active'`

This makes the pending mobile request visible to both:

- The clinic booking UI (`CalendarTimeSelector` reads `slot_holds`)
- Other mobile request submissions (check b above)

### 3. Automatic Slot Release

A new trigger `trg_release_mobile_slot_hold` fires on `UPDATE` of `mobile_booking_requests`. When a request transitions from `'pending'` to `'declined'`, `'expired'`, or `'cancelled'`, the corresponding `slot_holds` row is set to `status = 'released'`.

### 4. Old Overload Cleanup

The older 10-parameter version of `create_mobile_booking_request` (without `p_pre_assessment_payload`) was dropped to prevent ambiguous function calls.

## Schema Changes

| Object                                     | Type              | Change                                                             |
| ------------------------------------------ | ----------------- | ------------------------------------------------------------------ |
| `slot_holds.mobile_request_id`             | Column (uuid, FK) | Added — references `mobile_booking_requests(id) ON DELETE CASCADE` |
| `idx_slot_holds_mobile_request`            | Partial index     | Added — on `mobile_request_id WHERE mobile_request_id IS NOT NULL` |
| `create_mobile_booking_request(11 params)` | Function          | Replaced — now includes 4-way conflict checks + slot hold creation |
| `create_mobile_booking_request(10 params)` | Function          | Dropped                                                            |
| `release_mobile_request_slot_hold()`       | Trigger function  | Created                                                            |
| `trg_release_mobile_slot_hold`             | Trigger           | Created on `mobile_booking_requests`                               |

## Verification

After deployment, confirmed in live Supabase:

- ✅ Only one function overload exists (11-param)
- ✅ `slot_holds.mobile_request_id` column present
- ✅ `trg_release_mobile_slot_hold` trigger active on `mobile_booking_requests`
- ✅ `release_mobile_request_slot_hold()` function exists

## What This Means for 10,000-User Readiness

| Scenario                                 | Before                               | After                      |
| ---------------------------------------- | ------------------------------------ | -------------------------- |
| Pending mobile vs clinic booking overlap | Possible                             | **Blocked at DB level**    |
| Pending mobile vs another mobile overlap | Partially checked (same client only) | **Blocked for any client** |
| Pending mobile vs blocked time           | Not checked                          | **Blocked**                |
| Pending mobile vs active slot hold       | Not checked                          | **Blocked**                |
| Confirmed booking overlap                | Already blocked                      | Still blocked              |
| Blocked time vs clinic booking           | Already blocked                      | Still blocked              |

The system now uses a **unified reservation model** where mobile requests reserve slots immediately upon creation, not just upon acceptance.
