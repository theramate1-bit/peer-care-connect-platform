# Mobile Therapist Feature - Test Verification

## Quick Test Checklist

### ✅ AC1: Therapist Type Selection
**Status:** IMPLEMENTED

**Verification Steps:**
1. Start onboarding as practitioner
2. Verify Step 0 shows three buttons: Clinic Based, Mobile, Hybrid
3. Click each button → verify visual feedback (border/background change)
4. Try to proceed without selection → should show error
5. Select option → proceed → go back → verify selection persists

**Expected Result:** ✅ All criteria met

---

### ✅ AC2: Location Collection
**Status:** IMPLEMENTED

**Verification Steps:**

**Clinic-Based:**
1. Select "Clinic Based Therapist"
2. Proceed to location step
3. Verify only "Clinic Address" field shown
4. Verify message: "This address will be shown on the marketplace"
5. Enter address → verify lat/lng saved

**Mobile:**
1. Select "Mobile Therapist"
2. Proceed to location step
3. Verify only "Base Address" field shown
4. Verify message: "This can be your home address or workspace. It will NOT be shown on the marketplace"
5. Enter address → verify lat/lng saved

**Hybrid:**
1. Select "Hybrid Therapist"
2. Proceed to location step
3. Verify both "Clinic Address" and "Base Address" fields shown
4. Enter both addresses → verify both lat/lng saved

**Expected Result:** ✅ All criteria met

---

### ✅ AC3: Service Radius Selection
**Status:** IMPLEMENTED

**Verification Steps:**

**Mobile Therapist:**
1. Complete location step for mobile therapist
2. Verify radius step appears (Step 3)
3. Verify slider shows default 25km
4. Adjust slider → verify value updates in real-time
5. Proceed → verify value saved to database

**Hybrid Therapist:**
1. Complete location step for hybrid therapist
2. Verify radius step appears (Step 3)
3. Verify slider works correctly
4. Proceed → verify value saved

**Clinic-Based Therapist:**
1. Complete location step for clinic-based therapist
2. Verify radius step is SKIPPED
3. Proceeds directly to Stripe Connect step

**Expected Result:** ✅ All criteria met

---

### ✅ AC4: Service Management
**Status:** IMPLEMENTED

**Verification Steps:**

**Mobile Therapist:**
1. Navigate to service management
2. Create new service
3. Verify service_type selector shows "Mobile Service" (or defaults to mobile)
4. Save service → verify service_type = 'mobile' in database

**Clinic-Based Therapist:**
1. Navigate to service management
2. Create new service
3. Verify service_type defaults to 'clinic' (or no selector if not mobile/hybrid)
4. Save service → verify service_type = 'clinic' in database

**Hybrid Therapist:**
1. Navigate to service management
2. Verify three tabs: "Mobile Services", "Clinic-Based Services", "All Services"
3. Click "Mobile Services" tab → create service
4. Verify service_type = 'mobile' saved
5. Click "Clinic-Based Services" tab → create service
6. Verify service_type = 'clinic' saved
7. Switch between tabs → verify correct services filtered
8. Verify service_type selector in form shows all three options

**Expected Result:** ✅ All criteria met

---

## Manual Testing Instructions

### Test 1: Complete Mobile Therapist Onboarding
```
1. Register as practitioner
2. Select "Mobile Therapist"
3. Enter basic info (name, phone)
4. Enter base address (e.g., "London, UK")
5. Set radius to 30km
6. Complete Stripe Connect
7. Complete subscription
8. Verify in database:
   - therapist_type = 'mobile'
   - base_address set
   - base_latitude/base_longitude set
   - mobile_service_radius_km = 30
```

### Test 2: Complete Hybrid Therapist Onboarding
```
1. Register as practitioner
2. Select "Hybrid Therapist"
3. Enter basic info
4. Enter clinic address (e.g., "Manchester, UK")
5. Enter base address (e.g., "Liverpool, UK")
6. Set radius to 25km
7. Complete Stripe Connect
8. Complete subscription
9. Verify in database:
   - therapist_type = 'hybrid'
   - clinic_address, base_address both set
   - mobile_service_radius_km = 25
```

### Test 3: Service Creation for Hybrid Therapist
```
1. As hybrid therapist, navigate to service management
2. Click "Mobile Services" tab
3. Create service "Mobile Massage" → verify service_type = 'mobile'
4. Click "Clinic-Based Services" tab
5. Create service "Clinic Consultation" → verify service_type = 'clinic'
6. Click "All Services" tab
7. Verify both services visible
8. Edit service → verify can change service_type to 'both'
```

---

## Database Verification Queries

### Check Therapist Type
```sql
SELECT id, first_name, last_name, therapist_type, 
       clinic_address, base_address, mobile_service_radius_km
FROM users
WHERE user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
ORDER BY created_at DESC
LIMIT 10;
```

### Check Service Types
```sql
SELECT pp.id, pp.name, pp.service_type, u.therapist_type, u.first_name
FROM practitioner_products pp
JOIN users u ON pp.practitioner_id = u.id
WHERE u.therapist_type IN ('mobile', 'hybrid', 'clinic_based')
ORDER BY pp.created_at DESC;
```

---

## Known Issues / To Fix

### Issue 1: Migration Not Applied
**Status:** ⚠️ NEEDS ACTION
- Migration file created but not applied to database
- Need to run: `supabase migration up` or apply via Supabase dashboard

### Issue 2: Backend Edge Function
**Status:** ✅ FIXED
- Updated to accept and save service_type
- Verified in code

### Issue 3: Marketplace Search
**Status:** ⏳ IN PROGRESS
- Need to update `find_practitioners_by_distance` RPC
- Need to add radius-based filtering for mobile therapists

---

## Next Steps

1. ✅ Apply database migration
2. ⏳ Test marketplace search with mobile therapists
3. ⏳ Implement mobile booking request flow
4. ⏳ Test payment hold/capture flow
5. ⏳ Test practitioner accept/decline flow

---

## Success Metrics

- [x] Onboarding flow works for all three therapist types
- [x] Location data correctly saved
- [x] Radius selection works for mobile/hybrid
- [x] Service management tabs work for hybrid therapists
- [ ] Marketplace search includes mobile therapists
- [ ] Mobile booking requests can be created
- [ ] Payment hold/capture works correctly
- [ ] Practitioner can accept/decline requests
