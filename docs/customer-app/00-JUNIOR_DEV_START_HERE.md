# Start here — customer app (for junior developers)

Read this **once** before diving into the numbered docs. It explains **what this folder is for**, **how the pieces fit together**, and **what to read in what order**.

**Already comfortable?** Jump to [`21-DEVELOPER_QUICKSTART_CUSTOMER_MOBILE.md`](21-DEVELOPER_QUICKSTART_CUSTOMER_MOBILE.md) to run code.

---

## 1. What is the “customer app”?

**Customer** = people who **book therapy** or **browse practitioners** — not the therapist side of the product.

| Who        | Meaning                                          | Example                                                         |
| ---------- | ------------------------------------------------ | --------------------------------------------------------------- |
| **Client** | Someone with a **logged-in account** as a client | Uses `/client/dashboard`, `/client/sessions`, etc.              |
| **Guest**  | Someone **without** (or before) a full login     | Opens a link to book, finds a booking by email, leaves a review |

This folder documents **both**. It does **not** document the **practitioner** app (diary, practice management, credits admin). If you work on therapist screens, use the main product inventory, not this folder.

---

## 2. Two codebases you will touch

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   peer-care-connect     │         │   theramate-ios-client   │
│   (web — React + Vite)  │         │   (mobile — Expo)        │
│                         │         │                         │
│   “Source of truth”     │  match  │   Build native UI here  │
│   for routes + behavior │ ──────► │   to same rules + APIs  │
└─────────────────────────┘         └─────────────────────────┘
              │                                    │
              └──────────── Supabase ──────────────┘
                    (same database + auth)
```

- **Web** is where most customer flows **already work**. Your job on mobile is usually: **same data, same rules**, UI can look native.
- **Native (Theramate)** lives under `theramate-ios-client/` only. Repo-root `customer-app/` is a different app (Localito) — see [`10-TWO_NATIVE_CODEBASES.md`](10-TWO_NATIVE_CODEBASES.md).

---

## 3. Words that trip people up

Skim [`GLOSSARY.md`](GLOSSARY.md). In short:

| Term               | Plain meaning                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------- |
| **Parity**         | Mobile should **behave like web** (validation, API calls, permissions), not copy every pixel. |
| **RLS**            | Database rules: “who can read this row?” — **same** for web and app.                          |
| **Edge Function**  | Server code on Supabase (payments, email). App calls it; **secrets stay on server**.          |
| **Deep link**      | A URL that **opens your app** (e.g. from email: “view your booking”).                         |
| **Direct booking** | Link like `/book/some-practitioner-slug` — books **that** therapist.                          |

---

## 4. What to read (order matters)

Do **steps 1–5** before picking up a large ticket. Add **6–8** when you work on that area.

| Step | Doc                                                                                                  | Why                                                            |
| ---- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1    | [`21-DEVELOPER_QUICKSTART_CUSTOMER_MOBILE.md`](21-DEVELOPER_QUICKSTART_CUSTOMER_MOBILE.md)           | Install, run web + Expo, env vars.                             |
| 2    | [`16-MOBILE_SCREENS_BUILD_LIST.md`](16-MOBILE_SCREENS_BUILD_LIST.md)                                 | **Master backlog** — what screens exist and **P0 vs P1**.      |
| 3    | [`05-PARITY_MATRIX.md`](05-PARITY_MATRIX.md)                                                         | Simple table: **web route ↔ native** — what’s done vs missing. |
| 4    | [`13-NATIVE_SCREENS_IMPLEMENTATION_STATUS.md`](13-NATIVE_SCREENS_IMPLEMENTATION_STATUS.md)           | **Mocks vs real data** — don’t assume Explore is wired up.     |
| 5    | [`24-SCREEN_WIREFRAMES_AND_LAYOUTS.md`](24-SCREEN_WIREFRAMES_AND_LAYOUTS.md)                         | Tabs, booking flow, **ASCII layouts** (how screens connect).   |
| 6    | [`02-GUEST_AND_PUBLIC_FLOWS.md`](02-GUEST_AND_PUBLIC_FLOWS.md)                                       | Public URLs + auth URLs (for deep linking).                    |
| 7    | [`08-GUEST_VS_CLIENT_PRODUCT_RULES.md`](08-GUEST_VS_CLIENT_PRODUCT_RULES.md)                         | Rules when product says “guest” vs “client”.                   |
| 8    | [`23-OAUTH_DEEP_LINKS_IMPLEMENTATION_CHECKLIST.md`](23-OAUTH_DEEP_LINKS_IMPLEMENTATION_CHECKLIST.md) | Login with Google/Apple + return to app.                       |

**Booking logic (important):** authenticated clinic booking order is documented in [`../features/booking-flows-reference.md`](../features/booking-flows-reference.md). Guest booking is a **different** step order — see §2 there.

---

## 5. When you get a ticket

1. Find the feature in **16** (screen name) and **05** (parity row).
2. On web, find the route in [`01-WEB_ROUTES.md`](01-WEB_ROUTES.md) or guest paths in **02**.
3. Read the detailed web behavior in [`11-SCREEN_BY_SCREEN_WEB_CLIENT.md`](11-SCREEN_BY_SCREEN_WEB_CLIENT.md) if it is a `/client/*` screen.
4. Check **13** so you know if you are replacing **mock** data.
5. For UI consistency, use [`18-MOBILE_UI_UX_FOUNDATIONS_BMAD.md`](18-MOBILE_UI_UX_FOUNDATIONS_BMAD.md).
6. If stuck on “what’s missing overall,” see [`17-DOCUMENTATION_GAPS_AND_TRACKER.md`](17-DOCUMENTATION_GAPS_AND_TRACKER.md).

---

## 6. Don’t confuse these

| Wrong assumption                                | Reality                                                                                                                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “Native should copy the **web hamburger menu**” | Web **hides** some client links on small screens. Native should use **full tabs** — see [`12-NAVIGATION_SHELL_AND_ENTRY_POINTS.md`](12-NAVIGATION_SHELL_AND_ENTRY_POINTS.md). |
| “Booking is always the same steps”              | **Logged-in client** vs **guest** flows differ — see booking-flows reference.                                                                                                 |
| “I only need the anon key”                      | Payments and sensitive actions go through **Edge Functions** / server; you still **never** put secret keys in the app.                                                        |

---

## 7. Revision

| Date       | Change                         |
| ---------- | ------------------------------ |
| 2026-03-26 | First version — junior on-ramp |
