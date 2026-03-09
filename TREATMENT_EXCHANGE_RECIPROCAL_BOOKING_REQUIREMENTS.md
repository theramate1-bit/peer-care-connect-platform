# Treatment Exchange Reciprocal Booking - Requirements & Implementation Plan

## 📋 Summary of Requirements (from conversation)

Based on the conversation, here are the key requirements for the treatment exchange acceptance flow:

1. **When a therapist receives a treatment exchange request:**
   - ✅ They should be able to **view the requester's services** (IMPLEMENTED)
   - ✅ They should be able to **accept/decline** (IMPLEMENTED)
   - ❌ They need to **select a date and time for THEIR OWN treatment** (NOT IMPLEMENTED - currently uses same date/time as requested session)
   - ✅ Sessions don't have to be on the same day (DESIGN SUPPORTS THIS, BUT UI DOESN'T)

2. **Reciprocal booking should work like booking a normal service:**
   - Use existing calendar availability checking
   - Show available time slots based on requester's availability
   - Allow recipient to pick any available date/time (not restricted to same day)

3. **Current Issue:**
   - The `ExchangeAcceptanceModal` currently uses the **same date/time** as the requested session for the reciprocal booking
   - No date/time picker for recipient to select their preferred time
   - This violates the requirement that "they need to select a date and time for when they wish to have their treatment"

---

## 🎯 Action Points

### **Action Point 1: Add Date/Time Selection to ExchangeAcceptanceModal**
**Priority:** HIGH  
**Status:** NOT STARTED

**What needs to be done:**
- Add a date picker component to select the reciprocal booking date
- Add a time slot selector that shows available times for the requester (the person providing the service)
- Integrate with existing availability checking logic (similar to `BookingFlow.tsx`)
- Ensure the selected date/time is used for the reciprocal booking instead of the requested session date/time

**Files to modify:**
- `src/components/treatment-exchange/ExchangeAcceptanceModal.tsx`

**Code changes needed:**
1. Add state for reciprocal booking date/time
2. Add date picker UI component
3. Add time slot fetching logic (reuse from `BookingFlow.tsx`)
4. Update `handleAccept` to use selected date/time instead of requested session date/time

---

### **Action Point 2: Integrate Availability Checking**
**Priority:** HIGH  
**Status:** NOT STARTED

**What needs to be done:**
- Fetch requester's availability (they're providing the service, so check their calendar)
- Check for existing bookings on selected date
- Check for blocked/unavailable time
- Generate available time slots based on service duration

**Files to modify:**
- `src/components/treatment-exchange/ExchangeAcceptanceModal.tsx`

**Code to reuse:**
- `fetchAvailableTimeSlots` logic from `BookingFlow.tsx` (lines 202-310)
- `getBlocksForDate` utility from `src/lib/block-time-utils.ts`
- Availability checking from `practitioner_availability` table

---

### **Action Point 3: Update bookReciprocalExchange Function**
**Priority:** MEDIUM  
**Status:** PARTIALLY DONE

**What needs to be done:**
- Ensure `bookReciprocalExchange` accepts and uses the selected date/time
- Verify it correctly creates the reciprocal booking with the recipient's chosen date/time
- Ensure it doesn't enforce same-day requirement

**Files to check:**
- `src/lib/treatment-exchange.ts` (lines 1080-1207)

**Current status:**
- Function already accepts `bookingData` with `session_date` and `start_time`
- ✅ No same-day enforcement in code
- ✅ Correctly uses provided date/time

---

### **Action Point 4: Update UI Flow**
**Priority:** HIGH  
**Status:** NOT STARTED

**What needs to be done:**
- Update modal to show two-step process:
  1. Step 1: Select service (current)
  2. Step 2: Select date/time for reciprocal booking (NEW)
- Add clear messaging that recipient is booking THEIR treatment
- Show requester's availability clearly

**Files to modify:**
- `src/components/treatment-exchange/ExchangeAcceptanceModal.tsx`

---

## 📝 Detailed Code Edits

### **Edit 1: ExchangeAcceptanceModal.tsx - Add Date/Time Selection State**

**Location:** After line 46

```typescript
// Add new state variables
const [reciprocalBookingDate, setReciprocalBookingDate] = useState<string>('');
const [reciprocalBookingTime, setReciprocalBookingTime] = useState<string>('');
const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
```

---

### **Edit 2: ExchangeAcceptanceModal.tsx - Add Availability Fetching Function**

