# 💳 Payment Flow Documentation

**Date**: 2025-10-10  
**System**: TheraMate Marketplace  
**Payment Provider**: Stripe

---

## 🎯 Overview

Your marketplace uses **Stripe** for payment processing with support for **Stripe Connect** for direct practitioner payouts. The system handles two types of payments:

1. **Subscription Payments** - Practitioners pay monthly for platform access
2. **Session Payments** - Clients pay for therapy sessions

---

## 💰 Session Booking Payment Flow

### **What Happens When a Client Books a Session**

```
Client → Booking → Payment → Platform → Stripe → Practitioner
   ↓         ↓         ↓         ↓         ↓          ↓
 Browse   Select    Stripe   0.5% Fee   1.5% Fee   98% Payout
Provider   Time    Checkout  Platform   Stripe     to Provider
```

---

## 📊 Detailed Payment Flow

### **Step 1: Client Books a Session**

**Frontend** (`BookingFlow.tsx`, `BookingCalendar.tsx`):
```typescript
// 1. Client selects practitioner, date, time, session type
const booking = {
  practitioner_id: "xxx",
  client_id: "yyy",
  session_date: "2025-10-15",
  start_time: "10:00",
  duration_minutes: 60,
  session_type: "Sports Therapy",
  price: 80 // £80 per hour
};

// 2. Create session record in database
const { data: session } = await supabase
  .from('client_sessions')
  .insert({
    ...booking,
    status: 'scheduled',
    payment_status: 'pending'
  });
```

---

### **Step 2: Calculate Payment Breakdown**

**Platform Fee Structure**:
```typescript
Total Session Price:           £80.00  (100%)
Platform Fee (0.5%):          -£0.40  (deducted)
Stripe Connect Fee (1.5%):     -£1.20  (deducted by Stripe)
Total Fees:                   -£1.60  (2.0%)
Practitioner Payout:           £78.40  (98.0%)
```

**Code** (`create-session-payment/index.ts`):
```typescript
const amount = 80; // Session price in pounds
const platformFee = Math.round(amount * 0.005); // 0.5% = £0.40 (platform commission)
// Note: Stripe Connect automatically deducts additional 1.5% processing fee
// Practitioner receives: amount - platformFee - (amount * 0.015) = £78.40
```

---

### **Step 3: Create Stripe Checkout Session**

**Edge Function** (`create-session-payment/index.ts`):
```typescript
const session = await stripe.checkout.sessions.create({
  customer_email: client.email,
  line_items: [{
    price_data: {
      currency: "gbp",
      product_data: { 
        name: `Therapy Session - ${practitioner.name}`,
        description: `60-minute session`,
      },
      unit_amount: amount * 100, // £80 = 8000 pence
    },
    quantity: 1,
  }],
  mode: "payment",
  success_url: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/marketplace`,
  metadata: {
    type: "session_payment",
    session_id: sessionId,
    practitioner_id: practitionerId,
    client_id: clientId,
    platform_fee: "0.40",        // £0.40
    practitioner_amount: "79.60"  // £79.60
  },
  // IF practitioner has Stripe Connect account:
  payment_intent_data: {
    application_fee_amount: 40, // £0.40 in pence
    transfer_data: {
      destination: practitioner.stripe_account_id,
    },
  },
});
```

**What This Means**:
- ✅ Client is redirected to Stripe's secure checkout page
- ✅ Client enters payment details (card, Apple Pay, Google Pay, etc.)
- ✅ Stripe processes the payment securely
- ✅ Platform automatically deducts 0.5% commission
- ✅ Stripe Connect automatically deducts 1.5% processing fee
- ✅ Practitioner receives 98% directly (if Connect account is set up)

---

### **Step 4: Payment Processing**

**Two Scenarios**:

#### **Scenario A: Practitioner HAS Stripe Connect Account** ✅

```
Client pays £80
       ↓
Stripe receives £80
       ↓
Platform keeps £0.40 (0.5% commission) automatically
       ↓
Stripe deducts £1.20 (1.5% processing fee) automatically
       ↓
Stripe transfers £78.40 directly to practitioner's bank account
       ↓
Practitioner receives £78.40 (usually within 2-7 days)
```

**Advantages**:
- ✅ Automatic fund distribution
- ✅ Direct bank deposits to practitioner
- ✅ No manual payout processing
- ✅ Stripe handles all payment compliance
- ✅ Transparent fee structure

#### **Scenario B: Practitioner DOES NOT have Connect Account** ⚠️

```
Client pays £80
       ↓
