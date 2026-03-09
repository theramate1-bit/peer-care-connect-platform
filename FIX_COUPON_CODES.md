# 🎟️ Fix Coupon Codes for Dynamic Pricing

## 🐛 **THE PROBLEM**

Coupon codes not working because:

1. **Dynamic Products**: Using `price_data` creates a NEW product each checkout
2. **Coupon Restrictions**: Your coupons might be restricted to specific products
3. **Mismatch**: Dynamically created products ≠ coupon's allowed products

---

## ✅ **SOLUTION OPTIONS**

### **Option 1: Remove Product Restrictions** ⭐ **RECOMMENDED**

Make coupons work with ALL products:

```bash
# Using Stripe Dashboard:
1. Go to: https://dashboard.stripe.com/coupons
2. Click each coupon (LAUNCH50, EARLYBIRD20, FRIEND10)
3. If you see "Applies to specific products" → Edit
4. Change to "Applies to all products"
5. Save

# OR using Stripe CLI (if you can get it working):
stripe coupons update LAUNCH50 --applies-to[]=null
stripe coupons update EARLYBIRD20 --applies-to[]=null  
stripe coupons update FRIEND10 --applies-to[]=null
```

**Pros:**
- ✅ Works immediately
- ✅ No code changes needed
- ✅ Flexible for future products

**Cons:**
- Coupons work on ANY product (less control)

---

### **Option 2: Use Static Price IDs**

Switch back to predefined products/prices:

**Step 1: Create products in Stripe Dashboard**
1. Go to: https://dashboard.stripe.com/products
2. Create "Healthcare Professional Plan" - £30/month
3. Create "Healthcare Professional Pro Plan" - £50/month
4. Copy the Price IDs (e.g., `price_xxxxx`)

**Step 2: Update Edge Function**

```typescript
// Replace dynamic pricing with static IDs:
const stripePriceIds = {
  practitioner: { 
    monthly: 'price_1SGOrXFk77knaVvaCbVM0FZN' 
  },
  pro: { 
    monthly: 'price_1SGOrgFk77knaVvatu5ksh5y' 
  }
};

const session = await stripe.checkout.sessions.create({
  line_items: [{
    price: stripePriceIds[plan].monthly, // Static ID
    quantity: 1
  }]
});
```

**Step 3: Update coupons to work with these products**

**Pros:**
- ✅ Full control over products
- ✅ Coupons can be restricted to specific plans
- ✅ Cleaner Stripe Dashboard

**Cons:**
- ❌ Must create products in every environment
- ❌ Less flexible for price changes

---

### **Option 3: Hybrid Approach** ⚡ **BEST OF BOTH**

Use static products for subscriptions, but keep dynamic pricing as fallback:

```typescript
// Check if static prices exist, fallback to dynamic
const staticPriceIds = {
  practitioner: 'price_1SGOrXFk77knaVvaCbVM0FZN',
  pro: 'price_1SGOrgFk77knaVvatu5ksh5y'
};

let lineItem;
if (staticPriceIds[plan]) {
  // Use static price (works with restricted coupons)
  lineItem = {
    price: staticPriceIds[plan],
    quantity: 1
  };
} else {
  // Fallback to dynamic (works with unrestricted coupons)
  lineItem = {
    price_data: {
      currency: "gbp",
      unit_amount: priceAmount,
      recurring: { interval: 'month' },
      product_data: { name: `${plan} Plan` }
    },
    quantity: 1
  };
}
```

**Pros:**
- ✅ Works with restricted coupons (static prices)
- ✅ Flexible fallback (dynamic pricing)
- ✅ Best of both worlds

**Cons:**
- Slightly more complex code

---

## 🎯 **RECOMMENDATION**

**For MVP:** Use **Option 1** (Remove product restrictions)

**Why:**
- ✅ Takes 2 minutes
- ✅ No code changes
- ✅ Works immediately
- ✅ You already have the coupons created

**Steps:**
1. Go to: https://dashboard.stripe.com/coupons
2. Edit LAUNCH50, EARLYBIRD20, FRIEND10
3. Change "Applies to" → "All products"
4. Test checkout with coupon codes
5. ✅ Done!

---

## 🧪 **HOW TO TEST**

After applying the fix:

1. Start practitioner onboarding
2. Reach payment step
3. Click "Subscribe" → Stripe checkout
4. Click "Add promotion code"
5. Enter: **LAUNCH50**
6. Expected:
   - ✅ Code accepted!
   - ✅ 50% discount applied
   - ✅ Price drops from £50 → £25

---

## 📊 **CURRENT COUPONS**

| Code | Discount | Duration | Status |
|------|----------|----------|---------|
| **LAUNCH50** | 50% off | Once | Need to remove restrictions |
| **EARLYBIRD20** | 20% off | Repeating | Need to remove restrictions |
| **FRIEND10** | £10 off | Once | Need to remove restrictions |

---

## 💡 **CURRENCY WARNING**

The FRIEND10 coupon is `amount_off: 1000` which Stripe interprets as:
- If currency is **GBP**: £10.00 off ✅
- If currency is **USD**: $10.00 off ❌

**Your checkout uses GBP**, so FRIEND10 should work correctly once product restrictions are removed.

---

## ✅ **QUICK FIX CHECKLIST**

To get coupons working in the next 5 minutes:

- [ ] Go to Stripe Dashboard → Coupons
- [ ] Edit LAUNCH50
  - [ ] Change "Applies to" → "All products"
  - [ ] Click "Update coupon"
- [ ] Edit EARLYBIRD20
  - [ ] Change "Applies to" → "All products"
  - [ ] Click "Update coupon"
- [ ] Edit FRIEND10
  - [ ] Change "Applies to" → "All products"
  - [ ] Click "Update coupon"
- [ ] Test in your app
  - [ ] Start checkout
  - [ ] Apply LAUNCH50
  - [ ] Verify discount applied
- [ ] ✅ Done!

---

## 🐛 **IF STILL NOT WORKING**

Check these:

1. **Coupon expired?**
   - Dashboard → Coupons → Check "Redeem by" date

2. **Max redemptions reached?**
   - Dashboard → Coupons → Check "Max redemptions"

3. **Currency mismatch?**
   - FRIEND10 must match checkout currency (GBP)

4. **Promotion codes inactive?**
   - Dashboard → Promotion codes → Check "Active" status

5. **Still issues?**
   - Share the exact error message from Stripe checkout

---

**Quick Fix:** Remove product restrictions from coupons in Dashboard! 🎉

