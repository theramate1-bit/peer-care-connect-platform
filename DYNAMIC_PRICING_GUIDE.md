# Theramate Dynamic Pricing Implementation Guide

## 🎯 **OVERVIEW**

Theramate uses a **dynamic pricing model** where practitioners set their own rates during onboarding and in their profiles. This guide explains how to implement this with Stripe.

---

## 🏗️ **STRIPE PRODUCT STRUCTURE**

### **Generic Products Created:**
1. **Theramate Therapy Session** (`prod_T1WKbCqmcG7PRH`)
   - Used for all therapy sessions
   - Pricing set dynamically per practitioner
   - No default price (custom pricing only)

2. **Theramate Credit Purchase** (`prod_T1WKPiGf2RJNoe`)
   - Used for credit packages
   - Fixed pricing tiers (Starter, Professional, Premium)
   - Platform-managed pricing

3. **Theramate Platform Subscription** (`prod_T1WKPiGf2RJNoe`)
   - Used for monthly subscriptions
   - Fixed pricing (Basic, Pro)
   - Platform-managed pricing

---

## 💰 **DYNAMIC PRICING IMPLEMENTATION**

### **1. Practitioner Onboarding Flow:**

```typescript
// During practitioner onboarding
interface PractitionerPricing {
  hourlyRate: number; // e.g., 75 (for £75/hour)
  sessionTypes: {
    '30min': number; // e.g., 40 (for £40)
    '45min': number; // e.g., 55 (for £55)
    '60min': number; // e.g., 70 (for £70)
    '90min': number; // e.g., 100 (for £100)
  };
  specialties: string[];
  experience: number;
}

// Save to database
const practitionerProfile = {
  user_id: 'practitioner_id',
  hourly_rate: 75,
  session_pricing: {
    '30min': 40,
    '45min': 55,
    '60min': 70,
    '90min': 100
  },
  specialties: ['sports_therapy', 'massage'],
  experience_years: 5
};
```

### **2. Dynamic Price Creation:**

```typescript
// When a client books a session
async function createSessionPrice(practitionerId: string, sessionType: string) {
  // Get practitioner's pricing from database
  const practitioner = await supabase
    .from('therapist_profiles')
    .select('session_pricing, hourly_rate')
    .eq('user_id', practitionerId)
    .single();

  const sessionPrice = practitioner.session_pricing[sessionType];
  
  // Create Stripe price dynamically
  const price = await stripe.prices.create({
    product: 'prod_T1WKbCqmcG7PRH', // Generic therapy session product
    unit_amount: sessionPrice * 100, // Convert to pence
    currency: 'gbp',
    metadata: {
      practitioner_id: practitionerId,
      session_type: sessionType,
      duration: getDuration(sessionType)
    }
  });

  return price;
}
```

### **3. Credit System Integration:**

```typescript
// Fixed credit package pricing
const CREDIT_PACKAGES = {
  starter: { credits: 20, price: 2000 }, // £20 for 20 credits
  professional: { credits: 60, price: 5000 }, // £50 for 60 credits (17% discount)
  premium: { credits: 150, price: 10000 } // £100 for 150 credits (33% discount)
};

async function createCreditPrice(packageType: string) {
  const package = CREDIT_PACKAGES[packageType];
  
  const price = await stripe.prices.create({
    product: 'prod_T1WKPiGf2RJNoe', // Generic credit product
    unit_amount: package.price,
    currency: 'gbp',
    metadata: {
      package_type: packageType,
      credits: package.credits
    }
  });

  return price;
}
```

---

## 🎯 **PRACTITIONER PRICING FEATURES**

### **1. Profile Management:**
- Practitioners can update their rates anytime
- Different rates for different session types
- Special pricing for packages or bulk bookings
- Geographic pricing adjustments