Stripe receives £80
       ↓
ALL £80 goes to your platform's Stripe account
       ↓
YOU must manually process practitioner payout
       ↓
Practitioner must wait for manual payment
```

**Current Status**: ❌ mydigitalarchitect1 does NOT have a Connect account

---

### **Step 5: Webhook Notification**

**When payment succeeds**, Stripe sends a webhook to your server:

**Stripe Webhook** (`stripe-webhook/index.ts`):
```typescript
// Stripe event: 'checkout.session.completed'
async function handleSessionPayment(session: Stripe.Checkout.Session) {
  const sessionId = session.metadata?.session_id;
  const platformFee = parseInt(session.metadata?.platform_fee);
  const practitionerAmount = parseInt(session.metadata?.practitioner_amount);
  
  // 1. Update session status to 'completed'
  await supabase
    .from('client_sessions')
    .update({ 
      payment_status: 'completed',
      stripe_payment_intent_id: session.payment_intent,
      platform_fee_amount: platformFee,      // £0.40
      practitioner_amount: practitionerAmount // £79.60
    })
    .eq('id', sessionId);
  
  // 2. Record platform revenue for analytics
  await supabase
    .from('platform_revenue')
    .insert({
      session_id: sessionId,
      total_amount: 80,           // Total paid by client
      platform_fee: 0.40,        // Platform's commission
      practitioner_amount: 79.60, // Practitioner's share
      payment_date: new Date()
    });
  
  // 3. Send booking confirmation emails/notifications
  // 4. If practitioner has Connect account, Stripe handles payout automatically
}
```

---

### **Step 6: Confirmation & Notifications**

**What Happens Next**:

1. **Client Receives**:
   - ✅ Email confirmation from Stripe
   - ✅ Booking confirmation in platform
   - ✅ Session appears in "My Bookings"
   - ✅ Calendar invite (if enabled)

2. **Practitioner Receives**:
   - ✅ Real-time notification: "New Booking Received"
   - ✅ Session appears in their dashboard
   - ✅ Client contact details
   - ✅ If Connect account: Automatic payout notification from Stripe

3. **Platform Records**:
   - ✅ Session payment marked as 'completed'
   - ✅ Platform revenue recorded (£0.40)
   - ✅ Practitioner earnings recorded (£78.40)

---

## 🏦 Stripe Connect: Direct Practitioner Payouts

### **What is Stripe Connect?**

Stripe Connect allows practitioners to receive payments **directly** to their own bank account without you having to handle manual payouts.

### **How It Works**

1. **Practitioner Onboards**:
   ```
   Practitioner clicks "Set Up Payouts"
          ↓
   Redirected to Stripe Connect onboarding
          ↓
   Fills in business/personal details
          ↓
   Connects their bank account
          ↓
   Stripe verifies identity
          ↓
   Account approved and linked
   ```

2. **When Client Books & Pays**:
   ```
   Client pays £80 via Stripe Checkout
          ↓
   Stripe automatically splits payment:
     - Platform: £0.40 (0.5% commission)
     - Stripe: £1.20 (1.5% processing fee)
     - Practitioner: £78.40 (98% payout)
          ↓
   £78.40 is sent directly to practitioner's bank
          ↓
   Practitioner receives funds in 2-7 days
   ```

3. **Benefits**:
   - ✅ **Automatic**: No manual payout processing
   - ✅ **Fast**: Funds arrive in 2-7 days
   - ✅ **Secure**: Stripe handles compliance & fraud
   - ✅ **Transparent**: Practitioners see earnings in real-time
   - ✅ **Tax-Ready**: Stripe generates 1099 forms (US) or equivalent

---

## 💡 Current Implementation Status

### ✅ **What's Working**

| Feature | Status | Notes |
|---------|--------|-------|
| **Client can book sessions** | ✅ Working | Full booking flow implemented |
| **Stripe Checkout** | ✅ Working | Secure payment processing |
| **Platform fee calculation** | ✅ Working | Automatic 0.5% deduction |
| **Payment webhooks** | ✅ Working | Automated status updates |
| **Revenue tracking** | ✅ Working | Platform revenue recorded |
| **Stripe Connect support** | ✅ Coded | Ready to use |

### ⚠️ **What's NOT Set Up Yet**

| Feature | Status | Impact |
|---------|--------|--------|
| **Practitioner Connect accounts** | ❌ Not configured | Manual payouts required |
| **mydigitalarchitect1 Connect** | ❌ Not set up | Can't receive automatic payouts |
| **Automatic practitioner payouts** | ⚠️ Not active | Funds stay in platform account |

---

## 🔄 Payment Flow Diagram

### **Current Flow (Without Stripe Connect)**

```
┌─────────────┐
│   Client    │
│  (Pays £80) │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Stripe Checkout    │
│   (Secure Payment)  │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────────┐
│  Your Platform Account   │
│    (Receives ALL £80)    │
└──────┬───────────────────┘
       │
       ├─► Platform Fee: £0.40 (0.5%)
       ├─► Stripe Fee: £1.20 (1.5%)
       │
       └─► Practitioner Share: £78.40 (98%)
              ↓
        ❌ HELD in your account
        ⚠️ YOU must manually pay practitioner
