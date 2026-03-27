# Messaging – Feature Overview

**Audience:** Junior developers

**Messaging** lets practitioners and clients (or guests) exchange messages. Practitioners can message from session details or client management. Clients use an in-app inbox. Guests receive **email** notifications with a login link (they cannot reply in-app until they sign up).

---

## What is Messaging?

Messaging is implemented as:

- **Conversations** (`conversations` table) – One row per pair (or practitioner + guest email)
- **Messages** (`messages` table) – Encrypted content, linked to conversation
- **RealTimeMessaging** – UI for conversation list and message thread
- **MessagingManager** – Service for get/send, guest linking

---

## Key Components & Files

| Component / File         | Role                                             |
| ------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **RealTimeMessaging**    | `src/components/messaging/RealTimeMessaging.tsx` | Inbox UI; conversation list + thread                                                                            |
| **MessagingManager**     | `src/lib/messaging.ts`                           | getOrCreateConversation, sendMessage, sendMessageToGuest, linkGuestSessionsToUser, linkGuestConversationsToUser |
| **notify-guest-message** | Edge Function                                    | Sends email when practitioner messages a guest                                                                  |

---

## User Sequence: Practitioner → Client (Registered)

```mermaid
sequenceDiagram
    participant Practitioner
    participant App
    participant MessagingManager
    participant DB
    participant Client

    Practitioner->>App: Send message from session/client view
    App->>MessagingManager: sendMessageToUser(practitionerId, clientId, content)
    MessagingManager->>DB: get_or_create_conversation
    MessagingManager->>DB: send_message RPC
    DB->>DB: INSERT messages
    DB-->>MessagingManager: messageId
    App->>Client: Realtime: new message in inbox
    Client->>App: Open messages; reply in-app
```

---

## User Sequence: Practitioner → Guest

```mermaid
sequenceDiagram
    participant Practitioner
    participant App
    participant MessagingManager
    participant DB
    participant NotifyGuest
    participant Guest

    Practitioner->>App: Send message to guest (by email)
    App->>MessagingManager: sendMessageToGuest(practitionerId, guestEmail, content)
    MessagingManager->>DB: get_or_create_guest_conversation
    MessagingManager->>DB: send_message RPC
    MessagingManager->>NotifyGuest: sendGuestMessageNotification
    NotifyGuest->>Guest: Email (message_notification_guest, link=/login)
    Note over Guest: Guest has no inbox; must sign up to reply
```

---

## Practitioner → Client (Registered)

1. Practitioner sends message from session/client view
2. `MessagingManager.sendMessageToUser(practitionerId, clientId, content)` or equivalent
3. Message stored in `messages`; conversation updated
4. Client sees message in app inbox (RealTimeMessaging)
5. Client can reply in-app

---

## Practitioner → Guest

1. Practitioner sends message to a guest (identified by email)
2. `MessagingManager.sendMessageToGuest(practitionerId, guestEmail, content)`
3. If guest has a `users` row (created for booking), use normal flow
4. Otherwise: `get_or_create_guest_conversation` RPC creates/gets conversation with `guest_email`
5. Message stored; **email** sent via `notify-guest-message` (template `message_notification_guest`)
6. Email link → `/login` (guest must sign up to reply)
7. Guest has no in-app inbox until they create an account

---

## Guest → Client Conversion (Linking)

When a guest signs up:

- **AuthCallback** calls `MessagingManager.linkGuestSessionsToUser(email, userId)` → RPC `link_guest_sessions_to_user`
- **AuthCallback** calls `MessagingManager.linkGuestConversationsToUser(email, userId)` → RPC `link_guest_conversations_to_user`

Sessions and conversations with that email are reassigned to the new user id. The new client then sees prior guest messages in their inbox.

---

## RPCs

| RPC                                | Purpose                                                 |
| ---------------------------------- | ------------------------------------------------------- |
| `get_or_create_conversation`       | Create or fetch conversation between two users          |
| `get_or_create_guest_conversation` | Create or fetch practitioner + guest_email conversation |
| `get_user_conversations`           | List conversations for a user                           |
| `get_conversation_messages`        | Messages in a conversation                              |
| `send_message`                     | Insert message                                          |
| `mark_messages_as_read`            | Mark messages as read                                   |
| `link_guest_sessions_to_user`      | Reassign guest sessions to new user (on signup)         |
| `link_guest_conversations_to_user` | Reassign guest conversations to new user (on signup)    |

---

## Encryption

Messages use `encrypted_content` and `content_hash`. Decryption/display is handled in the RPC or client layer.

---

## In-Depth: Guest vs Client Path Decision

```typescript
// Conceptual logic in sendMessageToGuest
if (guestUser exists for email) {
  // Guest has users row (from prior booking) → use normal flow
  return sendMessageToUser(practitionerId, guestUser.id, content);
} else {
  // No user → get_or_create_guest_conversation (guest_email)
  // Send message, then trigger email via notify-guest-message
}
```

The Edge Function `notify-guest-message` checks `user_role === 'guest'` to send email; registered clients get in-app notification only.

---

## Related Docs

- [USER_TYPE_GUEST](../product/USER_TYPE_GUEST.md) – Guest messaging, email, account conversion
- [USER_TYPE_CLIENT](../product/USER_TYPE_CLIENT.md) – Client messaging
- [GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE](../product/GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md)
- [Database Schema](../architecture/database-schema.md) – `conversations`, `messages`

---

**Last Updated:** 2026-03-15
