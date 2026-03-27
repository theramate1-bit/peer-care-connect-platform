# Customer web routes (`/client/*` and shared)

**Source of truth:** `peer-care-connect/src/components/AppContent.tsx`  
**Stack:** React + Vite + React Router v6

All routes below use `SimpleProtectedRoute` unless noted. Most use `AuthenticatedLayout` (Header + main).

## Authenticated client routes

| Path                      | Page module                                  | Purpose                                                   |
| ------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| `/client/dashboard`       | `pages/client/ClientDashboard.tsx`           | Home: upcoming sessions, favorites, stats, timeline       |
| `/client/booking`         | `pages/client/ClientBooking.tsx`             | Find practitioners, book clinic / hybrid / mobile request |
| `/client/profile`         | `pages/client/ClientProfile.tsx`             | Profile settings                                          |
| `/client/sessions`        | `pages/client/MySessions.tsx`                | Sessions list, notes tab, session detail                  |
| `/client/progress`        | `pages/client/ClientProgress.tsx`            | Progress metrics                                          |
| `/client/goals`           | `pages/client/ClientGoals.tsx`               | Goals                                                     |
| `/client/exercises`       | `pages/client/MyExercises.tsx`               | Home exercise programs                                    |
| `/client/mobile-requests` | `pages/client/ClientMobileRequests.tsx`      | Status of mobile booking requests                         |
| `/client/messages`        | `components/messaging/RealTimeMessaging.tsx` | Same messaging UI as `/messages`                          |
| `/client/notes`           | **Redirect**                                 | → `/client/sessions?tab=notes`                            |
| `/client/plans`           | `pages/client/ClientTreatmentPlans.tsx`      | Treatment plans                                           |
| `/client/favorites`       | `pages/client/ClientFavorites.tsx`           | Saved practitioners                                       |

## Universal profile (client branch)

| Path       | Resolution                                                       |
| ---------- | ---------------------------------------------------------------- |
| `/profile` | `ProfileRedirect`: if `user_role === 'client'` → `ClientProfile` |

## Shared with other roles (customer-relevant)

| Path               | Notes                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `/messages`        | Same `RealTimeMessaging` as `/client/messages` — clients often land here from global nav |
| `/notifications`   | In-app notifications                                                                     |
| `/marketplace`     | Discovery; logged-in clients use marketplace + booking                                   |
| `/find-therapists` | Authenticated search (subscription not required on route)                                |

## Subscription / practitioner-only routes (not customer-app)

Routes like `/dashboard`, `/bookings`, `/practice/*` are **practitioner** surfaces. Clients should not be routed there; `AuthRouter` and role checks enforce this.

## Page files under `pages/client/` without a dedicated route

Some files exist for potential reuse or legacy; confirm before building native parity:

- `ClientBookings.tsx` — **not** in `AppContent` as a top-level route (verify usage).
- `ClientNotes.tsx` — may be folded into `MySessions` / tabs.

See [`../product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md`](../product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md) Phase 2.
