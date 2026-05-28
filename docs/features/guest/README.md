# Guest — feature documentation index

Context for **guest** users (`users.user_role = 'guest'`, sessions with `is_guest_booking = true`): identity, booking, token links, practitioner tools, native flows.

## Read order

| #   | Doc                                                                                  | What it covers                                           |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| 1   | [Identity & session model](./01-identity-and-session-model.md)                       | DB shape, RPCs, flags                                    |
| 2   | [Web clinic booking (guest mode)](./02-web-clinic-booking-guest-mode.md)             | `BookingFlow`, `ClientBooking`, marketplace lib          |
| 3   | [Mobile booking requests (primarily native)](./03-mobile-booking-requests-native.md) | Native mobile request + guest tracking screens           |
| 4   | [Guest view token & session lookup](./04-guest-view-token-and-session-lookup.md)     | `guest_view_token`, `get_session_by_guest_token`, emails |
| 5   | [Practitioner guest operations](./05-practitioner-guest-operations.md)               | Manual booking, diary labels, guest hub                  |
| 6   | [Messaging & notifications](./06-messaging-and-notifications.md)                     | Email to guests, edge functions                          |
| 7   | [Account linking & conversion](./07-account-linking-and-conversion.md)               | Guest → registered client (overview + pointers)          |

## Related docs

- [USER_TYPE_GUEST.md](../../product/USER_TYPE_GUEST.md) — detailed narrative (some paths may still show historical folder names; concepts align).
- [Client features](../client/README.md) — registered client flows (contrast).
- [GUEST_VS_CLIENT_RULES.md](../../development/GUEST_VS_CLIENT_RULES.md)
- [USER_TYPES_OVERVIEW.md](../../product/USER_TYPES_OVERVIEW.md)

## Maintenance

When guest behaviour changes, update the **smallest** file above first, then adjust [USER_TYPE_GUEST.md](../../product/USER_TYPE_GUEST.md) if product wording needs to stay in sync.
