# Client — messaging, reviews & credits

## Messaging

### Web

| File                                  | Role                                                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`src/pages/messages/Messages.tsx`** | Wraps **`RealTimeMessaging`** (**`src/components/messaging/RealTimeMessaging.tsx`**) — conversation UI uses **`supabase.auth.getUser()`** for participant identity. |

### Native

| File                                                         | Role                                                                                                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **`app/(tabs)/messages/index.tsx`**, **`messages/[id].tsx`** | Client inbox / thread.                                                                                                |
| **`lib/api/messages.ts`**                                    | Conversations API (**`guest_email`** field still relevant when thread involved a guest email — usually post-linking). |

Platform-wide behaviour: **`docs/features/messaging.md`**.

## Reviews

| File                                     | Role                                                               |
| ---------------------------------------- | ------------------------------------------------------------------ |
| **`src/pages/reviews/SubmitReview.tsx`** | Client-oriented review submission (**`supabase.auth.getUser()`**). |
| **`src/pages/reviews/Reviews.tsx`**      | Reviews listing surface.                                           |

Native: **`app/(tabs)/profile/my-reviews.tsx`**, **`app/(tabs)/bookings/review.tsx`** (see [05-sessions-and-actions.md](./05-sessions-and-actions.md)).

## Credits

Native **`app/(tabs)/profile/credits.tsx`** — client credit balance / UX (aligned with **`docs/features/credit-system.md`** if present).