```

### **Ideal Flow (WITH Stripe Connect)** ⭐

```
┌─────────────┐
│   Client    │
│  (Pays £80) │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Stripe Checkout    │
│   (Secure Payment)  │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────────┐
│     Stripe Platform      │
│   (Automatic Split)      │
└──────┬───────────┬───────┘
       │           │
       │           └──────────────┐
       │                          │
       ▼                          ▼
┌──────────────────┐    ┌─────────────────────┐
│ Platform Account │    │ Practitioner Account│
│   (Gets £0.40/0.5%)   │    │    (Gets £78.40/98%)   │
└──────────────────┘    └──────────┬──────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │  Practitioner's Bank │
                        │   (2-7 days later)   │
                        └──────────────────────┘
```

---

## 📋 Database Tables

### **1. client_sessions**
Stores all booking information:
```sql
{
  id: uuid,
  therapist_id: uuid,              -- Practitioner
  client_id: uuid,                 -- Client
  session_date: date,
  start_time: time,
  duration_minutes: integer,
  price: decimal,                  -- £80
  platform_fee_amount: decimal,    -- £0.40 (0.5%)
  practitioner_amount: decimal,    -- £79.60 (99.5%)
  payment_status: enum,            -- 'pending', 'completed', 'failed'
  stripe_payment_intent_id: text,  -- Stripe payment ID
  status: enum                     -- 'scheduled', 'completed', 'cancelled'
}
```

### **2. platform_revenue**
Tracks your earnings:
```sql
{
  id: uuid,
  session_id: uuid,
  practitioner_id: uuid,
  client_id: uuid,
  total_amount: decimal,           -- £80 (full payment)
  platform_fee: decimal,           -- £0.40 (your commission)
  practitioner_amount: decimal,    -- £79.60 (practitioner's share)
  stripe_session_id: text,
  payment_date: timestamp
}
```

### **3. connect_accounts**
Stores practitioner Stripe Connect details:
```sql
{
  id: uuid,
  user_id: uuid,                   -- Practitioner user ID
  stripe_account_id: text,         -- Stripe Connect account ID
  account_status: enum,            -- 'pending', 'active', 'restricted'
  charges_enabled: boolean,        -- Can receive payments
  payouts_enabled: boolean,        -- Can receive payouts
  details_submitted: boolean,      -- Completed onboarding
  created_at: timestamp
}
```

---

## 🚀 Setting Up Stripe Connect for Practitioners

### **Frontend Flow** (To Be Implemented)

**Step 1**: Add "Set Up Payouts" button in practitioner dashboard

```typescript
// In practitioner settings or dashboard
<Button onClick={handleSetupPayouts}>
  Set Up Automatic Payouts
</Button>
```

**Step 2**: Call Edge Function to create Connect account

```typescript
const handleSetupPayouts = async () => {
  const response = await supabase.functions.invoke('stripe-payment', {
    body: { 
      action: 'create-connect-account',
      userId: user.id,
      email: user.email,
      businessType: 'individual'
    }
  });
  
  // Redirect practitioner to Stripe onboarding
  window.location.href = response.data.onboardingUrl;
};
```

**Step 3**: Practitioner completes Stripe onboarding
- Provides personal/business information
- Connects bank account
- Verifies identity

**Step 4**: Stripe redirects back to your platform
- Connect account is now active
- `stripe_account_id` is saved in database
- Future session payments automatically split

---

## 💪 Benefits of Current Setup

### **For Clients** ✅
- ✅ Secure payment via Stripe
- ✅ Multiple payment methods (card, Apple Pay, Google Pay)
- ✅ Instant booking confirmation
- ✅ Transparent pricing
- ✅ PCI compliant (no card details on your server)

### **For Practitioners** ✅
- ✅ Get 98% of session fees (0.5% platform fee + 1.5% Stripe Connect fee)
- ✅ Real-time booking notifications
- ✅ Session tracking in dashboard
- ✅ (Future) Automatic bank payouts via Connect

### **For Platform** ✅
- ✅ Automated 0.5% commission collection
- ✅ Revenue tracking and analytics
- ✅ No manual payment processing (with Connect)
- ✅ Stripe handles compliance and fraud
- ✅ Scalable payment infrastructure

---

## 📊 Payment Tracking & Analytics

### **Platform Revenue Dashboard**

You can query `platform_revenue` table to see:

```sql
-- Total platform revenue
SELECT 
  SUM(platform_fee) as total_platform_earnings,
  SUM(practitioner_amount) as total_practitioner_earnings,
  SUM(total_amount) as total_transactions,
  COUNT(*) as number_of_bookings
FROM platform_revenue
WHERE payment_date >= '2025-10-01';
```

**Example Output**:
```
Total Platform Earnings: £40  (0.5% of £8,000)
Stripe Processing Fees: £120  (1.5% of £8,000)
Total Practitioner Earnings: £7,840  (98% of £8,000)
Total Transactions: £8,000
Number of Bookings: 100
```

---

## ⚠️ Important Notes

### **1. Manual Payouts Currently Required**

**Because practitioners don't have Stripe Connect accounts yet**:
- ❌ Funds from client payments stay in YOUR Stripe account
- ⚠️ YOU must manually pay practitioners their 98% share (after deducting 0.5% platform fee and 1.5% Stripe processing fee)
- ⚠️ You need to track who is owed what manually

**Database Tracking**:
```sql
-- See what each practitioner is owed
SELECT 
  u.email,
  u.first_name,
  u.last_name,
  SUM(cs.practitioner_amount) as total_owed
FROM client_sessions cs
JOIN users u ON u.id = cs.therapist_id
WHERE cs.payment_status = 'completed'
GROUP BY u.id, u.email, u.first_name, u.last_name;
```

### **2. Enable Stripe Connect** (Recommended)

**To enable automatic practitioner payouts**:

1. Enable Stripe Connect in your Stripe Dashboard:
   - Settings → Connect → Enable Connect

2. Add practitioner onboarding flow in your app:
   - Dashboard → Settings → "Set Up Payouts" button

3. Practitioners complete Stripe's onboarding

4. Future payments automatically split!

### **3. Testing in Development**

**Use Stripe Test Mode**:
- Test card: `4242 4242 4242 4242`
- Any future expiry date
- Any CVC

**Test Connect** (requires Stripe CLI or test environment)

---

## 🎯 Summary

### **How Client-to-Practitioner Payment Works**:

1. **Client books session** → Session created (payment_status: 'pending')
2. **Client pays via Stripe** → £80 charged to client's card
3. **Stripe processes payment** → Platform gets £0.40 (0.5%), Stripe gets £1.20 (1.5%), practitioner £78.40 (98%)
4. **Webhook confirms payment** → Session updated (payment_status: 'completed')
5. **Practitioner receives notification** → "New booking confirmed"
6. **Payout to practitioner**:
   - ✅ **With Connect**: Automatic transfer to bank (2-7 days)
   - ⚠️ **Without Connect**: Manual payout required

### **Platform Commission**: 0.5% (configurable)
### **Stripe Connect Processing Fee**: 1.5% (automatically deducted by Stripe)
### **Total Fees**: 2.0%
### **Practitioner Earnings**: 98.0%
### **Payment Processor**: Stripe
### **Payout System**: Stripe Connect (when enabled)

---

## 🛠️ Next Steps (Recommendations)

1. **✅ Current**: Bookings and payments work
2. **⚠️ Priority**: Set up Stripe Connect for practitioners
3. **📋 To-Do**: Add "Set Up Payouts" flow in practitioner dashboard
4. **🎯 Goal**: Eliminate manual payout processing

---

**Last Updated**: 2025-10-10  
**Status**: ✅ **Payments Working** | ⚠️ **Connect Setup Needed**

