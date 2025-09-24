# Theramate Dynamic Pricing Implementation

## 🎯 **OVERVIEW**

I've created a comprehensive dynamic pricing system for Theramate that allows practitioners to set their own custom pricing during onboarding and profile management, while maintaining a clean Stripe integration.

---

## 🏗️ **WHAT I'VE CREATED**

### **1. Stripe Products (Generic)**
- ✅ **Theramate Therapy Session** (`prod_T1WKbCqmcG7PRH`) - For all practitioner sessions
- ✅ **Theramate Credit Purchase** (`prod_T1WKy8OZKahDsB`) - For platform credit packages  
- ✅ **Theramate Platform Subscription** (`prod_T1WKPiGf2RJNoe`) - For monthly subscriptions

### **2. Database Schema**
- ✅ **Migration File:** `supabase/migrations/20250116_dynamic_pricing.sql`
- ✅ **New Columns:** `hourly_rate`, `session_pricing`, `pricing_updated_at`, etc.
- ✅ **Functions:** `get_practitioner_pricing()`, `search_practitioners_by_price()`
- ✅ **Views:** `pricing_analytics` for business insights
- ✅ **Triggers:** Automatic pricing validation and timestamp updates

### **3. TypeScript Types**
- ✅ **File:** `src/types/pricing.ts`
- ✅ **Interfaces:** `PractitionerPricing`, `SessionPricing`, `BookingPricing`
- ✅ **Utility Class:** `PricingUtils` for conversions and calculations
- ✅ **Templates:** Default pricing for different practitioner types

### **4. Service Layer**
- ✅ **File:** `src/lib/pricing.ts`
- ✅ **Class:** `PricingService` with full CRUD operations
- ✅ **Features:** Price validation, recommendations, analytics
- ✅ **Integration:** Stripe price creation and management

### **5. UI Component**
- ✅ **File:** `src/components/pricing/PractitionerPricingSetup.tsx`
- ✅ **Features:** Complete pricing setup form
- ✅ **Validation:** Real-time pricing validation
- ✅ **Recommendations:** AI-powered pricing suggestions

---

## 💰 **HOW DYNAMIC PRICING WORKS**

### **1. Practitioner Onboarding:**
```typescript
// Practitioner sets their rates
const pricing = {
  hourly_rate: 75, // £75/hour
  session_pricing: {
    '30min': 40,   // £40
    '45min': 55,   // £55
    '60min': 70,   // £70
    '90min': 100   // £100
  },
  accepts_insurance: true,
  discount_available: true,
  discount_percentage: 10
};
```

### **2. Client Booking:**
```typescript
// When client books a session
const sessionPrice = await PricingService.createSessionPrice(
  practitionerId, 
  '60min'
);
// Creates dynamic Stripe price based on practitioner's rate
```

### **3. Stripe Integration:**
```typescript
// Dynamic price creation
const price = await stripe.prices.create({
  product: 'prod_T1WKbCqmcG7PRH', // Generic therapy session
  unit_amount: 7000, // £70 in pence
  currency: 'gbp',
  metadata: {
    practitioner_id: 'practitioner_123',
    session_type: '60min',
    duration: 60
  }
});
```

---

## 🎯 **KEY FEATURES**

### **For Practitioners:**
- ✅ **Custom Pricing:** Set their own rates for different session types
- ✅ **Insurance Support:** Mark if they accept insurance
- ✅ **Discounts:** Offer percentage discounts to clients
- ✅ **Flexibility:** Update pricing anytime in their profile
- ✅ **Recommendations:** Get AI-powered pricing suggestions

### **For Clients:**
- ✅ **Transparent Pricing:** See exact rates before booking
- ✅ **Price Comparison:** Compare practitioners by price
- ✅ **Filter by Budget:** Search within price ranges
- ✅ **Insurance Options:** Find practitioners who accept insurance

### **For Platform:**
- ✅ **Revenue Control:** Set platform fee percentage
- ✅ **Analytics:** Track pricing trends and performance
- ✅ **Validation:** Ensure pricing data integrity
- ✅ **Scalability:** Handle unlimited practitioners and rates

---

## 🔧 **IMPLEMENTATION STEPS**

### **1. Run Database Migration:**
```bash
# Apply the dynamic pricing migration
supabase migration up
```

### **2. Update Practitioner Onboarding:**
```typescript
// Add pricing setup step to onboarding flow
<PractitionerPricingSetup
  practitionerId={practitioner.id}
  userRole={practitioner.role}
  isOnboarding={true}
  onPricingUpdate={handlePricingUpdate}
/>
```

### **3. Update Marketplace:**
```typescript
// Display practitioner-specific pricing
const PractitionerCard = ({ practitioner }) => {
  const pricing = practitioner.session_pricing;
  return (
    <div>
      <h3>{practitioner.name}</h3>
      <p>From £{Math.min(...Object.values(pricing))}/session</p>
      <p>£{practitioner.hourly_rate}/hour</p>
    </div>
  );
};
```

### **4. Update Booking Flow:**
```typescript
// Create dynamic price when booking
const handleBooking = async (practitionerId, sessionType) => {
  const priceId = await PricingService.createSessionPrice(
    practitionerId, 
    sessionType
  );
  // Process payment with dynamic price
};
```

---

## 📊 **PRICING STRUCTURE**

### **Session Types:**
- **30min:** Quick sessions, consultations
- **45min:** Standard osteopathy sessions
- **60min:** Full therapy sessions
- **90min:** Extended/comprehensive sessions

### **Pricing Flexibility:**
- **Hourly Rate:** Base rate for reference
- **Session Pricing:** Specific rates per session type
- **Insurance:** Optional insurance acceptance
- **Discounts:** Optional percentage discounts
- **Notes:** Additional pricing information

### **Platform Fees:**
- **Default:** 10% of practitioner rate
- **Configurable:** Can be adjusted per practitioner
- **Transparent:** Shown to practitioners in their dashboard

---

## 🚀 **BENEFITS**

### **For Practitioners:**
- 🎯 **Control:** Set competitive rates that work for their business
- 💰 **Flexibility:** Adjust pricing based on demand and experience
- 📈 **Growth:** Increase rates as they gain experience
- 🏥 **Insurance:** Attract clients who need insurance coverage

### **For Clients:**
- 💡 **Choice:** Find practitioners within their budget
- 🔍 **Transparency:** See exact costs before booking
- 💳 **Value:** Compare value across practitioners
- 🏥 **Insurance:** Find practitioners who accept their insurance

### **For Theramate:**
- 📊 **Analytics:** Track pricing trends and market data
- 💰 **Revenue:** Consistent platform fees from all bookings
- 🎯 **Competition:** Healthy competition drives quality
- 📈 **Growth:** Attract diverse practitioners and clients

---

## ✅ **READY FOR INTEGRATION**

All components are ready to be integrated into your Theramate application:

1. **Database:** Migration ready to run
2. **Types:** TypeScript interfaces defined
3. **Service:** Pricing service implemented
4. **UI:** Pricing setup component ready
5. **Stripe:** Generic products created

The system supports unlimited practitioners with custom pricing while maintaining a clean, scalable architecture!

---

*Implementation Status: ✅ COMPLETE*  
*Ready for Integration: ✅ YES*  
*Dynamic Pricing: ✅ FULLY SUPPORTED*