**Location:** After `calculateCreditCost` function (around line 135)

```typescript
const fetchAvailableTimeSlots = async () => {
  if (!reciprocalBookingDate || !selectedService) {
    setAvailableTimeSlots([]);
    return;
  }

  setLoadingTimeSlots(true);
  try {
    const serviceDuration = selectedService.duration_minutes || 60;
    
    // Get requester's availability (they're providing the service)
    const { data: availability, error: availabilityError } = await supabase
      .from('practitioner_availability')
      .select('working_hours, timezone')
      .eq('user_id', requesterId)
      .maybeSingle();

    if (availabilityError || !availability) {
      // Use default hours if no availability configured
      await generateDefaultTimeSlots(serviceDuration);
      return;
    }

    // Get existing bookings for the selected date
    const { data: existingBookings, error: bookingsError } = await supabase
      .from('client_sessions')
      .select('start_time, duration_minutes, status, expires_at')
      .eq('therapist_id', requesterId)
      .eq('session_date', reciprocalBookingDate)
      .in('status', ['scheduled', 'pending_payment', 'confirmed']);

    if (bookingsError) throw bookingsError;

    // Get blocked/unavailable time for this date
    const { getBlocksForDate } = await import('@/lib/block-time-utils');
    const blocks = await getBlocksForDate(requesterId, reciprocalBookingDate);

    // Get day of week
    const selectedDate = new Date(reciprocalBookingDate);
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const daySchedule = availability.working_hours[dayOfWeek];

    if (!daySchedule || !daySchedule.enabled) {
      setAvailableTimeSlots([]);
      return;
    }

    // Generate time slots (similar to BookingFlow.tsx logic)
    const timeSlots: string[] = [];
    const [startHour, startMinute] = daySchedule.start.split(':').map(Number);
    const [endHour, endMinute] = daySchedule.end.split(':').map(Number);
    
    // ... (implement time slot generation logic similar to BookingFlow.tsx:252-310)
    
    setAvailableTimeSlots(timeSlots);
  } catch (error) {
    console.error('Error fetching available time slots:', error);
    toast.error('Failed to load available times');
  } finally {
    setLoadingTimeSlots(false);
  }
};

const generateDefaultTimeSlots = async (duration: number) => {
  // Default: 9 AM - 5 PM, 30-minute intervals
  const slots: string[] = [];
  for (let hour = 9; hour < 17; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  setAvailableTimeSlots(slots);
};
```

---

### **Edit 3: ExchangeAcceptanceModal.tsx - Add useEffect to Fetch Time Slots**

**Location:** After the existing useEffect hooks (around line 77)

```typescript
// Fetch available time slots when date or service changes
useEffect(() => {
  if (reciprocalBookingDate && selectedService) {
    fetchAvailableTimeSlots();
  } else {
    setAvailableTimeSlots([]);
  }
}, [reciprocalBookingDate, selectedService]);
```

---

### **Edit 4: ExchangeAcceptanceModal.tsx - Update handleAccept Function**

**Location:** Replace lines 166-184

```typescript
// Then, create reciprocal booking with SELECTED date/time (not requested session date/time)
if (!reciprocalBookingDate || !reciprocalBookingTime) {
  toast.error('Please select a date and time for your treatment');
  return;
}

// Calculate end time for reciprocal booking
const startTime = new Date(`${reciprocalBookingDate}T${reciprocalBookingTime}`);
const endTime = new Date(startTime.getTime() + selectedService.duration_minutes * 60000);
const endTimeString = format(endTime, 'HH:mm:ss');

// Create reciprocal booking with recipient's selected date/time
await TreatmentExchangeService.bookReciprocalExchange(
  requestId,
  recipientId,
  {
    session_date: reciprocalBookingDate, // Use selected date, not requested date
    start_time: reciprocalBookingTime,   // Use selected time, not requested time
    end_time: endTimeString,
    duration_minutes: selectedService.duration_minutes || 60,
    session_type: selectedService.name,
    notes: `Treatment exchange - ${selectedService.name}`
  }
);
```

---

### **Edit 5: ExchangeAcceptanceModal.tsx - Add Date/Time Selection UI**

**Location:** After the "Service Selection" section (around line 278), before "Selected Service Details"

