# Booking Mode UX Consistency Audit (Post-Implementation, MCP-Aligned)

Date: 2026-03-08  
Scope: clinic vs mobile vs hybrid booking behavior across public, marketplace, direct, profile, and client entry points.
Last re-verified: 2026-03-08 (after AC-09 location rule + scoped AC-06 hybrid CTA updates)

## Supabase MCP Verification

Re-verified via Supabase MCP (`execute_sql`) against production RPC signatures:

- `create_booking_with_validation` exists (including overload with `p_appointment_type` and `p_visit_address`).
- `create_mobile_booking_request` exists for dedicated mobile request creation.
- `accept_mobile_booking_request` and `get_practitioner_mobile_requests` exist and are active.

Conclusion: backend mode separation remains intact and aligned with current frontend flow wiring.

Latest MCP re-check confirms these signatures are still present:

- `create_booking_with_validation` (both overloads, including `p_appointment_type`, `p_visit_address`)
- `create_mobile_booking_request`
- `accept_mobile_booking_request`
- `get_practitioner_mobile_requests`

## Implementation Status of Prior Findings

1. **High (Resolved): Public therapist page bypassing mode-aware flow**
   - Current state: `PublicTherapistProfile` now uses `HybridBookingChooser`, `BookingFlow` / `GuestBookingFlow`, and `MobileBookingRequestFlow`.
   - Result: legacy `UnifiedBookingModal` bypass on this route is removed.
   - Evidence:
     - `search src/ for public therapist profile (if present)`
     - `search src/ + native profilePublicPractitionerProfileContent.tsx`

2. **Medium (Resolved): Marketplace-only mobile pre-search gate**
   - Current state: marketplace no longer hard-disables mobile entry pending geo-search.
   - Result: mobile entry behavior is now aligned with other surfaces (validation happens inside mobile flow).
   - Evidence:
     - `src/pages/discovery/TherapistSearch.tsx + src/pages/client/ClientBooking.tsx`

3. **Medium (Resolved): Hybrid chooser standardization**
   - Current state: shared `HybridBookingChooser` is used across marketplace, direct booking, profile viewer, client booking, and public therapist page.
   - Marketplace hybrid chooser now follows inline pattern in smart and traditional paths (no separate chooser dialog path).
   - Evidence:
     - `native explore choose-mode + web BookingFlow routing (search repo)`
     - `src/pages/discovery/TherapistSearch.tsx + src/pages/client/ClientBooking.tsx`
     - `search src/ for direct booking / slug routes`
     - `search src/ + native profileProfileViewer.tsx`
     - `src/pages/client/ClientBooking.tsx`
     - `search src/ for public therapist profile (if present)`

4. **Medium (Resolved): Wrong-flow recovery callback wiring gaps**
   - Current state: `onRedirectToMobile` is now wired where clinic booking flows are opened (including profile viewer and client booking).
   - Result: stale mode mismatches can reroute to mobile flow consistently.
   - Evidence:
     - `search src/ + native profileProfileViewer.tsx`
     - `src/pages/client/ClientBooking.tsx`
     - `src/pages/discovery/TherapistSearch.tsx + src/pages/client/ClientBooking.tsx`
     - `search src/ for direct booking / slug routes`
     - `search src/ for public therapist profile (if present)`

5. **Low (Partial): CTA language drift**
   - Current state: hybrid-choice labels are explicitly standardized (`Book at Clinic`, `Request Visit to My Location`) in shared chooser contexts, including client booking and profile viewer.
   - Result: hybrid semantics are consistent; non-hybrid generic labels still exist on some single-mode CTA branches.
   - Evidence:
     - `src/pages/client/ClientBooking.tsx`
     - `search src/ + native profileProfileViewer.tsx`
     - `src/pages/discovery/TherapistSearch.tsx + src/pages/client/ClientBooking.tsx`

6. **Low (Open): Guest clinic local state still carries `location`**
   - Current state: local state still includes `location` in guest clinic flow despite clinic RPC semantics.
   - Result: harmless but indicates leftover model split in UI state.
   - Evidence:
     - `src/components/booking/BookingFlow.tsx (guestMode)`

## Updated Mode Audit

| Mode   | Expected UX                                                                          | Confirmed Current UX                                                                                                               | Status            |
| ------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Clinic | Clear direct booking flow, clinic context, session created through clinic path       | All primary entry surfaces now use mode-aware booking entry and clinic flow where applicable                                       | Mostly consistent |
| Mobile | Clear request flow with address, pre-assessment, payment hold, accept/decline        | Core flow and entry policy are now consistent across surfaces; wrong-flow reroute is wired                                         | Mostly consistent |
| Hybrid | Always explicit modality choice (`Book at Clinic` vs `Request Visit to My Location`) | Shared chooser component and inline interaction pattern are now used across the main entry surfaces; minor copy differences remain | Mostly consistent |

## Remaining Recommendations

1. Standardize final CTA taxonomy on all surfaces (`Book` for direct, `Request` for approval flow).
2. Remove stale guest clinic `location` state if no longer needed in payload/logic.

## Residual Risk

- Guest clinic local state still carries `location` despite clinic RPC semantics in `src/components/booking/BookingFlow.tsx (guestMode)`.

## Related Post-Booking Docs

- `docs/product/POST_BOOKING_REMEDIATION_TABLE.md`
- `docs/product/POST_BOOKING_REMEDIATION_BACKLOG_TEMPLATE.md`