### **2. Pricing Display:**
```typescript
// Display practitioner pricing in marketplace
const PractitionerCard = ({ practitioner }) => {
  const { session_pricing, hourly_rate } = practitioner;
  
  return (
    <div className="practitioner-card">
      <h3>{practitioner.name}</h3>
      <div className="pricing">
        <span>From £{Math.min(...Object.values(session_pricing))}/session</span>
        <span>£{hourly_rate}/hour</span>
      </div>
      <div className="session-types">
        {Object.entries(session_pricing).map(([type, price]) => (
          <div key={type}>
            {type}: £{price}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### **3. Booking Flow:**
```typescript
// Client selects practitioner and session type
const BookingFlow = ({ practitioner, sessionType }) => {
  const sessionPrice = practitioner.session_pricing[sessionType];
  
  const handleBooking = async () => {
    // Create dynamic price
    const price = await createSessionPrice(practitioner.id, sessionType);
    
    // Process payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: sessionPrice * 100,
      currency: 'gbp',
      metadata: {
        practitioner_id: practitioner.id,
        session_type: sessionType,
        client_id: currentUser.id
      }
    });
    
    // Complete booking
    await completeBooking(practitioner.id, sessionType, price.id);
  };
};
```

---

## 📊 **DATABASE SCHEMA UPDATES**

### **Therapist Profiles Table:**
```sql
ALTER TABLE therapist_profiles ADD COLUMN session_pricing JSONB;
ALTER TABLE therapist_profiles ADD COLUMN hourly_rate INTEGER;
ALTER TABLE therapist_profiles ADD COLUMN pricing_updated_at TIMESTAMP;

-- Example data structure
UPDATE therapist_profiles SET 
  session_pricing = '{
    "30min": 40,
    "45min": 55,
    "60min": 70,
    "90min": 100
  }',
  hourly_rate = 75,
  pricing_updated_at = NOW()
WHERE user_id = 'practitioner_id';
```

### **Bookings Table:**
```sql
ALTER TABLE bookings ADD COLUMN stripe_price_id TEXT;
ALTER TABLE bookings ADD COLUMN session_price INTEGER;
ALTER TABLE bookings ADD COLUMN pricing_metadata JSONB;
```

---

## 🔧 **IMPLEMENTATION STEPS**

### **1. Update Practitioner Onboarding:**
- Add pricing setup step
- Allow practitioners to set their rates
- Validate pricing ranges
- Save to database

### **2. Update Marketplace Display:**
- Show practitioner-specific pricing
- Sort by price ranges
- Filter by price brackets
- Display pricing clearly

### **3. Update Booking System:**
- Create dynamic Stripe prices
- Handle payment processing
- Store pricing metadata
- Support price changes

### **4. Update Admin Dashboard:**
- Monitor pricing trends
- Set pricing guidelines
- Handle pricing disputes
- Analytics and reporting

---

## 💡 **BENEFITS OF DYNAMIC PRICING**

### **For Practitioners:**
- ✅ Set their own competitive rates
- ✅ Adjust pricing based on demand
- ✅ Offer special packages and discounts
- ✅ Control their earning potential

### **For Clients:**
- ✅ Choose based on budget and quality
- ✅ Compare practitioner pricing
- ✅ Find value-for-money options
- ✅ Transparent pricing upfront

### **For Platform:**
- ✅ Attract diverse practitioners
- ✅ Competitive marketplace
- ✅ Higher conversion rates
- ✅ Better user satisfaction

---

## 🚀 **NEXT STEPS**

1. **Update Database Schema** - Add pricing fields to therapist profiles
2. **Modify Onboarding Flow** - Add pricing setup step
3. **Update Marketplace** - Display dynamic pricing
4. **Implement Booking** - Create dynamic Stripe prices
5. **Test Integration** - Verify end-to-end flow

---

## 📋 **STRIPE PRODUCTS SUMMARY**

### **Generic Products (No Fixed Pricing):**
- **Theramate Therapy Session** - For all practitioner sessions
- **Theramate Credit Purchase** - For platform credit packages
- **Theramate Platform Subscription** - For monthly subscriptions

### **Dynamic Pricing Flow:**
1. Practitioner sets rates in profile
2. Client selects practitioner and session type
3. System creates dynamic Stripe price
4. Payment processed with practitioner's rate
5. Booking completed with pricing metadata

This approach gives practitioners full control over their pricing while maintaining a clean, scalable Stripe integration!

---

*Created: September 9, 2025*  
*Implementation Status: Ready for Development*  
*Stripe Integration: Dynamic Pricing Supported*
