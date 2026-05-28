# Booking System

The booking system allows clients to schedule therapy sessions with practitioners.

## Overview

The booking system handles:

- Availability management
- Session scheduling
- Calendar integration
- Recurring sessions
- Session lifecycle management

## Key Components

### Availability Manager

Practitioners set their working hours and available time slots.

### Booking Calendar

Clients view available slots and book sessions.

### Session Manager

Both parties manage session lifecycle and status.

## Database Schema

Key tables (high level — see [database-schema.md](../architecture/database-schema.md) for detail):

- `users` — identity, **`user_role`** (client vs therapist discipline), **`therapist_type`** (clinic / mobile / hybrid), locations, marketplace fields used in discovery
- `practitioner_availability` / generated slots — working hours and bookable time (paths vary by feature; see booking code)
- `practitioner_products` — services and pricing (`price_amount` in minor units)
- `client_sessions` — session bookings
- `therapist_profiles` — extended therapist row used by some flows (not the only source for marketplace cards; web/native list often composes from `users` in app code)

## User Flows

### For Practitioners

1. Set availability
2. View bookings
3. Confirm/cancel sessions
4. Update session status

### For Clients

1. Browse therapists
2. View availability
3. Book session
4. Manage bookings

## API Endpoints

See [API Documentation](../api/rest-api.md) for detailed endpoint documentation.

## Related Documentation

- [Booking System README](../../BOOKING_SYSTEM_README.md)
- [Database Schema](../architecture/database-schema.md)
