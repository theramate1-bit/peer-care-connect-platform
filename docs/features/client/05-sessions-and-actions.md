# Client — sessions & actions

## Native — list, detail, cancel

| File                                 | Role                                                                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`app/(tabs)/bookings/index.tsx`**  | Client’s sessions list.                                                                                                                               |
| **`app/(tabs)/bookings/[id].tsx`**   | Detail; **`fetchClientSessionById`**, **`cancelClientSession`** (**`lib/api/clientSessions.ts`**); messaging entry via **`getOrCreateConversation`**. |
| **`app/(tabs)/bookings/review.tsx`** | Post-session review flow hook-up.                                                                                                                     |

## Web (`src/`)

**Cancel / reschedule** components exist for **practitioner** views:

- **`src/components/booking/CancelSessionButton.tsx`**
- **`src/components/booking/RescheduleSessionButton.tsx`**

…wired from **`src/pages/practice/UpcomingSessions.tsx`**, not from a client **`/client/sessions`** page in this repo snapshot.

**Gap:** If product requires client-side cancel/reschedule on web, add routes + reuse RPC patterns from native **`clientSessions`** or shared Supabase RPCs.

## Data access pattern

**`lib/api/clientSessions.ts`** — **`fetchClientSessions(clientId)`**, row scoped by **`client_id`** and auth expectations enforced via RLS / queries.
