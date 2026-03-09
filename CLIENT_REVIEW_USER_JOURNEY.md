# Client Review User Journey

## Overview
This document outlines the complete user journey for how clients review practitioners on Theramate.

---

## Entry Points (How Clients Access Review Flow)

### 1. **From Completed Bookings (ClientBookings Page)**
- **Location**: `/client/bookings` or client bookings view
- **Trigger**: Booking status is `completed` or `paid` AND `has_review` is `false`
- **UI**: "Leave a Review" button appears below completed booking cards
- **Component**: `ClientBookings.tsx` (lines 194-206)
- **Flow**: Click button → Opens review dialog with `ServiceReviewForm`

```typescript
{(booking.status === 'completed' || booking.status === 'paid') && !booking.has_review && (
  <Button onClick={() => setReviewingBooking(booking)}>
    <Star className="h-4 w-4 mr-2" />
    Leave a Review
  </Button>
)}
```

### 2. **From Email Links**
- **Review Request Email**: Sent after session completion
  - Link format: `/review?session_id={sessionId}&email={email}`
  - Component: `ReviewRequestClient.tsx` email template
- **Booking Confirmation Email**: Includes review link
  - Link format: `/review?session_id={sessionId}&email={email}`
  - Component: `BookingConfirmationClient.tsx` email template

### 3. **Direct Navigation (SubmitReview Page)**
- **Route**: `/reviews/submit/:sessionId`
- **Component**: `SubmitReview.tsx`
- **Access**: Protected route (requires authentication)
- **Validation**:
  - Session must exist
  - Session status must be `completed`
  - Client must own the session
  - No existing review for this session

### 4. **Guest Review Flow**
- **Route**: `/review` (with query params)
- **Component**: `GuestReview.tsx`
- **Access**: Public (no authentication required)
- **Validation**: Uses email + session_id to verify eligibility

---

## Review Types

### 1. **Session Reviews** (`reviews` table)
- **For**: Completed `client_sessions`
- **Form**: `ReviewForm.tsx`
- **Fields**:
  - Overall rating (1-5 stars, **required**)
  - Detailed ratings (optional):
    - Professionalism
    - Effectiveness
    - Communication
    - Punctuality
  - Review text (min 10 characters, **required**)
  - Anonymous flag (optional)
- **Status**: Initially `pending`, can be `published` or `approved`

### 2. **Service Reviews** (`service_reviews` table)
- **For**: Marketplace bookings (`marketplace_bookings`)
- **Form**: `ServiceReviewForm.tsx`
- **Fields**:
  - Overall rating (1-5 stars, **required**)
  - Service quality rating (optional)
  - Value for money rating (optional)
  - Review title (optional, max 100 chars)
  - Review text (optional, max 1000 chars)
- **Status**: Auto-published (`published`)

### 3. **Private Ratings** (`practitioner_ratings` table)
- **For**: Internal feedback (not displayed publicly)
- **Component**: `PrivateRatingModal.tsx`
- **Access**: From `MySessions.tsx` or `ClientSessions.tsx`
- **Purpose**: Private feedback that doesn't appear in public reviews

---

## Review Submission Flow

### Step-by-Step Process

#### **For Authenticated Users (Session Reviews)**

1. **Access Review Form**
   - Navigate to `/reviews/submit/:sessionId` OR
   - Click "Leave a Review" from completed booking

2. **View Session Details**
   - Session information displayed in sidebar:
     - Therapist name
     - Session date
     - Time & duration
     - Session type
     - Price (if applicable)

3. **Fill Review Form** (`ReviewForm.tsx`)
   - **Overall Rating** (required):
     - Click stars (1-5)
     - Visual feedback on selection
   - **Detailed Ratings** (optional):
     - Professionalism
     - Effectiveness
     - Communication
     - Punctuality
   - **Review Text** (required):
     - Minimum 10 characters
     - Textarea with character count
   - **Anonymous Option**:
     - Checkbox to submit anonymously

4. **Validation**
   - Overall rating must be selected
   - Review text must be at least 10 characters
   - Form shows error messages if validation fails

5. **Submit Review**
   - Creates record in `reviews` table:
     ```typescript
     {
       session_id: sessionId,
       client_id: clientId,
       therapist_id: therapistId,
       overall_rating: overallRating,
       comment: reviewText,
       review_status: 'published', // or 'pending' for moderation
       is_verified_session: true
     }
     ```
   - Creates detailed ratings in `detailed_ratings` table (if provided)
   - Runs fraud detection check (`detect_review_fraud` RPC)
   - Sends notification to practitioner
   - Updates practitioner's average rating

6. **Post-Submission**
   - Success toast notification
   - Redirects to dashboard
   - Review appears in practitioner's profile

#### **For Service Reviews (Marketplace Bookings)**

1. **Access Review Form**
   - From `ClientBookings.tsx` page
   - Click "Leave a Review" on completed booking

