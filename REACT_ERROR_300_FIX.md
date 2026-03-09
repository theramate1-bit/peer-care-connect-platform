# React Error #300 Fix - Hooks Ordering Issue

## 🐛 Problem
User encountered React error #300: "Rendered more hooks than during the previous render"

**Error Message:**
```
Error: Minified React error #300
```

## 🔍 Root Cause
In `Onboarding.tsx` Step 6, the `LocationSetup` component was conditionally rendered using a ternary operator:

```tsx
{formData.location && formData.latitude && formData.longitude ? (
  <div>
    {/* Confirmation card - NO component, NO hooks */}
  </div>
) : (
  <LocationSetup ... /> {/* Component with INTERNAL HOOKS */}
)}
```

**The Issue:**
- When location was **NOT set**: `LocationSetup` component rendered → Its hooks were called
- When location **WAS set**: Only JSX rendered → No hooks called
- When user clicked "Change location": `LocationSetup` appeared again → Hooks suddenly called
- **React sees different hook counts between renders** → Error #300 ❌

## 💡 Solution
**Always render the `LocationSetup` component** but control its **visibility** with CSS:

```tsx
{/* Confirmation card - conditionally shown */}
{formData.location && formData.latitude !== null && formData.longitude !== null && (
  <div className="space-y-4">
    {/* Confirmation UI */}
  </div>
)}

{/* LocationSetup - ALWAYS rendered, but hidden with CSS when not needed */}
<div style={{ display: (formData.location && formData.latitude !== null && formData.longitude !== null) ? 'none' : 'block' }}>
  <LocationSetup ... />
</div>
```

## ✅ Why This Works
1. **Hooks are ALWAYS called**: `LocationSetup` component always exists in the render tree
2. **CSS controls visibility**: `display: none` hides it visually when location is confirmed
3. **Consistent hook order**: React sees the same hooks on every render
4. **React's Rules of Hooks satisfied**: No conditional hook calls ✅

## 🎓 React Rules of Hooks
From React documentation:
- ✅ **DO**: Call hooks at the top level (unconditionally)
- ❌ **DON'T**: Call hooks inside conditions, loops, or after early returns
- ✅ **DO**: Use CSS or conditional rendering of JSX *content*, not components with hooks
- ❌ **DON'T**: Conditionally render components that contain hooks

## 📝 Changes Made
**File**: `peer-care-connect/src/pages/auth/Onboarding.tsx`
- **Lines 1251-1348**: Changed ternary operator to separate conditional blocks
- **Line 1251**: Changed condition to use `&&` for confirmation card
- **Line 1351**: Always render `LocationSetup` wrapped in a `div` with conditional `display` style

## 🧪 Testing
✅ No linting errors
✅ Component always renders with consistent hook count
✅ UX remains identical (location confirmation still works)
✅ "Change location" button toggles visibility correctly

## 📚 Additional Resources
- [React Error Decoder #300](https://reactjs.org/docs/error-decoder.html?invariant=300)
- [Rules of Hooks](https://reactjs.org/docs/hooks-rules.html)
- [React Reconciliation](https://reactjs.org/docs/reconciliation.html)

---

**Fixed**: 2025-10-10  
**Status**: ✅ Resolved
