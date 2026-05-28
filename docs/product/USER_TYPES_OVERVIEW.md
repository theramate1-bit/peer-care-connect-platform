# User types: Guest, Client, Practitioner — canonical overview

Use this file as the **entry point** when you need to remember how bookers and providers differ. Deep dives stay in linked docs; implementation paths below match **this repository** (`src/`, `theramate-ios-client/`, `supabase/`).

---

## One-line definitions

| Type             | Who they are                                              | Auth                                      | Typical `users.user_role`                                                                                       | Session flag                                                                  |
| ---------------- | --------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Guest**        | Books or is contacted **without** registering             | No Supabase session tied to that identity | `guest`                                                                                                         | `client_sessions.is_guest_booking = true`; `client_id` → guest row in `users` |
| **Client**       | Registered booker                                         | Yes (`users.id = auth.uid()`)             | `client`                                                                                                        | `is_guest_booking` false / unset                                              |
| **Practitioner** | Therapist offering services (diary, payouts, practice UI) | Yes                                       | `sports_therapist`, `massage_therapist`, `osteopath`, sometimes `practitioner` during onboarding (see app code) | They appear as `therapist_id` on sessions, not as “guest/client booker”       |

**Not the same axis:** “Practitioner **type**” (`clinic_based` / `mobile` / `hybrid`) describes **how** a practitioner works, not whether someone is a guest vs client. See [PRACTITIONER_TYPE_CLINIC_BASED.md](./PRACTITIONER_TYPE_CLINIC_BASED.md) and related files.

---

## Behaviour differences (product-level)

- **Guest:** Created via RPCs such as `ensure_guest_user_for_booking` / guest upsert patterns; views booking via **token/email links**; no full “My Sessions” app experience unless they later sign up and sessions are linked by email.
- **Client:** Uses authenticated flows (`BookingFlow` without guest mode, client routes); **My Sessions**, in-app messaging, profile tied to auth.
- **Practitioner:** Practice dashboard, diary, manual bookings, Stripe Connect, subscriptions (where enforced); sees sessions labelled Guest vs Client using **`is_guest_booking`**, not by guessing from missing profile.

Rules for engineers: [GUEST_VS_CLIENT_RULES.md](../development/GUEST_VS_CLIENT_RULES.md).

---

## Documentation map (read in this order)

| Topic                                                           | Doc                                                                               |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Guest — feature-by-feature (web + native paths)**             | [features/guest/README.md](../features/guest/README.md)                           |
| Guest touchpoints (detailed narrative; verify paths in `src/`)  | [USER_TYPE_GUEST.md](./USER_TYPE_GUEST.md)                                        |
| **Client — feature-by-feature (web + native paths)**            | [features/client/README.md](../features/client/README.md)                         |
| **Practitioner types — clinic, mobile, hybrid**                 | [features/practitioner-types/README.md](../features/practitioner-types/README.md) |
| Client touchpoints (detailed narrative; verify paths in `src/`) | [USER_TYPE_CLIENT.md](./USER_TYPE_CLIENT.md)                                      |
| Side-by-side table + gaps                                       | [GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md](./GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md)  |
| Diary/session labels                                            | [Diary overview](../features/diary-overview.md)                                   |
| **BMAD planning shards** (backlog, architecture, epics 1–12)    | [Planning artifacts README](../../_bmad-output/planning-artifacts/README.md)      |

**Path disclaimer:** Older deep-dive docs may still show historical **`peer-care-connect/src/...`** paths. In **this** repo the web app lives under **`src/`** at the repository root; treat stale paths as **conceptual** and grep under `src/` for current filenames.

---

## Implementation files (this repo)

### Web (`src/`)

| Concern                                     | Files (representative)                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Guest vs logged-in booking                  | `src/components/booking/BookingFlow.tsx` (`guestMode`, `ensure_guest_user_for_booking`, `p_is_guest_booking`) |
| Client booking entry                        | `src/pages/client/ClientBooking.tsx` (`guest=1` query toggles guest mode on shared flow)                      |
| Marketplace / booking orchestration         | `src/lib/clientMarketplaceBooking.ts`                                                                         |
| Practitioner manual booking (guest contact) | `src/pages/practice/ManualBooking.tsx`                                                                        |
| Practitioner upcoming list / Guest badge    | `src/pages/practice/UpcomingSessions.tsx`                                                                     |

### Mobile (`theramate-ios-client/`)

| Concern                                   | Files (representative)                                       |
| ----------------------------------------- | ------------------------------------------------------------ |
| Practitioner type → clinic vs mobile CTAs | `app/(tabs)/explore/[id].tsx`, `app/booking/choose-mode.tsx` |
| Client vs practitioner portal roles       | `lib/authRoles.ts`, `hooks/useAuth.ts`, stores               |
| Session row → label “guest” vs “client”   | `lib/api/practitionerSessions.ts` (`is_guest_booking`)       |
| Manual / new booking flags                | `app/(practitioner)/(ptabs)/bookings/new.tsx`                |
| Guest hub / guest client UX               | `app/(practitioner)/(ptabs)/clients/guest.tsx`               |

### Supabase (`supabase/`)

| Concern             | Files / areas                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| Guest user by email | `migrations/20260416120000_cash_bookings_v1_gap_closure.sql` → `ensure_guest_user_for_booking`, tokens |
| Guest conversations | `migrations/20260306_get_or_create_guest_conversation.sql`                                             |
| Guest messaging     | `functions/notify-guest-message/index.ts`                                                              |

---

## Keeping docs organised

1. **Start here** (`USER_TYPES_OVERVIEW.md`) for definitions + file pointers.
2. **Guest vs client product detail:** `USER_TYPE_*` + `GUEST_VS_CLIENT_*`.
3. **Practitioner types (`therapist_type`):** [features/practitioner-types/](../features/practitioner-types/README.md) + deeper **`PRACTITIONER_TYPE_*.md`** + practice features under `docs/features/` (diary, dashboard).
4. When updating behaviour, **update the smallest focused doc** (feature doc or user-type doc) and add one line to this overview only if a **new top-level area** appears (e.g. new surface like SMS booking).

---

**Last updated:** 2026-05-03
