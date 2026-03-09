# User Roles Audit - Platform Expectations vs Implementation

## 🔍 **Summary**

**CRITICAL MISMATCH FOUND:** The TypeScript type system and database schema are inconsistent regarding nullable user roles.

---

## ✅ **What's Correct**

### Database Schema (Supabase)
```sql
-- Enum values in database:
1. sports_therapist
2. massage_therapist
3. osteopath
4. client
5. admin

-- user_role column: ALLOWS NULL
ALTER TABLE public.users ALTER COLUMN user_role DROP NOT NULL;
```

### TypeScript Context (AuthContext.tsx)
```typescript
user_role: 'sports_therapist' | 'massage_therapist' | 'osteopath' | 'client' | 'admin' | null;
```

✅ **MATCHES DATABASE** - Correctly allows `null`

---

## ❌ **What's Broken**

### TypeScript Types (types/roles.ts)
```typescript
export type UserRole = 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath' | 'admin';
```

❌ **DOES NOT ALLOW NULL** - Type mismatch!

### Impact:
1. **Type Safety Broken:** Functions expecting `UserRole` fail when passed `null`
2. **Runtime Errors:** Code assumes `user_role` is always defined
3. **OAuth Users:** All new OAuth signups have `user_role = null` initially
4. **Role Selection Flow:** Depends on null role detection

---

## 📊 **Current Database State**

### Users with NULL roles:
```sql
-- Query result:
{
  "id": "a684e084-418a-4204-8a4a-13c69e13d7c9",
  "email": "raymancapital1@gmail.com",
  "user_role": null,  ← PROBLEM!
  "onboarding_status": "pending",
  "profile_completed": false
}
```

**Finding:** At least 1 user has `user_role = null` in production

---

## 🔄 **How the System Should Work**

### Registration Flow:
1. **User signs up** (email or OAuth)
2. **user_role = NULL** initially
3. **Redirect to Role Selection** page
4. **User selects role** (sports_therapist, massage_therapist, osteopath, or client)
5. **user_role updated** in database
6. **Redirect to Onboarding** with selected role

### Current Implementation:
- ✅ Database allows NULL
- ✅ AuthContext handles NULL
- ❌ Type system doesn't allow NULL
- ❌ Helper functions assume non-null
- ⚠️ Some components handle NULL, some don't

---

## 🐛 **Where This Breaks**

### 1. Type System Functions
```typescript
// roles.ts
export const isPractitioner = (role: UserRole): boolean => 
  ['sports_therapist', 'massage_therapist', 'osteopath'].includes(role);
```

**Problem:** If `role` is `null`, this throws a type error

### 2. Conditional Logic
```typescript
// Various components
const effectiveRole = userProfile?.user_role || roleFromUrl || null;
```

**Problem:** `effectiveRole` can be `null`, but components using it expect `UserRole`

### 3. Route Guards
```typescript
// AuthRouter.tsx - Line 135
// Check if user needs role selection (user_role is null)
```

**Problem:** Works, but type system complains

---

## 🔧 **Required Fixes**

### 1. Update TypeScript Types (CRITICAL)
```typescript
// types/roles.ts
export type UserRole = 
  | 'client' 
  | 'sports_therapist' 
  | 'massage_therapist' 
  | 'osteopath' 
  | 'admin' 
  | null;  // ← ADD THIS
```

### 2. Update Helper Functions
```typescript
export const isClient = (role: UserRole): boolean => role === 'client';

export const isPractitioner = (role: UserRole): boolean => 
  role !== null && ['sports_therapist', 'massage_therapist', 'osteopath'].includes(role);

export const hasRole = (role: UserRole): role is Exclude<UserRole, null> => 
  role !== null;
```

### 3. Add Null Guards
```typescript
export const hasPermission = (userRole: UserRole, permission: Permission): boolean => {
  if (!userRole) return false; // ← ADD THIS
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
};
```

