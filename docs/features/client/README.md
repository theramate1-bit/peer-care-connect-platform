# Client — feature documentation index

Context for **registered clients**: `users.user_role = 'client'`, `users.id = auth.uid()`, sessions with **`is_guest_booking`** false/unset. Full app flows (explore, book, pay, sessions, messages) without relying on guest magic links.

## Read order

| #   | Doc                                                                                  | What it covers                                                        |
| --- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 1   | [Identity & session model](./01-identity-and-session-model.md)                       | Role, flags, auth coupling                                            |
| 2   | [Web — discovery & clinic booking](./02-web-discovery-and-clinic-booking.md)         | `ClientBooking`, `BookingFlow` authenticated path                     |
| 3   | [Native — shell, explore & clinic booking](./03-native-shell-explore-and-booking.md) | `(tabs)`, explore, `app/booking/index`                                |
| 4   | [Mobile visit requests (signed-in client)](./04-mobile-requests-signed-in-client.md) | Native **authenticated** mobile request tracking vs guest email flows |
| 5   | [Sessions & actions](./05-sessions-and-actions.md)                                   | My bookings, cancel; web gaps                                         |
| 6   | [Profile, onboarding & settings](./06-profile-onboarding-and-settings.md)            | Client profile UX                                                     |
| 7   | [Messaging, reviews & credits](./07-messaging-reviews-and-credits.md)                | In-app comms and extras                                               |

## Related docs

- [USER_TYPE_CLIENT.md](../../product/USER_TYPE_CLIENT.md) — detailed narrative (verify file paths under repo-root `src/`).
- [GUEST_VS_CLIENT_RULES.md](../../development/GUEST_VS_CLIENT_RULES.md)
- [Guest features](../guest/README.md) — contrast with guest flows.
- [USER_TYPES_OVERVIEW.md](../../product/USER_TYPES_OVERVIEW.md)

## Maintenance

Update the **narrowest** doc when behaviour changes; refresh `USER_TYPE_CLIENT.md` if product wording must stay aligned.