2. **Fill Review Form** (`ServiceReviewForm.tsx`)
   - **Overall Rating** (required): 1-5 stars
   - **Service Quality** (optional): 1-5 stars
   - **Value for Money** (optional): 1-5 stars
   - **Review Title** (optional): Max 100 characters
   - **Review Text** (optional): Max 1000 characters

3. **Submit Review**
   - Creates record in `service_reviews` table
   - Updates booking: `has_review = true`
   - Success notification

---

## Review Display

### Where Reviews Appear

#### 1. **Practitioner Profiles**
- **Component**: `ReviewsSection.tsx`
- **Location**: Practitioner profile pages
- **Shows**:
  - Average rating (calculated from published reviews)
  - Total review count
  - Individual review cards with:
    - Client name (or "Anonymous")
    - Star rating
    - Review title (if provided)
    - Review comment
    - Date posted

#### 2. **Marketplace**
- **Component**: `Marketplace.tsx`
- **Shows**:
  - Average rating next to practitioner name
  - Total reviews count
  - Star display
- **Real-time Updates**: Subscribes to review changes

#### 3. **Public Therapist Profiles**
- **Component**: `PublicTherapistProfile.tsx`
- **Tab**: "Reviews" tab
- **Shows**: All published reviews for the practitioner

#### 4. **Reviews Page**
- **Route**: `/reviews`
- **Component**: `Reviews.tsx`
- **Shows**: All reviews received by the logged-in practitioner
- **Filters**: All, Published, Pending, Rejected

---

## Review Status Flow

```
Submitted → Pending → Published/Approved
                ↓
            Rejected (if flagged)
```

- **Pending**: Initial status, awaiting moderation
- **Published**: Auto-published (for service reviews) or after moderation
- **Approved**: Manually approved by admin
- **Rejected**: Flagged by fraud detection or moderation

---

## Key Features

### 1. **Fraud Detection**
- RPC function: `detect_review_fraud`
- Checks for suspicious patterns
- Flags reviews for manual review if needed

### 2. **Rating Aggregation**
- Practitioner's `average_rating` updated automatically via database triggers
- Calculated from all published reviews
- Displayed in:
  - Marketplace listings
  - Practitioner profiles
  - Search results

### 3. **Real-time Updates**
- Marketplace subscribes to review changes
- Ratings update automatically when new reviews are published

### 4. **Verification**
- `is_verified_session`: True for reviews from actual bookings
- Helps distinguish verified vs. unverified reviews

### 5. **Anonymous Reviews**
- Clients can choose to submit anonymously
- Name shown as "Anonymous" in public display

---

## Database Schema

### `reviews` Table
- `id`: UUID
- `session_id`: UUID (FK to `client_sessions`)
- `client_id`: UUID (FK to `users`)
- `therapist_id`: UUID (FK to `users`)
- `overall_rating`: Integer (1-5)
- `title`: String (optional)
- `comment`: Text
- `is_anonymous`: Boolean
- `review_status`: Enum ('pending', 'published', 'approved', 'rejected')
- `is_verified_session`: Boolean
- `created_at`: Timestamp

### `service_reviews` Table
- `id`: UUID
- `booking_id`: UUID (FK to `marketplace_bookings`)
- `product_id`: UUID (FK to `practitioner_products`)
- `practitioner_id`: UUID (FK to `users`)
- `client_id`: UUID (FK to `users`)
- `overall_rating`: Integer (1-5)
- `service_quality`: Integer (1-5, optional)
- `value_for_money`: Integer (1-5, optional)
- `review_title`: String (optional)
- `review_text`: Text (optional)
- `review_status`: Enum ('published', 'pending', 'rejected')
- `created_at`: Timestamp

### `detailed_ratings` Table
- `id`: UUID
- `review_id`: UUID (FK to `reviews`)
- `rating_type`: Enum ('professionalism', 'effectiveness', 'communication', 'punctuality')
- `rating_value`: Integer (1-5)

---

## Current Gaps / Missing Features

1. **MyBookings Page**: No review button visible in history tab (lines 626-656)
   - Completed bookings show "Session completed" but no review CTA
   - Should add "Leave Review" button for completed sessions

2. **Review Reminders**: No automated follow-up if review not submitted
   - Could add scheduled reminders after session completion

3. **Review Editing**: No ability to edit submitted reviews
   - Users cannot modify reviews after submission

4. **Review Replies**: Practitioners cannot respond to reviews
   - No public response feature

5. **Review Helpfulness**: No "helpful" voting system (though code exists in `ReviewSystem.tsx`)
   - `voteReview` function exists but may not be fully integrated

---

## Recommendations

1. **Add Review Button to MyBookings History**
   - Show "Leave Review" button for completed bookings without reviews
   - Link to `/reviews/submit/:sessionId`

2. **Improve Review Discovery**
   - Add review prompts in booking confirmation modals
   - Show review CTA in booking success page

3. **Review Reminders**
   - Email reminder 24-48 hours after session completion
   - In-app notification for pending reviews

4. **Review Analytics**
   - Show practitioners their review trends
   - Highlight areas for improvement based on detailed ratings
