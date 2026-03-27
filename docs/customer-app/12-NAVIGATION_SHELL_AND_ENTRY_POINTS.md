# Navigation shell and entry points (client)

## Global shell

| Piece        | File                                                | Role                                                                                                                                                                                                      |
| ------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Header**   | `src/components/Header.tsx`                         | Sticky top bar: logo → `/`, **Messages** → `/client/messages` (clients), `RealTimeNotifications`, sign out. Practitioner-only **Profile** button in header; **clients** use sidebar/role nav for profile. |
| **Role nav** | `src/components/navigation/RoleBasedNavigation.tsx` | All **primary** `/client/*` links for clients.                                                                                                                                                            |
| **Main**     | `AppContent` `AuthenticatedLayout`                  | `<main id="main-content">` wraps page content.                                                                                                                                                            |

---

## Client: `RoleBasedNavigation` items (sidebar default)

For `user_role === 'client'`, the **full** list is:

1. **Dashboard** → `/client/dashboard`
2. **Sessions** → `/client/sessions`
3. **My Exercises** → `/client/exercises`
4. **Progress** → `/client/progress`
5. **Goals** → `/client/goals`
6. **Profile** → `/client/profile`

**Not in this list:** `/marketplace`, `/client/booking`, `/client/favorites`, `/client/mobile-requests`, `/notifications`, `/settings` — users reach these via **CTAs**, **header**, or **direct URL**.

---

## Header variant (desktop, narrow)

`RoleBasedNavigation` variant `header` **filters** client items to only:

- Dashboard
- Sessions
- My Exercises
- Progress

So **Goals** and **Profile** appear in **sidebar** (`variant` default) on desktop, but **not** in the **horizontal header** strip — they still need the sidebar or a direct link.

---

## Messages (always in header)

`Header.tsx` links to:

```ts
isClientUser ? "/client/messages" : "/messages";
```

Unread badge uses `message_status_tracking` (`delivered` count).

---

## Marketplace entry

**Primary:** `ClientDashboard` card **“Browse Marketplace”** → `/marketplace`.  
**Public:** logged-out users see **Marketplace** in the unauthenticated header (`getNavigationItems`).

---

## Booking entry

| Path              | How users get there                                  |
| ----------------- | ---------------------------------------------------- |
| `/client/booking` | Direct URL, bookmarks, internal links from marketing |
| `/marketplace`    | Main discovery + booking flows                       |
| `/book/:slug`     | Direct practitioner link (email, marketing)          |

---

## Mobile drawer (`Header` mobile menu)

`Header.tsx` uses `<RoleBasedNavigation variant="mobile" />` for logged-in users.

In `RoleBasedNavigation.tsx`, the `mobile` variant filters with `mobileAllowedLabels` aimed at **practitioner** items (`Diary`, `Client Management`, `Treatment Exchange`, etc.). Client labels such as **Sessions**, **My Exercises**, **Progress**, and **Goals** are **not** in that list. The drawer therefore only shows nav items whose **labels intersect** the allow-list — for clients, that is effectively **Dashboard** and **Profile** (plus any extra links added elsewhere). **Sessions / exercises / progress / goals** are not exposed in the hamburger for clients.

**Implication:** On narrow viewports, clients rely on **direct URLs**, **dashboard CTA** (marketplace), and **Messages** in the header — not a complete duplicate of the desktop sidebar. **Native apps should not replicate this gap:** implement a full **tab + stack** IA for customers.

---

## Desktop sidebar

With default `variant` (sidebar), clients get the **full six** primary links. That is the complete client IA on large screens.

---

## Auth routing

`src/components/auth/AuthRouter.tsx` maintains `protectedRoutes.client` and public routes. **Public** direct booking and guest views must stay reachable without login where product requires it.

---

## Native parity implication

A native **customer** app should implement:

1. **Bottom tabs** roughly aligned to: Home (dashboard), Sessions, Explore (marketplace), Messages, Profile — **plus** entry to **Goals**, **Exercises**, **Progress** (stack or More tab) because web hides some items from the header.
2. **Deep links** for `/marketplace`, `/book/:slug`, `/booking/view/:id`, `/review`.
3. **Same message route** semantics (`/client/messages` vs `/messages` can collapse to one stack on native).
