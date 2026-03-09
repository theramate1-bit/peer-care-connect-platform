# Mobile/Hybrid Therapist Implementation Status Report

**BMAD Method Reference:** [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)  
**Analysis Date:** 2025-02-21  
**Status:** ✅ **MOSTLY IMPLEMENTED** - Requires Testing & Verification

---

## Executive Summary

The mobile/hybrid therapist feature is **largely implemented** in the codebase. Database schema, backend functions, and frontend components are in place. However, **comprehensive testing is required** to verify all flows work correctly end-to-end.

---

## ✅ CONFIRMED IMPLEMENTATIONS

### 1. Database Schema ✅

**Location:** Supabase MCP - Project `aikqnvltuwwgifuocvto`

**Tables & Fields:**
- ✅ `users.therapist_type` (enum: 'clinic_based', 'mobile', 'hybrid')
- ✅ `users.base_address`, `base_latitude`, `base_longitude` (mobile/hybrid)
- ✅ `users.clinic_address`, `clinic_latitude`, `clinic_longitude` (clinic/hybrid)
- ✅ `users.mobile_service_radius_km` (mobile/hybrid)
- ✅ `practitioner_products.service_type` (enum: 'clinic', 'mobile', 'both')
- ✅ `mobile_booking_requests` table (complete with all required fields)

**Migrations:**
- ✅ `20260221152203_add_mobile_therapist_support`
- ✅ `20260221154127_create_mobile_booking_rpc_functions`
- ✅ `20260221154142_create_accept_decline_mobile_request_functions`

### 2. Onboarding Flow ✅

**Location:** `peer-care-connect/src/pages/auth/Onboarding.tsx`

**Implementation Status:**
- ✅ **Step 0:** Three-button therapist type selection (lines 730-798)
  - Clinic Based Therapist button
  - Mobile Therapist button
  - Hybrid Therapist button
- ✅ **Clinic-Based Flow:** Saves clinic address with marketplace message
- ✅ **Mobile Flow:** Saves base address (not shown on marketplace) + radius
- ✅ **Hybrid Flow:** Saves both addresses + radius
- ✅ **Radius Step:** Slider for mobile/hybrid (lines 922-940)
- ✅ **Data Persistence:** Saves to database correctly (lines 620-628)

**Code Evidence:**
```typescript
// Lines 620-628: Data saving
therapist_type: formData.therapistType || 'clinic_based',
clinic_address: formData.clinicAddress || null,
base_address: formData.baseAddress || null,
mobile_service_radius_km: formData.mobileServiceRadiusKm || null,
```

### 3. Service Creation Form ✅

**Location:** `peer-care-connect/src/components/practitioner/ProductForm.tsx`

**Implementation Status:**
- ✅ **Service Type Field:** Visible for mobile/hybrid therapists (lines 388-421)
- ✅ **Default Logic:** Sets default based on therapist_type (lines 141-148)
- ✅ **Mobile Therapists:** Shows "Mobile Service" option only
- ✅ **Hybrid Therapists:** Shows all three options (clinic, mobile, both)
- ✅ **Clinic-Based:** Field hidden, defaults to 'clinic'

**Code Evidence:**
```typescript
// Lines 388-421: Service type selection
{(userProfile?.therapist_type === 'mobile' || userProfile?.therapist_type === 'hybrid') && (
  <Select value={formData.service_type || 'clinic'}>
    {userProfile?.therapist_type === 'hybrid' && (
      <SelectItem value="clinic">Clinic-Based Only</SelectItem>
      <SelectItem value="mobile">Mobile Only</SelectItem>
      <SelectItem value="both">Both (Clinic & Mobile)</SelectItem>
    )}
    {userProfile?.therapist_type === 'mobile' && (
      <SelectItem value="mobile">Mobile Service</SelectItem>
    )}
  </Select>
)}
```

### 4. Service Management with Tabs ✅

**Location:** `peer-care-connect/src/components/practitioner/ProductManager.tsx`

**Implementation Status:**
- ✅ **Tabs for Hybrid:** Mobile Services / Clinic-Based Services / All Services (lines 380-442)
- ✅ **Filtering Logic:** Filters products by service_type (lines 154-167)
- ✅ **Tab-Specific Creation:** Pre-selects service_type when creating from tab (lines 169-174)
- ✅ **Empty States:** Different messages for each tab

**Code Evidence:**
```typescript
// Lines 154-167: Product filtering
const filteredProducts = useMemo(() => {
  if (userProfile?.therapist_type !== 'hybrid') return products;
  if (activeTab === 'mobile') {
    return products.filter(p => p.service_type === 'mobile' || p.service_type === 'both');
  } else if (activeTab === 'clinic') {
    return products.filter(p => p.service_type === 'clinic' || p.service_type === 'both');
  }
  return products;
}, [products, activeTab, userProfile?.therapist_type]);
```