### 4. Update Display Function
```typescript
export const getRoleDisplayName = (role: UserRole): string => {
  if (!role) return 'Role Not Selected'; // ← ADD THIS
  
  const displayNames: Record<Exclude<UserRole, null>, string> = {
    client: 'Client',
    sports_therapist: 'Sports Therapist',
    massage_therapist: 'Massage Therapist',
    osteopath: 'Osteopath',
    admin: 'Administrator',
  };
  return displayNames[role];
};
```

---

## 📋 **Migration History Analysis**

### Evolution of user_role column:

1. **20250116** - Made `user_role NOT NULL`, defaulted to 'client'
2. **20250820** - Repeated: Made `user_role NOT NULL`
3. **20250121** - **REVERSED:** Made `user_role NULLABLE` for OAuth
4. **20250125** - **CONFIRMED:** Always set to NULL initially

**Current State:** `user_role` IS NULLABLE

---

## 🎯 **Recommended Actions**

### Immediate (Critical):
1. ✅ Update `types/roles.ts` to include `null`
2. ✅ Add null guards to all helper functions
3. ✅ Update `ROLE_PERMISSIONS` to handle null
4. ✅ Test role selection flow end-to-end

### Short-term:
1. Audit all components using `UserRole` type
2. Add type guards where `null` is not expected
3. Update RouteGuard to handle null properly
4. Add tests for null role scenarios

### Long-term:
1. Consider renaming to `UserRole | null` → `MaybeUserRole`
2. Create separate type for "roles that exist" vs "role selection pending"
3. Document the role selection flow clearly
4. Add database constraint documentation

---

## 🧪 **Testing Checklist**

### Test Cases:
- [ ] New OAuth signup → role is null
- [ ] New email signup → role is null
- [ ] Role selection → role is set
- [ ] Onboarding with role → works
- [ ] Dashboard with role → works
- [ ] Dashboard without role → redirects to role selection
- [ ] Helper functions with null → don't crash
- [ ] Permissions check with null → returns false

---

## 📝 **Code Locations to Update**

1. ✅ `src/types/roles.ts` - Add `null` to `UserRole` type
2. ✅ `src/types/roles.ts` - Update all helper functions
3. ⚠️ `src/components/auth/AuthRouter.tsx` - Verify null handling
4. ⚠️ `src/pages/auth/Onboarding.tsx` - Verify null handling
5. ⚠️ `src/lib/dashboard-routing.ts` - Check route logic
6. ⚠️ All components using `isPractitioner()` or `isClient()`

---

## 🔒 **Database Constraints**

### Current Constraints:
```sql
-- user_role: NULLABLE ✅
-- onboarding_status: NOT NULL ✅
-- profile_completed: NOT NULL ✅

-- Expected flow:
-- user_role = NULL → pending role selection
-- user_role != NULL + onboarding_status = 'pending' → needs onboarding
-- user_role != NULL + onboarding_status = 'completed' → active user
```

---

## 💡 **Best Practice Recommendation**

### Option A: Keep Null (Current Approach)
```typescript
type UserRole = 'client' | 'sports_therapist' | ... | null;
```
**Pros:** Matches database, simple  
**Cons:** Requires null checks everywhere

### Option B: Separate Types (Recommended)
```typescript
type AssignedUserRole = 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath' | 'admin';
type UserRoleStatus = AssignedUserRole | null;

interface UserWithRole {
  user_role: AssignedUserRole;
}

interface UserPendingRole {
  user_role: null;
}
```
**Pros:** Type-safe, clear intent  
**Cons:** More complex types

---

## 🎯 **Conclusion**

**Current State:** TypeScript types do NOT match database schema

**Impact:** Medium-High (works but with type errors and potential runtime bugs)

**Recommendation:** Update `types/roles.ts` immediately to include `null` in `UserRole` type

**Priority:** 🔴 High - This affects the entire authentication and authorization system