```typescript
{/* Reciprocal Booking Date/Time Selection */}
{selectedService && (
  <div className="space-y-4">
    <div>
      <Label htmlFor="reciprocal-date">Select Date for Your Treatment *</Label>
      <Input
        id="reciprocal-date"
        type="date"
        value={reciprocalBookingDate}
        onChange={(e) => setReciprocalBookingDate(e.target.value)}
        min={new Date().toISOString().split('T')[0]}
        className="mt-1"
      />
      <p className="text-xs text-muted-foreground mt-1">
        Select when you'd like to receive your treatment from {requesterName}
      </p>
    </div>

    {reciprocalBookingDate && (
      <div>
        <Label htmlFor="reciprocal-time">Select Time *</Label>
        {loadingTimeSlots ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading available times...</span>
          </div>
        ) : availableTimeSlots.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">
            No available times for this date. Please select another date.
          </div>
        ) : (
          <Select
            value={reciprocalBookingTime}
            onValueChange={setReciprocalBookingTime}
          >
            <SelectTrigger id="reciprocal-time">
              <SelectValue placeholder="Select a time" />
            </SelectTrigger>
            <SelectContent>
              {availableTimeSlots.map((time) => (
                <SelectItem key={time} value={time}>
                  {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    )}
  </div>
)}
```

---

### **Edit 6: ExchangeAcceptanceModal.tsx - Update Button Disabled Condition**

**Location:** Line 363, update disabled condition

```typescript
disabled={loading || !selectedService || !hasSufficientCredits || checkingCredits || !reciprocalBookingDate || !reciprocalBookingTime}
```

---

### **Edit 7: ExchangeAcceptanceModal.tsx - Update Info Note**

**Location:** Around line 344-354, update the info text

```typescript
<div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
  <div className="flex items-start gap-2">
    <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
    <div className="text-sm text-blue-900 dark:text-blue-100">
      <p className="font-medium mb-1">How Treatment Exchange Works:</p>
      <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
        <li>Credits are only deducted when both practitioners have confirmed their sessions</li>
        <li>You're booking a {selectedService?.duration_minutes || requestedDuration}-minute session with {requesterName}</li>
        <li>They've requested a {requestedDuration}-minute session with you on {format(new Date(requestedSessionDate), 'MMM dd, yyyy')} at {format(new Date(`2000-01-01T${requestedStartTime}`), 'h:mm a')}</li>
        <li>Select when you'd like to receive your treatment (doesn't have to be the same day)</li>
        <li>Both sessions will be scheduled once you accept</li>
      </ul>
    </div>
  </div>
</div>
```

---

## 🔍 Additional Considerations

### **1. Calendar Component**
Consider using a calendar component (like `react-day-picker` or similar) instead of a basic date input for better UX.

### **2. Time Slot Display**
Consider showing time slots in a grid format (like `BookingFlow.tsx`) instead of a dropdown for better visibility.

### **3. Validation**
Add validation to ensure:
- Selected date is not in the past
- Selected time slot is actually available
- Selected time allows for full service duration

### **4. Error Handling**
Handle cases where:
- Requester has no availability configured
- No time slots available for selected date
- Time slot becomes unavailable between selection and booking

### **5. User Experience**
- Show loading states clearly
- Provide helpful error messages
- Guide user through the process step-by-step

---

## ✅ Testing Checklist

After implementation, test:

- [ ] Recipient can select a date for their treatment
- [ ] Recipient can select a time slot from available times
- [ ] Available times respect requester's availability
- [ ] Available times exclude existing bookings
- [ ] Available times exclude blocked time
- [ ] Reciprocal booking is created with selected date/time (not requested date/time)
- [ ] Sessions can be on different days
- [ ] Credits are deducted correctly when both sessions are confirmed
- [ ] Error handling works for edge cases

---

## 📚 Related Files

- `src/components/treatment-exchange/ExchangeAcceptanceModal.tsx` - Main component to modify
- `src/lib/treatment-exchange.ts` - Service functions (already correct)
- `src/components/marketplace/BookingFlow.tsx` - Reference for availability checking
- `src/lib/block-time-utils.ts` - Utility for checking blocked time
- `src/components/marketplace/TreatmentExchangeBookingFlow.tsx` - Reference for treatment exchange booking flow

---

## 🚀 Implementation Priority

1. **HIGH:** Add date/time selection UI and logic
2. **HIGH:** Integrate availability checking
3. **MEDIUM:** Improve UX with better calendar/time picker components
4. **LOW:** Add advanced features (recurring availability, time zone handling)

