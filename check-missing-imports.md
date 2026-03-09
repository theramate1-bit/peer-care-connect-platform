# Missing Import Check Report

## Summary
This document tracks files that use UI components but may be missing the required imports.

## Files Checked (All Have Correct Imports)
- ✅ `src/components/marketplace/BookingFlow.tsx` - FIXED
- ✅ `src/pages/Marketplace.tsx`
- ✅ `src/components/marketplace/GuestBookingFlow.tsx`
- ✅ `src/components/booking/IntakeForm.tsx`
- ✅ `src/pages/Profile.tsx`
- ✅ `src/components/practitioner/ProductForm.tsx`
- ✅ `src/pages/public/PublicMarketplace.tsx`
- ✅ `src/components/marketplace/PractitionerCard.tsx`
- ✅ `src/components/onboarding/PaymentSetupStep.tsx`
- ✅ `src/pages/auth/RoleSelection.tsx`
- ✅ `src/pages/auth/Register.tsx`
- ✅ `src/components/session/UnifiedExtractionReview.tsx`
- ✅ `src/components/profiles/ProfileViewer.tsx`

## Files Still To Check
Based on grep results, these files use CardDescription/DialogDescription/AlertDescription and should be verified:

1. `src/pages/client/MySessions.tsx`
2. `src/pages/client/ClientBooking.tsx`
3. `src/pages/MyBookings.tsx`
4. `src/components/practice/AvailabilitySettings.tsx`
5. `src/components/onboarding/AvailabilitySetup.tsx`
6. `src/pages/practice/CalendarSettings.tsx`
7. `src/pages/settings/SettingsSubscription.tsx`
8. `src/pages/practice/AppointmentScheduler.tsx`
9. `src/pages/auth/Onboarding.tsx`
10. `src/pages/practice/PracticeClientManagement.tsx`
11. `src/components/practice/PatientTransfer.tsx`
12. `src/components/session/UnifiedProgressModal.tsx`
13. `src/components/practice/PatientHistoryRequestList.tsx`
14. `src/components/practice/PractitionerHEPProgress.tsx`
15. `src/pages/client/ClientNotes.tsx`
16. `src/components/practice/PatientHistoryRequest.tsx`
17. `src/components/practice/HEPEditor.tsx`
18. `src/components/practice/HEPCreator.tsx`

## Common Patterns to Check

### CardDescription
- Used in: `<CardDescription>...</CardDescription>`
- Should import: `CardDescription` from `@/components/ui/card`
- Check: `import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';`

### DialogDescription
- Used in: `<DialogDescription>...</DialogDescription>`
- Should import: `DialogDescription` from `@/components/ui/dialog`
- Check: `import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';`

### AlertDescription
- Used in: `<AlertDescription>...</AlertDescription>`
- Should import: `AlertDescription` from `@/components/ui/alert`
- Check: `import { Alert, AlertDescription } from '@/components/ui/alert';`

### AlertDialogDescription
- Used in: `<AlertDialogDescription>...</AlertDialogDescription>`
- Should import: `AlertDialogDescription` from `@/components/ui/alert-dialog`
- Check: `import { AlertDialog, AlertDialogContent, AlertDialogDescription, ... } from '@/components/ui/alert-dialog';`

## How to Check a File

1. Search for usage: `grep -n "CardDescription\|DialogDescription\|AlertDescription" <file>`
2. Check imports: `grep -n "import.*CardDescription\|import.*DialogDescription\|import.*AlertDescription" <file>`
3. If usage exists but import is missing, add the missing import to the import statement

## Example Fix

**Before (Broken):**
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// ... later in code ...
<CardDescription>Some text</CardDescription>
```

**After (Fixed):**
```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// ... later in code ...
<CardDescription>Some text</CardDescription>
```

