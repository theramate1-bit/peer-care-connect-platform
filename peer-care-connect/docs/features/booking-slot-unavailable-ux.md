# Booking flow: slot-unavailable UX and back-and-forth (5‑minute window)

## Purpose

When a user selects a time slot and moves through the booking flow (review → payment/pre-assessment), the slot can become unavailable because:
- Another user booked it.
- The practitioner blocked the time.
- The 5‑minute reservation expired.

This doc describes **user flows** for users who go back and forth in the 5‑minute window, the **current behavior**, **UX gaps**, and **changes** aligned with established practices (e.g. Nielsen Norman Group error recovery, Baymard booking UX).

---

## User flows (simplified)

### Flow A – Proceed then slot taken

1. User on **step 1**: selects service, date, time → clicks **Next**.
2. **Step 2** (review / policy): user reviews, accepts policy.
3. User clicks **Confirm / Pay** → **handleBooking** runs:
   - Conflict check (existing bookings + slot_holds, with buffer).
   - If **conflict** → toast: *"This time slot is no longer available. Please select another time. Another booking may have been created while you were completing the form."* → **setStep(1)**.
   - If no conflict → create session (5‑min `expires_at`), set **sessionId** / **bookingExpiresAt**, move to step 3 (pre‑assessment) or 4 (payment).
4. **Issue**: After setStep(1), the previously selected date/time is **not cleared**. User is on step 1 with the same slot still selected and can click **Next** again → same conflict and toast.

### Flow B – Back to time selection

1. User on **step 2** or **step 3/4** (payment) → clicks **Back** to step 1.
2. **handleBack** runs:
   - Only **blocks** are checked (`getOverlappingBlocks`), not other **bookings** or **slot_holds**.
   - If blocked → toast and clear **start_time** (date left as-is).
   - If not blocked → setStep(1), selection unchanged.
3. **Issue**: If someone else booked the slot while the user was on step 2/3/4, we do **not** detect it on **Back**. We only detect it when they click the main CTA again (handleBooking). So they can go Back, see the same slot still selected, click Next, then get the conflict toast.

### Flow C – 5‑minute expiry

1. Session created → **bookingExpiresAt** set (e.g. 5 minutes).
2. **BookingExpirationTimer** shows countdown; at 0 it calls **onExpired**.
3. **handleBookingExpired**: setStep(1), clear sessionId/bookingExpiresAt, toast *"Your booking reservation has expired. Please select a new time slot and try again."*
4. **Issue**: Same as Flow A — after expiry we setStep(1) but do **not** clear **session_date** / **start_time**, so the calendar still shows the expired slot as selected.

### Flow D – Proceed again after going back

1. User on step 4 (payment) → **Back** → step 3 → **Next** (or similar).
2. **handleBooking** runs again (conflict check, then create or error).
3. Conflict is re-checked on each **handleBooking**; RPC also validates. So if the slot was taken in the meantime, they get the conflict toast and setStep(1) again — but again with the stale selection left in place.

---

## Best practices applied (NNG / industry)

- **Error recovery (NNG)**: Help users **recognize**, **diagnose**, and **recover**. After an error, put the UI in a state that supports recovery (e.g. clear invalid choice so they must pick a valid one).
- **Proximity**: Show feedback near the relevant control (e.g. inline message on the time-selection step when returned due to slot unavailable).
- **Actionable message**: We already say *"Please select another time"*; the UI should make that action possible without re-submitting the same invalid slot (clear selection).
- **Consistency**: Apply the same “slot no longer available” logic whether we detect conflict on **proceed** or when user **goes back** to step 1 (so Back is “smart” too).

---

## Recommended UX changes (implemented or to implement)

1. **Clear selection when returning to step 1 due to slot unavailable**
   - When we **setStep(1)** after:
     - conflict (hasConflict),
     - blocked slot,
     - RPC conflict (CONFLICT_BOOKING / CONFLICT_BLOCKED),
     - or **handleBookingExpired**,
   - also clear **session_date** and **start_time** so the user must choose a new slot. Prevents repeated “Next” with the same invalid slot.

2. **Contextual message on step 1**
   - When the user lands on step 1 because the slot was unavailable (conflict/block/expiry), show a short **inline** message on the time-selection step, e.g. *"The selected time is no longer available. Please choose a new date and time."* (in addition to the toast). Clear this message when they change date/time or leave step 1.

3. **Re-validate on Back to step 1 (optional)**
   - In **handleBack**, when **newStep === 1** and the user has a selected slot, run the **full** conflict check (bookings + slot_holds), not only blocks. If conflict, clear the slot and show the same “This time slot is no longer available” toast so that “going back” also updates the selection state and avoids a dead-end on the next Next.

4. **Keep existing toasts**
   - Keep the current toast text and duration; add the above state clearing and optional inline hint so recovery is clear and consistent.

---

## Files touched

- **BookingFlow.tsx**: handleBooking (conflict/block/RPC conflict) and handleBookingExpired → clear `bookingData.session_date` and `bookingData.start_time` when setStep(1); optional `slotUnavailableReturned` and inline hint on step 1; optional full conflict check in handleBack.
- **GuestBookingFlow.tsx**: Same clearing and optional hint when setStep(1) due to slot unavailable; optional full conflict check in handleBack.

---

## References

- [Nielsen Norman Group – Error Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/)
- [NNG – 10 Design Guidelines for Reporting Errors in Forms](https://www.nngroup.com/articles/errors-forms-design-guidelines/)
- [NNG – Preventing User Errors: Avoiding Conscious Mistakes](https://www.nngroup.com/articles/user-mistakes/)
- Baymard Institute: checkout and booking flow studies (error recovery, form validation).
