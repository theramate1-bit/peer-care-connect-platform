# Error, empty, loading, and offline states (customer mobile)

Patterns for a **calm**, **trustworthy** healthcare-adjacent UX — aligned with [`18-MOBILE_UI_UX_FOUNDATIONS_BMAD.md`](18-MOBILE_UI_UX_FOUNDATIONS_BMAD.md).

---

## Principles

| Principle              | Implementation                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Never dead-end**     | Every error offers **Retry**, **Go back**, or **Contact support** (link to `APP_CONFIG.HELP_URL` / email). |
| **No raw errors**      | Map Supabase / network codes to **short, human** copy; log details to Sentry.                              |
| **Skeleton first**     | Lists use **skeleton placeholders**; avoid layout jumps when data arrives.                                 |
| **Optimistic caution** | Optimistic UI only where rollback is safe (e.g. not payment).                                              |

---

## Loading

| Context             | Pattern                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| **Initial screen**  | Full-screen skeleton or branded spinner; **max** perceived wait — show structure within 300ms. |
| **Pull-to-refresh** | Standard on lists (sessions, marketplace).                                                     |
| **Pagination**      | Footer spinner or “Load more”; avoid blocking the whole screen.                                |
| **Inline**          | Small `ActivityIndicator` on primary button while submitting.                                  |

---

## Empty

| Screen        | Empty state                                                      |
| ------------- | ---------------------------------------------------------------- |
| **Sessions**  | “No upcoming sessions” + CTA **Book** (→ marketplace / booking). |
| **Messages**  | “No conversations yet” + hint to book or message from profile.   |
| **Favorites** | “No saved practitioners” + CTA **Browse marketplace**.           |
| **Explore**   | “No practitioners match filters” + **Clear filters**.            |

**Illustration:** Optional single calm illustration; **must** not block ship if assets missing.

---

## Error

| Type               | User copy direction                     | Action               |
| ------------------ | --------------------------------------- | -------------------- |
| **Network**        | “Can’t connect. Check your connection.” | Retry                |
| **401 / session**  | “Session expired. Sign in again.”       | → Login              |
| **403 / RLS**      | “You don’t have access to this.”        | Back                 |
| **4xx validation** | Field-level or toast summary            | Fix input            |
| **5xx / unknown**  | “Something went wrong. Try again.”      | Retry + support link |

---

## Offline

| Behavior      | Rule                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------- |
| **Detection** | `NetInfo` (or equivalent) — show **banner** “You’re offline” instead of silent failures. |
| **Reads**     | Supabase may show cached nothing — prefer **empty + offline** message.                   |
| **Writes**    | Queue or block with clear message; **never** fake success for booking/payment.           |

---

## Accessibility

- Loading: `accessibilityState={{ busy: true }}` on main region where appropriate.
- Errors: `accessibilityLiveRegion` on Android / VoiceOver on iOS for **announcements**.

---

## Related

- [`19-NATIVE_ANALYTICS_AND_OBSERVABILITY.md`](19-NATIVE_ANALYTICS_AND_OBSERVABILITY.md) — log errors to Sentry
- [`17-DOCUMENTATION_GAPS_AND_TRACKER.md`](17-DOCUMENTATION_GAPS_AND_TRACKER.md) — UX-04
