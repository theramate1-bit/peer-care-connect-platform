# Theramate Marketplace Pricing System

## Overview

The Theramate platform implements a flexible marketplace pricing model where practitioners can set custom prices for their services, and the platform automatically collects a 0.5% fee on each booking.

## Architecture

### 1. Two-Tier Pricing System
- **Platform Subscription**: Fixed monthly fees (£30/£50) for practitioners to use the platform
- **Service Pricing**: Custom pricing per practitioner for their individual services

### 2. Database Schema

#### `practitioner_services` Table
```sql
CREATE TABLE practitioner_services (
  id UUID PRIMARY KEY,
  practitioner_id UUID REFERENCES user_profiles(id),
  service_name VARCHAR(255) NOT NULL,
  service_type VARCHAR(100) NOT NULL, -- sports_therapy, massage_therapy, osteopathy
  duration_minutes INTEGER NOT NULL,
  base_price_pence INTEGER NOT NULL, -- Price in pence
  platform_fee_percentage INTEGER DEFAULT 0.5,
  platform_fee_pence INTEGER GENERATED ALWAYS AS (ROUND(base_price_pence * platform_fee_percentage / 100.0)) STORED,
  practitioner_earnings_pence INTEGER GENERATED ALWAYS AS (base_price_pence - ROUND(base_price_pence * platform_fee_percentage / 100.0)) STORED,
  stripe_price_id VARCHAR(255),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `session_bookings` Table
```sql
CREATE TABLE session_bookings (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES user_profiles(id),
  practitioner_id UUID REFERENCES user_profiles(id),
  service_id UUID REFERENCES practitioner_services(id),
  session_date TIMESTAMP WITH TIME ZONE NOT NULL,
  session_duration_minutes INTEGER NOT NULL,
  total_price_pence INTEGER NOT NULL,
  platform_fee_pence INTEGER NOT NULL,
  practitioner_earnings_pence INTEGER NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  client_notes TEXT,
  practitioner_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Key Features

### 1. Dynamic Pricing
- Practitioners set their own prices for each service
- Automatic calculation of 0.5% platform fee
- Real-time pricing breakdown display
- Support for different service types and durations

### 2. Service Management
- Create, edit, and delete services
- Toggle service active/inactive status
- Service categorization (Sports Therapy, Massage Therapy, Osteopathy)
- Duration-based pricing (15-180 minutes)

### 3. Marketplace Browsing
- Search and filter services
- Location-based filtering
- Price range filtering
- Service type filtering
- Duration filtering

### 4. Booking System
- Secure payment processing with Stripe
- Automatic fee calculation and collection
- Booking status management
- Client and practitioner notes

## Implementation

### 1. Pricing Utilities (`src/utils/pricing.ts`)
```typescript
// Calculate pricing breakdown
const pricing = calculateServicePricing(8000, 0.5); // £80 with 0.5% fee
// Result: { basePricePence: 8000, platformFeePence: 40, practitionerEarningsPence: 7960 }

// Format prices for display
const displayPrice = formatPrice(8000); // "£80.00"
```

### 2. Service Management (`src/services/practitionerServices.ts`)
```typescript
// Create a new service
const service = await createPractitionerService(practitionerId, {
  serviceName: "Sports Massage",
  serviceType: "sports_therapy",
  durationMinutes: 60,
  basePricePence: 8000, // £80
  description: "Deep tissue massage for athletes"
});

// Search services
const results = await searchServices({
  query: "sports massage",
  serviceType: "sports_therapy",
  minPrice: 5000, // £50
  maxPrice: 10000, // £100
  location: "London"
});
```

### 3. Booking System (`src/services/bookingService.ts`)
```typescript
// Create a booking
const booking = await createBooking({
  serviceId: "service-123",
  clientId: "client-456",
  sessionDate: new Date("2024-01-15T14:00:00"),
  clientNotes: "Focus on lower back"
});
```

### 4. Stripe Integration (`src/services/stripeService.ts`)
```typescript
// Create dynamic price
const priceId = await createServicePrice({
  serviceId: "service-123",
  practitionerId: "practitioner-456",
  serviceName: "Sports Massage",
  serviceType: "sports_therapy",
  basePricePence: 8000,
  platformFeePence: 320,
  practitionerEarningsPence: 7680
});

// Create payment intent
const paymentIntent = await createPaymentIntent({
  amount: 8000,
  currency: 'gbp',
  metadata: {
    booking_id: "booking-123",
    platform_fee: "320",
    practitioner_earnings: "7680"
  }
});
```

## Components

### 1. Service Management (`src/components/practitioner/ServiceManagement.tsx`)
- Allows practitioners to create and manage their services
- Real-time pricing breakdown
- Service activation/deactivation
- Form validation and error handling

### 2. Service Browser (`src/components/marketplace/ServiceBrowser.tsx`)
- Marketplace view of all available services
- Advanced filtering and search
- Pagination support
- Service cards with pricing and practitioner info

### 3. Service Booking (`src/components/booking/ServiceBooking.tsx`)
- Multi-step booking process
- Payment integration
- Booking confirmation
- Session details management

## Pricing Examples

### Example 1: Sports Massage
- **Practitioner Price**: £80.00
- **Platform Fee (0.5%)**: £0.40
- **Stripe Connect Fee (1.5%)**: £1.20
- **Total Fees**: £1.60 (2.0%)
- **Practitioner Earnings**: £78.40
- **Client Pays**: £80.00

### Example 2: Deep Tissue Massage
- **Practitioner Price**: £120.00
- **Platform Fee (0.5%)**: £0.60
- **Stripe Connect Fee (1.5%)**: £1.80
- **Total Fees**: £2.40 (2.0%)
- **Practitioner Earnings**: £117.60
- **Client Pays**: £120.00

### Example 3: Osteopathy Session
- **Practitioner Price**: £150.00
- **Platform Fee (0.5%)**: £0.75
- **Stripe Connect Fee (1.5%)**: £2.25
- **Total Fees**: £3.00 (2.0%)
- **Practitioner Earnings**: £147.00
- **Client Pays**: £150.00

## Revenue Model

### For Practitioners
- **Monthly Subscription**: £30 (Basic) or £50 (Pro)
- **Per-Session Earnings**: 98% of their set price
- **Platform Fee**: 0.5% of each booking
- **Stripe Connect Processing Fee**: 1.5% (automatically deducted by Stripe)
- **Total Fees**: 2.0% per booking

### For Platform
- **Subscription Revenue**: £30-£50 per practitioner per month
- **Transaction Fees**: 0.5% of every booking
- **Scalable Growth**: Revenue grows with platform usage

## Security & Compliance

### 1. Row Level Security (RLS)
- Practitioners can only manage their own services
- Clients can only view their own bookings
- Public access to active services only

### 2. Data Validation
- Price validation (minimum £10, maximum £500)
- Duration validation (15-180 minutes)
- Service type validation
- Required field validation

### 3. Payment Security
- Stripe integration for secure payments
- PCI compliance through Stripe
- Encrypted payment data
- Fraud protection

## Future Enhancements

### 1. Advanced Features
- Dynamic pricing based on demand
- Bulk service management
- Service packages and bundles
- Recurring appointment scheduling

### 2. Analytics
- Revenue tracking for practitioners
- Platform usage analytics
- Popular service types
- Geographic pricing insights

### 3. Integration
- Calendar integration (Google, Outlook)
- Email notifications
- SMS reminders
- Video consultation support

## Getting Started

1. **Run Database Migration**
   ```bash
   # Apply the migration
   supabase db push
   ```

2. **Set Environment Variables**
   ```bash
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
   REACT_APP_STRIPE_SECRET_KEY=sk_test_...
   ```

3. **Install Dependencies**
   ```bash
   npm install stripe
   ```

4. **Initialize Components**
   ```typescript
   // In your practitioner dashboard
   <ServiceManagement practitionerId={user.id} />
   
   // In your marketplace
   <ServiceBrowser onBookService={handleBookService} />
   
   // In your booking flow
   <ServiceBooking service={selectedService} />
   ```

## Support

For technical support or questions about the marketplace pricing system, please contact the development team or refer to the API documentation.
