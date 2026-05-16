# Guest — messaging & notifications

Guests **do not** get the same in-app inbox as registered clients unless they later sign up and conversations are linked.

## Practitioner → guest email

| Piece                                                  | Role                                                                                                                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`supabase/functions/notify-guest-message/index.ts`** | When the recipient **`users.user_role`** is **`guest`**, sends email notification (guest must use **/login** or app signup to reply in-product — see function behaviour and templates). |

## Conversation bootstrap

| Piece                                                                   | Role                                                                                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **`supabase/migrations/20260306_get_or_create_guest_conversation.sql`** | **`get_or_create_guest_conversation`** — find/create guest user by email and ensure a conversation with the practitioner. |

## Native types

**`theramate-ios-client/lib/api/messages.ts`** — message shape may include **`guest_email`** for display/routing.

## Deeper product narrative

See **`docs/product/USER_TYPE_GUEST.md` §9** (email templates, linking after signup) and **`docs/features/messaging.md`** for platform-wide messaging.
