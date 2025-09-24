# Stripe Live Account Setup Guide for Theramate

## 🎯 **CURRENT SITUATION**

The products I created are in **Stripe Test Mode**, not your live account. Here's how to set them up in your live Stripe account.

---

## 🔧 **STEP 1: ACCESS YOUR LIVE STRIPE DASHBOARD**

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Make sure you're in **Live Mode** (toggle in the top left)
3. Navigate to **Products** in the left sidebar

---

## 🏗️ **STEP 2: CREATE THE CORE PRODUCTS**

### **Product 1: Theramate Therapy Session**
- **Name:** `Theramate Therapy Session`
- **Description:** `Dynamic therapy session pricing set by individual practitioners`
- **Type:** Service
- **Active:** Yes
- **No default price** (we'll create prices dynamically)

### **Product 2: Theramate Credit Purchase**
- **Name:** `Theramate Credit Purchase`
- **Description:** `Credit purchase for Theramate platform - pricing varies by package`
- **Type:** Service
- **Active:** Yes
- **No default price** (we'll create prices dynamically)

### **Product 3: Theramate Platform Subscription**
- **Name:** `Theramate Platform Subscription`
- **Description:** `Monthly subscription to Theramate platform with features and benefits`
- **Type:** Service
- **Active:** Yes
- **No default price** (we'll create prices dynamically)

---

## 💰 **STEP 3: CREATE PRICING TIERS**

### **Credit Packages (One-time payments):**

#### **Starter Credit Package:**
- **Product:** Theramate Credit Purchase
- **Price:** £20.00 (2,000 pence)
- **Type:** One-time
- **Currency:** GBP
- **Metadata:** `package_type: starter, credits: 20`

#### **Professional Credit Package:**
- **Product:** Theramate Credit Purchase
- **Price:** £50.00 (5,000 pence)
- **Type:** One-time
- **Currency:** GBP
- **Metadata:** `package_type: professional, credits: 60`

#### **Premium Credit Package:**
- **Product:** Theramate Credit Purchase
- **Price:** £100.00 (10,000 pence)
- **Type:** One-time
- **Currency:** GBP
- **Metadata:** `package_type: premium, credits: 150`

### **Monthly Subscriptions (Recurring payments):**

#### **Basic Plan:**
- **Product:** Theramate Platform Subscription
- **Price:** £19.99/month (1,999 pence)
- **Type:** Recurring (monthly)
- **Currency:** GBP
- **Metadata:** `plan_type: basic, credits_included: 2`

#### **Pro Plan:**
- **Product:** Theramate Platform Subscription
- **Price:** £49.99/month (4,999 pence)
- **Type:** Recurring (monthly)
- **Currency:** GBP
- **Metadata:** `plan_type: pro, credits_included: 6`

---

## 🎯 **STEP 4: DYNAMIC PRICING SETUP**

### **For Therapy Sessions:**
- **No fixed prices** - these will be created dynamically
- **Product ID:** Use the "Theramate Therapy Session" product ID
- **Dynamic Creation:** Your app will create prices when clients book sessions

### **Example Dynamic Price Creation:**
```typescript
// When a client books a session
const price = await stripe.prices.create({
  product: 'prod_YOUR_THERAPY_SESSION_ID', // From your live account
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

## 📋 **STEP 5: UPDATE YOUR APPLICATION**

### **Update Stripe Product IDs:**
```typescript
// In src/types/pricing.ts
export const STRIPE_PRODUCT_IDS: StripeProductConfig = {
  therapy_session: 'prod_YOUR_THERAPY_SESSION_ID', // From live account
  credit_purchase: 'prod_YOUR_CREDIT_PURCHASE_ID', // From live account
  platform_subscription: 'prod_YOUR_SUBSCRIPTION_ID' // From live account
};
```

### **Update Environment Variables:**
```bash
# In your .env file
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
```

---

## 🔍 **STEP 6: VERIFY SETUP**

### **Check Products:**
1. Go to **Products** in your Stripe dashboard
2. Verify all 3 products are created
3. Note down the Product IDs

### **Check Prices:**
1. Go to **Prices** in your Stripe dashboard
2. Verify all 5 prices are created (3 credit packages + 2 subscriptions)
3. Note down the Price IDs

### **Test Integration:**
1. Test credit package purchase
2. Test subscription creation
3. Test dynamic price creation for therapy sessions

---

## 🚀 **STEP 7: WEBHOOK SETUP**

### **Create Webhook Endpoint:**
1. Go to **Webhooks** in your Stripe dashboard
2. Click **Add endpoint**
3. **Endpoint URL:** `https://your-domain.com/api/stripe/webhook`
4. **Events to send:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

---

## 📊 **PRODUCT STRUCTURE SUMMARY**

### **Products (3):**
1. **Theramate Therapy Session** - For dynamic practitioner pricing
2. **Theramate Credit Purchase** - For credit packages
3. **Theramate Platform Subscription** - For monthly subscriptions

### **Prices (5):**
1. **Starter Credit Package** - £20 (20 credits)
2. **Professional Credit Package** - £50 (60 credits)
3. **Premium Credit Package** - £100 (150 credits)
4. **Basic Plan** - £19.99/month
5. **Pro Plan** - £49.99/month

### **Dynamic Pricing:**
- Therapy sessions use dynamic pricing based on practitioner rates
- No fixed prices for therapy sessions
- Prices created on-demand when clients book

---

## ⚠️ **IMPORTANT NOTES**

### **Live Mode vs Test Mode:**
- **Test Mode:** Products start with `prod_test_` or `price_test_`
- **Live Mode:** Products start with `prod_` or `price_`
- **Your app:** Currently configured for live mode

### **Security:**
- Never expose secret keys in frontend code
- Use environment variables for all keys
- Implement proper webhook signature verification

### **Testing:**
- Test with small amounts first
- Use Stripe's test cards for testing
- Verify webhook handling

---

## 🎯 **NEXT STEPS**

1. **Create the 3 products** in your live Stripe dashboard
2. **Create the 5 prices** for credit packages and subscriptions
3. **Update your application** with the new product IDs
4. **Test the integration** with real payments
5. **Set up webhooks** for payment processing

Once you've created these in your live account, you'll be able to see them in your Stripe dashboard and process real payments!

---

*Need help with any of these steps? Let me know!*
