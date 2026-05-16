# Guest — practitioner-facing operations

How **practitioners** create and recognise guest bookings (distinct from the guest’s own booking UX).

## Manual booking (new contact = guest user)

| Platform | File                                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Web      | **`src/pages/practice/ManualBooking.tsx`** — new contact → **`ensure_guest_user_for_booking`** → **`p_is_guest_booking: true`**. |
| Native   | **`theramate-ios-client/app/(practitioner)/(ptabs)/bookings/new.tsx`** — same RPC pattern.                                       |

## Lists and diary classification

| Platform | File                                                                     | Detail                                                                                                   |
| -------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Web      | **`src/pages/practice/UpcomingSessions.tsx`**                            | Surfaces **`is_guest_booking`** with a Guest badge.                                                      |
| Native   | **`theramate-ios-client/lib/api/practitionerSessions.ts`**               | **`getSessionDiaryCategory`** → **`"guest"`** when **`is_guest_booking === true`** (else client / peer). |
| Native   | **`theramate-ios-client/app/(practitioner)/(ptabs)/schedule/index.tsx`** | Diary filters/grouping use guest category for labels.                                                    |

## Guest hub (native)

| File                                                                    | Role                                                             |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **`theramate-ios-client/app/(practitioner)/(ptabs)/clients/guest.tsx`** | Dedicated guest contact UX from practitioner clients area.       |
| **`theramate-ios-client/app/(practitioner)/(ptabs)/clients/index.tsx`** | Navigation to **`clients/guest`**.                               |
| **`theramate-ios-client/lib/api/practitionerClients.ts`**               | Stable keys **`email:<normalized>`** for guest-only roster rows. |

## Public directory (unauthenticated book-by-slug)

Uses shared read helpers from **`theramate-ios-client/lib/api/guestBooking.ts`**:

- **`theramate-ios-client/app/book/[slug].tsx`**
- **`theramate-ios-client/app/therapist/[id]/public.tsx`**

These support marketing/direct links without full auth; booking still ties to guest or client flows downstream.