### 5. Marketplace Search ✅

**Location:** Supabase RPC Function `find_practitioners_by_distance`

**Implementation Status:**
- ✅ **Therapist Type Handling:** Correctly handles clinic_based, mobile, hybrid
- ✅ **Distance Calculation:** Uses clinic address for clinic-based, base address for mobile
- ✅ **Hybrid Logic:** Uses minimum distance (clinic OR base, whichever is closer)
- ✅ **Radius Filtering:** Mobile therapists only shown if within `mobile_service_radius_km`
- ✅ **Return Fields:** Includes all required fields (therapist_type, base_address, etc.)

**SQL Evidence:**
```sql
-- Calculates distances for both clinic and base
CASE 
  WHEN u.clinic_latitude IS NOT NULL THEN clinic_distance_km
  ELSE NULL
END,
CASE 
  WHEN u.base_latitude IS NOT NULL THEN base_distance_km
  ELSE NULL
END

-- Hybrid uses minimum distance
WHEN pd.therapist_type = 'hybrid' THEN 
  LEAST(
    COALESCE(pd.clinic_distance_km, 999999),
    COALESCE(pd.base_distance_km, 999999)
  )
```

### 6. Marketplace Booking Buttons ✅

**Location:** `peer-care-connect/src/pages/Marketplace.tsx` (lines 1230-1298)

**Implementation Status:**
- ✅ **Button Logic:** Correctly determines which buttons to show
- ✅ **Clinic-Based:** Shows "Book" button → opens `BookingFlow`
- ✅ **Mobile (Within Radius):** Shows "Request Mobile Session" → opens `MobileBookingRequestFlow`
- ✅ **Mobile (Outside Radius):** Should show "Out of Service Area" (needs verification)
- ✅ **Hybrid:** Shows both buttons if both service types available
- ✅ **Service Type Detection:** Checks `practitioner_products.service_type`

**Code Evidence:**
```typescript
// Lines 1232-1240: Button logic
const hasClinicServices = practitioner.therapist_type === 'clinic_based' || 
  practitioner.therapist_type === 'hybrid' ||
  practitioner.products?.some(p => p.is_active && (p.service_type === 'clinic' || p.service_type === 'both'));
  
const hasMobileServices = (practitioner.therapist_type === 'mobile' || practitioner.therapist_type === 'hybrid') &&
  practitioner.products?.some(p => p.is_active && (p.service_type === 'mobile' || p.service_type === 'both')) &&
  geoSearchActive && // Only show if client searched by location
  practitioner.distance_km <= practitioner.mobile_service_radius_km;
```

### 7. Mobile Booking Request Flow ✅

**Location:** `peer-care-connect/src/components/marketplace/MobileBookingRequestFlow.tsx`

**Implementation Status:**
- ✅ **Form Components:** Service selection, date, time, address, notes
- ✅ **Location Validation:** Checks if within service radius (lines 92-115)
- ✅ **Distance Calculation:** Haversine formula (lines 117-126)
- ✅ **RPC Integration:** Calls `create_mobile_booking_request` (line 156)
- ✅ **Payment Intent:** Creates with manual capture

