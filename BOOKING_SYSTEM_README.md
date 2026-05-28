# 🗓️ Booking System - Complete Implementation

## Overview

The Peer Care Connect booking system provides a comprehensive solution for managing therapy sessions between clients and therapists. This system handles the complete lifecycle from availability management to session completion.

## 🏗️ System Architecture

### Core Components

1. **AvailabilityManager** - Therapists set their working hours and available time slots
2. **BookingCalendar** - Clients view available slots and book sessions
3. **SessionManager** - Both parties manage session lifecycle and status
4. **BookingDashboard** - Central hub for all booking-related activities

### Database Schema

The system uses the following key tables:

- `availability_slots` - Therapist working hours and available time slots
- `client_sessions` - Session bookings and management
- `therapist_profiles` - Therapist information and rates
- `client_profiles` - Client information and preferences

## 🚀 Features

### For Therapists

#### Availability Management

- Set working days and hours
- Configure session durations
- Mark specific slots as available/unavailable
- Real-time availability updates

#### Session Management

- View all client sessions
- Update session status (scheduled → confirmed → in progress → completed)
- Add session notes and observations
- Cancel or reschedule sessions
- Track payment status

#### Dashboard Features

- Overview of today's schedule
- Quick statistics (total sessions, revenue, etc.)
- Recent activity feed
- Quick action buttons

### For Clients

#### Booking Process

- Browse therapist availability
- Select preferred date and time
- Choose session duration
- Add session notes and requirements
- Complete payment to confirm booking

#### Session Management

- View upcoming sessions
- Track session status
- Access session history
- Manage session preferences

## 📱 User Interface

### Availability Manager

```
┌─────────────────────────────────────────────────────────┐
│ 📅 Manage Your Availability                            │
│ Set your working hours and available time slots       │
├─────────────────────────────────────────────────────────┤
│ Default Session Duration: [60 min ▼] [💾 Save]        │
├─────────────────────────────────────────────────────────┤
│ 📊 Stats: 5 Working Days | 48 Total Slots | 42 Available │
├─────────────────────────────────────────────────────────┤
│ [✓] Monday  9:00 AM - 5:00 PM  [8 slots]             │
│ [✓] Tuesday 9:00 AM - 5:00 PM  [8 slots]             │
│ [✓] Wednesday 9:00 AM - 5:00 PM [8 slots]            │
│ [ ] Thursday  [Set Hours]                             │
│ [ ] Friday    [Set Hours]                             │
└─────────────────────────────────────────────────────────┘
```

### Booking Calendar

```
┌─────────────────────────────────────────────────────────┐
│ 🗓️ Book with Dr. Sarah Johnson                        │
│ 📍 London, UK | 🕐 £80/hour | ✅ Verified             │
├─────────────────────────────────────────────────────────┤
│ 📅 Select Date          │ 🕐 Select Time              │
│ [Calendar Widget]       │ Duration: [60 min ▼]        │
│                         │                             │
│                         │ [09:00] [09:30] [10:00]    │
│                         │ [10:30] [11:00] [11:30]    │
│                         │ [14:00] [14:30] [15:00]    │
├─────────────────────────────────────────────────────────┤
│ Session Details                                         │
│ Type: [Initial Consultation ▼] Notes: [Text Area]     │
│ 💰 Session Summary: £80.00 (60 min)                   │
│ [Book Session - £80.00]                                │
└─────────────────────────────────────────────────────────┘
```

### Session Manager

```
┌─────────────────────────────────────────────────────────┐
│ 🕐 Session Management                                  │
│ Manage your client sessions and appointments           │
├─────────────────────────────────────────────────────────┤
│ Filters: [All Statuses ▼] [Date: 📅]                  │
├─────────────────────────────────────────────────────────┤
│ 📊 Stats: 12 Total | 8 Completed | 3 Upcoming | 1 Pending │
├─────────────────────────────────────────────────────────┤
│ John Smith                                             │
│ 🏷️ [Scheduled] [Payment: Pending]                     │
│ 📅 Dec 25, 2024 | 🕐 2:00 PM (60 min) | 📍 Location TBD │
│ 📧 john@example.com | 📱 +44 123 456 789 | 💰 £80      │
│ 📝 Client Notes: Looking for sports therapy...        │
│ [✅ Confirm] [❌ Cancel] [✏️ Manage]                    │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Technical Implementation

### Component Structure

```
src/components/booking/
├── AvailabilityManager.tsx      # Therapist availability management
├── BookingCalendar.tsx          # Client booking interface
├── SessionManager.tsx           # Session lifecycle management
└── BookingDashboard.tsx         # Main dashboard integration

