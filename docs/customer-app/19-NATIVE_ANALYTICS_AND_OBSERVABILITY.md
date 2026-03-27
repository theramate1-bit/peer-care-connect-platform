# Native analytics & observability (customer app)

Align **mobile** measurement with **web** so funnels (booking, auth) are comparable.

---

## Web reference (today)

**File:** `peer-care-connect/src/components/analytics/RouteChangeTracker.tsx`

- On every route change, pushes to **`window.dataLayer`** (Google Tag Manager pattern):

```text
event: page_view
page_path, page_title, page_location
```

**Implication:** Native should emit **equivalent semantic events** (not necessarily `dataLayer` — use Expo-friendly pipeline).

---

## Recommended native approach

| Layer                 | Option                                                                         | Notes                                                                               |
| --------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| **Screen views**      | `expo-router` — `usePathname()` / `useSegments()` in a root layout `useEffect` | Map route to stable **screen name** string (e.g. `client_sessions`, `marketplace`). |
| **Product analytics** | **Posthog**, **Amplitude**, **Mixpanel**, or **Firebase Analytics**            | Choose one; align event names with web GTM if dual-running.                         |
| **Server-side**       | `analytics_events` table (Supabase) if product already writes events           | **RLS** must allow insert for authenticated user only; avoid PII in payload.        |

---

## Minimum event set (customer)

| Event name          | When                               | Params                                       |
| ------------------- | ---------------------------------- | -------------------------------------------- |
| `screen_view`       | Focus / mount of primary screen    | `screen_name`, `route`, optional `user_role` |
| `login_success`     | After Supabase session established | method: `email` \| `oauth`                   |
| `signup_start`      | Register tapped                    | —                                            |
| `booking_started`   | User enters booking flow           | `source`: `marketplace` \| `direct_slug`     |
| `booking_completed` | Payment / confirmation success     | `session_id` or opaque id                    |
| `message_sent`      | Optional — message composed        | `conversation_id` hash                       |

**Funnel:** `screen_view` (explore) → `booking_started` → `booking_completed`.

---

## Errors & crashes

| Tool                          | Use                                             |
| ----------------------------- | ----------------------------------------------- |
| **Sentry** (or Expo + Sentry) | JS errors, native crashes, breadcrumbs          |
| **LogRocket**                 | Session replay (privacy review for health data) |

**Rule:** Scrub **PHI** (names, clinical notes) from analytics payloads.

---

## Parity checklist

- [ ] Native `screen_view` names map 1:1 to web `page_path` segments where possible.
- [ ] Same **conversion** events as web for booking success.
- [ ] Document chosen vendor in [`17-DOCUMENTATION_GAPS_AND_TRACKER.md`](17-DOCUMENTATION_GAPS_AND_TRACKER.md) (DG-06 / analytics row).

---

## Related

- [`07-TESTING_AND_SCREEN_CAPTURES.md`](07-TESTING_AND_SCREEN_CAPTURES.md)
- [`15-MOBILE_PLATFORM_READINESS.md`](15-MOBILE_PLATFORM_READINESS.md)
