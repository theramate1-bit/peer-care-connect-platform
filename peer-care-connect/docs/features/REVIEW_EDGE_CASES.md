# Review Edge Cases

**Date:** March 2025  
**Status:** 🔍 Discovery & Tracking  
**Scope:** GuestReview, SubmitReview, ReviewForm, ReviewSystem, session_feedback, practitioner_ratings, reviews

---

## Overview

Edge cases, failure modes, and UX gaps for the review system—guest and logged-in flows, duplicate prevention, rating display, and table alignment.

---

## Flows & Tables

| Flow | Route | Table(s) | Auth |
|------|-------|----------|------|
| **GuestReview** | `/review?session_id=...&email=...` | `reviews` | Email + session via `get_session_by_email_and_id` |
| **SubmitReview** | `/reviews/submit/:sessionId` | `reviews` | Auth + session (client_id filter) |
| **ReviewForm** | Used by SubmitReview | `reviews`, `detailed_ratings` | Auth |
| **SessionCheckOut** | Practitioner marks complete | `session_feedback` | Auth |
| **PracticeManagementHub** | Stats display | `session_feedback` (completed sessions only) | Auth |

---

## ✅ Fixed

### 1. **Guest: Email typo / session not found**
**Was:** Generic "Unable to verify session. Please check your email link."  
**Now:** "No session found for this email. Please check you're using the same email you used when booking."

### 2. **SubmitReview: Wrong table for duplicate check**
**Was:** Checked `practitioner_ratings` for existing review; inserts go to `reviews`.  
**Now:** Checks `reviews` table by `session_id` + `client_id`; uses `maybeSingle()` for consistency.

### 3. **SubmitReview: No client_id filter**
**Was:** Fetched session by `sessionId` only; relied on RLS.  
**Now:** Fetches with `.eq('client_id', user.id)` for defense in depth. Requires `user` before fetch.

### 4. **Review submission idempotency / double-submit**
**Was:** Duplicate check before insert; race could allow two inserts.  
**Now:** `reviews` has `UNIQUE(client_id, session_id)`. ReviewForm, ReviewSystem (guest + auth) catch 23505 and show "Review already submitted for this session." GuestReview calls `onReviewSubmitted?.()` on duplicate so UX reflects success.

### 5. **Rating before completion (PracticeManagementHub)**
**Was:** `session_feedback` fetched for all sessions.  
**Now:** Only fetches feedback for sessions with `status = 'completed'` so average rating excludes pre-completion feedback.

### 6. **Guest registers before completing review**
**Was:** Could land on guest flow while logged in.  
**Status:** GuestReview redirects logged-in users to `/reviews/submit/:sessionId`.

---

## Schema Notes

- **reviews:** `UNIQUE(client_id, session_id)`, `overall_rating` 1–5, `review_status` published
- **practitioner_ratings:** Separate table; used by getPractitionerStats for combined rating; not used for duplicate check
- **session_feedback:** Private feedback from SessionCheckOut; used for PracticeManagementHub stats

---

## ⚠️ Open / Lower Priority

### Review link format
- Email-based links (`?session_id=...&email=...`) are the canonical format for guests.
- Token-based links may exist for older sessions; ensure fallback where needed.

### Multiple tabs
- Same guest with two tabs on review page could submit twice; unique constraint prevents duplicate rows; UX may show error on second tab.

---

## Related Docs

- [GUEST_EDGE_CASES.md](./GUEST_EDGE_CASES.md) – Items 14, 15
- [PRACTITIONER_DASHBOARD_EDGE_CASES.md](./PRACTITIONER_DASHBOARD_EDGE_CASES.md) – Item 17 (rating before completion)
- [SUPABASE_SCHEMA_EDGE_CASES.md](./SUPABASE_SCHEMA_EDGE_CASES.md) – Rating constraints
- [EDGE_CASES_OPEN.md](./EDGE_CASES_OPEN.md)

---

**Last Updated:** March 2025
