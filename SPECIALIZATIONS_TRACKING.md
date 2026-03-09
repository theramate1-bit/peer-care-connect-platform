# Specializations Tracking - Implementation Guide

## ✅ **Issue: Specializations Not Being Tracked During Onboarding**

### **Problem Identified**
- Onboarding was **NOT** collecting specializations
- `onboarding_progress.form_data['specializations']` was always `[]`
- Profile page showed specializations checkboxes, but they were never populated
- `practitioner_specializations` junction table remained empty after onboarding

### **Root Cause**
The onboarding flow collects `services_offered` (specific services like "Deep Tissue Massage", "Sports Injury Assessment") but **NOT** `specializations` (broader categories like "Sports Injury", "Rehabilitation", "Manual Therapy").

## ✅ **Solution Implemented**

### **Auto-Mapping Strategy**
Instead of asking users to select from two similar lists, we now **automatically map** `services_offered` → `specializations` during onboarding completion.

### **Implementation Details**

**File**: `peer-care-connect/src/lib/onboarding-utils.ts`

**Logic** (lines 268-321):
1. Check if `specializations` array is explicitly provided → use it
2. Otherwise, if `services_offered` array exists:
   - Query the `specializations` table for all records matching the practitioner's role
   - Auto-assign ALL specializations for that role
   - Insert into `practitioner_specializations` junction table

**Mapping Rules**:
| Practitioner Role | Specializations Assigned |
|------------------|-------------------------|
| `sports_therapist` | All where `category = 'sports_therapist'` |
| `massage_therapist` | All where `category = 'massage_therapist'` |
| `osteopath` | All where `category = 'osteopath'` |

### **Available Specializations by Role**

**Sports Therapist:**
- Injury Prevention
- Rehabilitation
- Sports Injury
- Strength Training

**Massage Therapist:**
- Deep Tissue Massage
- Massage Therapy
- Sports Massage

**Osteopath:**
- Cranial Osteopathy
- Manual Therapy
- Osteopathy

## ✅ **Testing & Verification**

### **Test Case: theramate1@gmail.com**
✅ **Before Fix**: 0 specializations
✅ **After Fix**: 4 specializations added
- Injury Prevention
- Rehabilitation
- Sports Injury
- Strength Training

### **Verification Query**
```sql
SELECT 
  ps.id,
  s.name as specialization_name,
  s.category,
  ps.is_primary
FROM public.practitioner_specializations ps
JOIN public.specializations s ON ps.specialization_id = s.id
WHERE ps.practitioner_id = 'e922545a-b08c-4445-92d5-689c9a299a72';
```

## ✅ **Profile Completion Impact**

With specializations now tracked:
- **Before**: 67% complete (8/12 fields)
- **After**: 75% complete (9/12 fields)

**Remaining for 100%**:
- ❌ First Name (empty)
- ❌ Last Name (empty)
- ❌ Qualifications (0 added)

## ✅ **Future Enhancements**

### **Option 1: Smart Mapping (Recommended)**
Map specific `services_offered` → specific `specializations`:
```typescript
const serviceToSpecMap = {
  'sports_injury_assessment': '640ff862-1ce0-45cf-a482-56b676943803', // Sports Injury
  'exercise_rehabilitation': 'dc85613f-0dee-40c2-815b-edf72c77a207',  // Rehabilitation
  'injury_prevention': '688a1bc3-a7a6-4130-991f-8e76d95ed752',        // Injury Prevention
  // ... etc
};
```

### **Option 2: Add Specializations Step to Onboarding**
Add a dedicated step where users select from the broader specialization categories.

### **Option 3: Keep Current (Simplest)**
Auto-assign all role-based specializations, let users refine on profile page. ✅ **Current approach**

## ✅ **Documentation Updated**
- ✅ `ONBOARDING_DATA_MAPPING.md` - Added specializations mapping section
- ✅ `SPECIALIZATIONS_TRACKING.md` - This document
- ✅ Code comments in `onboarding-utils.ts`

## ✅ **Deployment Notes**

**No Migration Required** - The `practitioner_specializations` table and `specializations` table already exist.

**Existing Users** - Will need to manually add specializations on their profile page, OR run a backfill script to auto-assign based on their role.

**New Users** - Will automatically get specializations assigned during onboarding completion.