src/pages/booking/
└── BookingDashboard.tsx         # Main booking page
```

### Key Functions

#### Availability Management

- `generateTimeSlots()` - Creates time slots based on working hours
- `saveAvailability()` - Persists availability to database
- `toggleSlotAvailability()` - Marks slots as available/unavailable

#### Booking Process

- `fetchAvailableSlots()` - Retrieves available time slots
- `handleBooking()` - Creates session and payment
- `calculatePrice()` - Computes session cost based on duration

#### Session Management

- `updateSessionStatus()` - Changes session status
- `updateSessionNotes()` - Adds therapist notes
- `cancelSession()` - Cancels scheduled sessions

### Database Operations

#### Availability Slots

```sql
-- Create availability slot
INSERT INTO availability_slots (
  therapist_id, day_of_week, start_time, end_time,
  duration_minutes, is_available
) VALUES (?, ?, ?, ?, ?, ?);

-- Fetch therapist availability
SELECT * FROM availability_slots
WHERE therapist_id = ? AND day_of_week = ? AND is_available = true;
```

#### Client Sessions

```sql
-- Create new session
INSERT INTO client_sessions (
  therapist_id, client_name, client_email, session_date,
  start_time, duration_minutes, session_type, price,
  notes, status, payment_status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- Update session status
UPDATE client_sessions
SET status = ?, updated_at = NOW()
WHERE id = ?;
```

## 🧪 Testing

### Test Suite

Run the complete booking system test suite:

```bash
node test-scripts/test-booking-system.js
```

### Test Coverage

The test suite covers:

- ✅ Database connection and schema
- ✅ User and profile creation
- ✅ Availability management
- ✅ Session creation and management
- ✅ Complete booking flow
- ✅ Data validation
- ✅ Cleanup and error handling

### Manual Testing

1. **Therapist Flow**
   - Navigate to `/booking`
   - Set availability in the Availability tab
   - View and manage sessions in the Sessions tab

2. **Client Flow**
   - Navigate to `/booking`
   - View upcoming sessions
   - Use Find Therapists page to book new sessions

## 🚀 Getting Started

### Prerequisites

- Supabase project with required tables
- User authentication system
- Payment integration (Stripe)
- Required environment variables

### Installation

1. **Add the booking route to your App.tsx:**

```tsx
import BookingDashboard from "./pages/booking/BookingDashboard";

// Add to your routes
<Route
  path="/booking"
  element={
    <ProtectedRoute>
      <BookingDashboard />
    </ProtectedRoute>
  }
/>;
```

2. **Ensure database tables exist:**

```sql
-- Run the availability_slots migration
-- Run the client_sessions migration
-- Ensure RLS policies are in place
```

3. **Set up environment variables:**

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Usage

#### For Therapists

1. Navigate to `/booking`
2. Go to the Availability tab
3. Set your working days and hours
4. Configure session durations
5. Save your availability schedule
6. Use the Sessions tab to manage bookings

#### For Clients

1. Navigate to `/booking`
2. Use the Find Therapists page to discover therapists
3. Select a therapist and view their availability
4. Choose date, time, and session type
5. Complete payment to confirm booking
6. View upcoming sessions in the Sessions tab

## 🔒 Security & Permissions

### Row Level Security (RLS)

The system implements comprehensive RLS policies:

```sql
-- Therapists can only manage their own availability
CREATE POLICY "Therapists can manage their availability"
ON availability_slots FOR ALL
USING (auth.uid() = therapist_id);

-- Clients can only view their own sessions
CREATE POLICY "Clients can view their own sessions"
ON client_sessions FOR SELECT
USING (auth.uid() = client_id);
```

### Data Validation

- Session dates must be in the future
- Time slots must be within working hours
- Duration must be positive
- Prices must be non-negative
- Required fields validation

## 📊 Performance Considerations

### Database Indexing

```sql
-- Index for availability queries
CREATE INDEX idx_availability_slots_therapist_day
ON availability_slots(therapist_id, day_of_week);

-- Index for session queries
CREATE INDEX idx_client_sessions_therapist_date
ON client_sessions(therapist_id, session_date);
```

### Caching Strategy

- Availability slots cached for 5 minutes
- Session data cached for 2 minutes
- Real-time updates via Supabase subscriptions

## 🚨 Error Handling

### Common Error Scenarios

1. **No Available Slots**
   - Graceful fallback with helpful message
   - Suggestion to try different dates/times

2. **Booking Conflicts**
   - Real-time validation
   - Clear error messages
   - Alternative slot suggestions

3. **Payment Failures**
   - Session creation without payment
   - Retry mechanisms
   - Clear status indicators

### Error Recovery

- Automatic retry for transient failures
- Graceful degradation for non-critical features
- Comprehensive error logging and monitoring

## 🔮 Future Enhancements

### Planned Features

1. **Advanced Scheduling**
   - Recurring sessions
   - Block booking
   - Waitlist management

2. **Integration Features**
   - Calendar sync (Google, Outlook)
   - SMS/Email reminders
   - Video conferencing integration

3. **Analytics & Reporting**
   - Booking trends
   - Revenue analytics
   - Client retention metrics

4. **Mobile Optimization**
   - Progressive Web App (PWA)
   - Mobile-specific UI components
   - Push notifications

## 📚 API Reference

### Availability Endpoints

```typescript
// Get therapist availability
GET /availability_slots?therapist_id={id}&day_of_week={day}

// Update availability
PUT /availability_slots/{id}
Body: { is_available: boolean, start_time: string, end_time: string }

// Delete availability
DELETE /availability_slots/{id}
```

### Session Endpoints

```typescript
// Create new session
POST /client_sessions
Body: { therapist_id, client_name, session_date, start_time, duration_minutes, ... }

// Update session status
PATCH /client_sessions/{id}
Body: { status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled' }

// Get therapist sessions
GET /client_sessions?therapist_id={id}&status={status}
```

## 🤝 Contributing

### Development Guidelines

1. **Code Style**
   - Use TypeScript for all components
   - Follow React hooks best practices
   - Implement proper error boundaries

2. **Testing**
   - Write unit tests for utility functions
   - Integration tests for component interactions
   - End-to-end tests for user flows

3. **Documentation**
   - Update this README for new features
   - Document API changes
   - Add inline code comments

### Testing Your Changes

```bash
# Run the booking system tests
npm run test:booking

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## 📞 Support

### Getting Help

1. **Documentation**: Check this README and inline code comments
2. **Issues**: Create GitHub issues for bugs or feature requests
3. **Discussions**: Use GitHub discussions for questions and ideas

### Common Issues

1. **Availability not showing**
   - Check if therapist has set availability
   - Verify timezone settings
   - Check RLS policies

2. **Booking not working**
   - Verify payment integration
   - Check session validation rules
   - Ensure database permissions

3. **Performance issues**
   - Check database indexes
   - Monitor query performance
   - Verify caching implementation

---

## 🎯 Summary

The Peer Care Connect booking system provides a robust, scalable solution for managing therapy sessions. With comprehensive features for both therapists and clients, real-time updates, and strong security measures, it creates a seamless booking experience that supports the growth of your therapy marketplace.

**Key Benefits:**

- ✅ Complete session lifecycle management
- ✅ Real-time availability updates
- ✅ Secure payment integration
- ✅ Comprehensive user management
- ✅ Scalable architecture
- ✅ Extensive testing coverage

For questions or contributions, please refer to the project documentation or create an issue in the repository.