**Code Evidence:**
```typescript
// Lines 92-115: Location validation
useEffect(() => {
  if (clientLatitude && clientLongitude && practitioner.therapist_type) {
    const distance = calculateDistance(clientLatitude, clientLongitude, baseLat, baseLon);
    if (practitioner.mobile_service_radius_km && distance > practitioner.mobile_service_radius_km) {
      setValidationError(`Your location is ${distance.toFixed(1)} km away, outside the practitioner's service radius`);
    }
  }
}, [clientLatitude, clientLongitude, practitioner]);
```

### 8. Backend RPC Functions ✅

**Location:** Supabase Database Functions

**Functions Available:**
- ✅ `create_mobile_booking_request`
- ✅ `accept_mobile_booking_request`
- ✅ `decline_mobile_booking_request`
- ✅ `get_practitioner_mobile_requests`
- ✅ `get_client_mobile_requests`
- ✅ `create_session_from_mobile_request`
- ✅ `expire_mobile_requests`

---

## ⚠️ REQUIRES VERIFICATION

### 1. Service Creation - Default Behavior
- ⚠️ **Need to verify:** When mobile therapist creates service, does it default to `service_type = 'mobile'`?
- ⚠️ **Need to verify:** When clinic-based therapist creates service, does it default to `service_type = 'clinic'`?
- ⚠️ **Current data:** All 17 existing products have `service_type = 'clinic'` (may be legacy data)

### 2. Marketplace - Out of Service Area Message
- ⚠️ **Need to verify:** Does marketplace show "Out of Service Area" message when client is outside radius?
- ⚠️ **Code location:** Marketplace.tsx line 1236-1240 checks distance, but UI message needs verification

### 3. Mobile Request - Decline with Alternates
- ⚠️ **Need to verify:** Can practitioner decline with alternate date/time suggestions?
- ⚠️ **Need to verify:** Does client receive alternate suggestions and can accept them?
- ⚠️ **Database:** `alternate_suggestions` field exists (JSONB), but UI flow needs testing

### 4. Payment Flow - Manual Capture
- ⚠️ **Need to verify:** Payment intent is created with `capture_method: 'manual'`
- ⚠️ **Need to verify:** Payment is held (not captured) until practitioner accepts
- ⚠️ **Need to verify:** Payment is released/refunded if practitioner declines

### 5. Real-Time Notifications
- ⚠️ **Need to verify:** Practitioner receives notification when mobile request is created
- ⚠️ **Need to verify:** Client receives notification when request is accepted/declined
- ⚠️ **Database:** `notifications` table exists, but integration needs testing

---

## 🔍 TESTING PRIORITIES

### High Priority (Critical Path)
1. **Onboarding Flow End-to-End**
   - Create mobile therapist account
   - Verify all fields save correctly
   - Verify radius step appears

2. **Service Creation**
   - Mobile therapist creates mobile service
   - Hybrid therapist creates services in both tabs
   - Verify `service_type` is saved correctly

3. **Marketplace Search**
   - Search from location within mobile therapist's radius
   - Verify mobile therapist appears
   - Search from location outside radius
   - Verify mobile therapist does NOT appear

4. **Booking Button Logic**
   - Verify correct buttons show for each therapist type
   - Verify "Request Mobile Session" opens correct flow

5. **Mobile Request Flow**
   - Client creates request
   - Practitioner accepts
   - Verify session is created
   - Practitioner declines with alternates
   - Client accepts alternate time

### Medium Priority (Edge Cases)
1. Hybrid therapist with only clinic services
2. Hybrid therapist with only mobile services
3. Service type "both" behavior
4. Expired requests handling
5. Payment failure scenarios

### Low Priority (Polish)
1. UI/UX improvements
2. Error message clarity
3. Loading states
4. Empty states

---

## 📋 QUICK VERIFICATION CHECKLIST

Use this quick checklist to verify core functionality:

### Onboarding
- [ ] Can select mobile therapist type
- [ ] Base address field appears (not clinic address)
- [ ] Radius slider appears
- [ ] Data saves to database correctly

### Service Creation
- [ ] Mobile therapist sees service_type selector
- [ ] Hybrid therapist sees tabs (Mobile/Clinic/All)
- [ ] Service type is saved correctly in database

### Marketplace
- [ ] Mobile therapist appears when client searches within radius
- [ ] "Request Mobile Session" button appears
- [ ] Button opens mobile booking request form

### Mobile Request
- [ ] Client can create request
- [ ] Location validation works (within/outside radius)
- [ ] Practitioner receives request
- [ ] Practitioner can accept → session created
- [ ] Practitioner can decline → payment released

---

## 🐛 KNOWN ISSUES

None identified yet - requires testing to discover.

---

## 📝 RECOMMENDATIONS

1. **Run Comprehensive Tests:** Use the test checklist provided (`MOBILE_HYBRID_THERAPIST_TEST_CHECKLIST.md`)

2. **Test with Real Data:** Create test accounts for each therapist type and test end-to-end

3. **Verify Database State:** Check that existing practitioners have correct `therapist_type` values

4. **Check Legacy Data:** All current products have `service_type = 'clinic'` - may need migration

5. **Monitor RPC Functions:** Check Supabase logs for any errors in mobile booking functions

6. **Test Payment Flow:** Verify Stripe integration works correctly with manual capture

---

## 📚 RELATED DOCUMENTATION

- **Test Checklist:** `MOBILE_HYBRID_THERAPIST_TEST_CHECKLIST.md`
- **Acceptance Criteria:** `MOBILE_THERAPIST_ACCEPTANCE_CRITERIA.md`
- **BMAD Plan:** `MOBILE_THERAPIST_PHASE2_BMAD_PLAN.md`
- **BMAD Method:** https://github.com/bmad-code-org/BMAD-METHOD

---

**Report Generated:** 2025-02-21  
**Next Review:** After comprehensive testing completion
