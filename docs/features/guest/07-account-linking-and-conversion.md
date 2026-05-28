# Guest — account linking & conversion

When a guest **signs up** with the same email used for bookings/messages, sessions and conversations should attach to the new **`auth.uid()`** profile.

## Intended behaviour (summary)

- **`link_guest_sessions_to_user(email, new_user_id)`** — reassigns matching **`client_sessions`** to the new auth user.
- **`link_guest_conversations_to_user(email, new_user_id)`** — reassigns conversations that involved the guest row.

Defined in **`supabase/migrations/20260310100000_link_guest_sessions_and_conversations_to_user.sql`** (execute grants for **`authenticated`** / **`service_role`**).

- App callbacks after OAuth/email login may still call **`convert_guest_to_client_or_create_profile`** (or equivalent) when merging profiles — see **`docs/product/USER_TYPE_GUEST.md` §11**; implementation lives under repo-root **`src/`** (search auth callback / guest linking).

## Canonical detail

This repo’s **web** auth merge logic may live outside **`src/`** or under integration paths not exhaustively listed here.

When implementing changes, grep **`link_guest`** and **`convert_guest`** under **`supabase/migrations`** and auth callbacks in the package that handles login (web and/or **`theramate-ios-client`**).
