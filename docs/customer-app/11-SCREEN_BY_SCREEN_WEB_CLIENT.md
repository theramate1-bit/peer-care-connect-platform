# Screen-by-screen: web client (`peer-care-connect`)

Each row ties a **route** to the **page module** and what the screen **actually does** in code (verified from source).

**Router:** `src/components/AppContent.tsx`  
**Layout:** `AuthenticatedLayout` wraps `Header` + `<main id="main-content">` for all `/client/*` routes.

---

## `/client/dashboard` — `pages/client/ClientDashboard.tsx`

| Area         | Behavior                                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Data**     | Loads `client_sessions` (upcoming, recent, all-for-stats), `client_favorites` + `users` for therapist rows. Filters with `isClientSessionVisible` / `getDisplaySessionStatus`.             |
| **Realtime** | `useRealtimeSubscription('client_sessions', client_id=eq.{user.id})` refreshes dashboard.                                                                                                  |
| **UI**       | Stat cards (upcoming count, total sessions, total invested). CTA **Browse Marketplace** → `/marketplace`. Upcoming / recent session lists with links to **View All** → `/client/sessions`. |
| **Timeline** | `TheramateTimeline` (`components/client/TheramateTimeline.tsx`) with `clientId` + `readOnly`.                                                                                              |

---

## `/client/booking` — `pages/client/ClientBooking.tsx`

| Area               | Behavior                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Purpose**        | Search/filter practitioners; open **clinic booking** or **mobile request** depending on `therapist_type` and helpers `canBookClinic` / `canRequestMobile` (`lib/booking-flow-type`). |
| **Embedded flows** | `BookingFlow`, `MobileBookingRequestFlow`, `NextAvailableSlot`, `HybridBookingChooser`.                                                                                              |
| **Data**           | Supabase queries for practitioner list; geo/distance when used (see file for filters).                                                                                               |

---

## `/marketplace` — `pages/Marketplace.tsx` (shared route)

| Area        | Behavior                                                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose** | Full marketplace: `SmartSearch`, `GuestBookingFlow` / `BookingFlow`, `MobileBookingRequestFlow`, `HybridBookingChooser`, geo (`GeoSearchService`, `LocationManager`), `PublicProfileModal`, `ReviewsModal`. |
| **Header**  | Uses `HeaderClean` + `FooterClean` for marketing-style shell on some layouts.                                                                                                                               |
| **Clients** | Primary discovery path; dashboard CTA links here.                                                                                                                                                           |

---

## `/client/sessions` — `pages/client/MySessions.tsx`

| Area               | Behavior                                                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope**          | Large page: session list, **notes**, filters (URL params), `PrivateRatingModal`, `ClientProgressTracker`, `BookingFlow` for rebooking, `RebookingService`, `HEPService` / exercise programs. |
| **Realtime**       | `useRealtimeSubscription` on relevant tables (see file).                                                                                                                                     |
| **Tabs / filters** | Practitioner filter, status, search; syncs to URL via `useSearchParams`.                                                                                                                     |
| **Libs**           | `MessagingManager`, `filterSessionsUtil` / `getUniquePractitioners` from `lib/my-sessions-filters`, `session-display-status`.                                                                |

---

## `/client/progress` — `pages/client/ClientProgress.tsx`

| Area   | Behavior                                                                                                   |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| **UI** | Thin wrapper: renders `ClientProgressTracker` with `clientId`, `readOnly={true}`, `defaultTab="progress"`. |

---

## `/client/goals` — `pages/client/ClientGoals.tsx`

| Area   | Behavior                                                           |
| ------ | ------------------------------------------------------------------ |
| **UI** | Same pattern: `ClientProgressTracker` with `defaultTab` for goals. |

---

## `/client/exercises` — `pages/client/MyExercises.tsx`

| Area     | Behavior                                                                                |
| -------- | --------------------------------------------------------------------------------------- |
| **Data** | `HEPService`, `HomeExerciseProgram`, sessions with programs; `useRealtimeSubscription`. |
| **UI**   | Lists sessions/programs with completion state; exercise detail flows.                   |

---

## `/client/profile` — `pages/client/ClientProfile.tsx`

| Area         | Behavior                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------- |
| **Data**     | Loads `users` profile fields + `notification_preferences`; `FileUploadService` for photo. |
| **Realtime** | `useRealtimeSubscription('users', id=eq.{profile})` with merge toast when editing.        |

---

## `/client/mobile-requests` — `pages/client/ClientMobileRequests.tsx`

| Area   | Behavior                                                                                   |
| ------ | ------------------------------------------------------------------------------------------ |
| **UI** | Delegates entirely to `MobileRequestStatus` (`components/client/MobileRequestStatus.tsx`). |

---

## `/client/messages` — `components/messaging/RealTimeMessaging.tsx`

| Area     | Behavior                                                                      |
| -------- | ----------------------------------------------------------------------------- |
| **Note** | Same component as `/messages`; client header links to **`/client/messages`**. |

---

## `/client/plans` — `pages/client/ClientTreatmentPlans.tsx`

| Area     | Behavior                                                                 |
| -------- | ------------------------------------------------------------------------ |
| **Data** | `supabase.from('treatment_plans').select(...).eq('client_id', user.id)`. |
| **UI**   | Simple cards; goals/interventions shown as JSON `pre` (minimal UX).      |

---

## `/client/favorites` — `pages/client/ClientFavorites.tsx`

| Area     | Behavior                                                                     |
| -------- | ---------------------------------------------------------------------------- |
| **Data** | `client_favorites` + `users` for therapist details; links to book / profile. |

---

## `/profile` (client) — `components/ProfileRedirect.tsx`

| Area      | Behavior                                                                                |
| --------- | --------------------------------------------------------------------------------------- |
| **Logic** | If `user_role === 'client'` → `ClientProfile` (same as `/client/profile` content path). |

---

## Other routes clients use

| Route              | Page                                 | Notes                                        |
| ------------------ | ------------------------------------ | -------------------------------------------- |
| `/notifications`   | `pages/Notifications.tsx`            | In-app notifications                         |
| `/settings`        | `pages/settings/SettingsProfile.tsx` | Settings (not under `/client` but universal) |
| `/login`           | `pages/auth/Login.tsx`               | Entry                                        |
| `/book/:slug`      | `pages/public/DirectBooking.tsx`     | Guest or authenticated book                  |
| `/booking-success` | `pages/BookingSuccess.tsx`           | Post-checkout                                |
| `/review`          | `pages/reviews/GuestReview.tsx`      | Guest review                                 |

---

## Embedded component: `ClientSessionDashboard` (`components/client/ClientSessionDashboard.tsx`)

Used inside flows that need a **session hub** with tabs: **Overview**, **Upcoming**, **History**, **Progress**, **Exercises** — own realtime and rebooking/reschedule dialogs. Confirm imports from parent pages (grep for `ClientSessionDashboard`).

---

## Next doc

How the **shell** exposes these routes (header vs sidebar vs CTAs): [`12-NAVIGATION_SHELL_AND_ENTRY_POINTS.md`](12-NAVIGATION_SHELL_AND_ENTRY_POINTS.md)
