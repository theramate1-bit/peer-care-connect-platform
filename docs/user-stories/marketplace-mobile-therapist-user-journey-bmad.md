# Marketplace Mobile Therapist – User Journey (BMAD)

**Method:** [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)  
**Scope:** Marketplace discovery and booking for mobile / hybrid therapists  
**Status:** Reference for user-friendly, clear flows

---

## 1. Behaviour (What the user sees and does)

### 1.1 Marketplace cards

| Practitioner type   | Card hero (top image) | Location line (under name) |
|---------------------|-----------------------|----------------------------|
| **Clinic-based**    | Clinic photo or static map of clinic address | Clinic address (with map link) |
| **Mobile-only**     | **Radius visual**: “Travels to you” + “Serves within X km” + optional static map of base area. **No clinic image.** | “{Area} • Serves within X km” |
| **Hybrid**          | Clinic photo or static map of clinic | “{Clinic} • Also serves within X km” |

- **Radius visual** (mobile-only): Icon + concentric circles + “Travels to you • Serves within X km” and optional area label. Optionally backed by a faint static map of the practitioner’s base location. No clinic photo is shown so it’s clear they don’t have a clinic.

### 1.2 Discovery

- **Filters:** “Practitioner type” includes “Travels to you” (mobile) and “Clinic + Mobile” (hybrid).
- **Search by location:** User can enter an address or use “Use current location”. Results are limited by a search radius (default 25 km when “Search by location” is used). Practitioners show “X.X km away” when this search is active.
- **Mobile eligibility:** “Book Session” opens the **mobile request flow** only if the practitioner offers mobile services and (when location search is on) the user’s search point is within the practitioner’s **service radius** (mobile_service_radius_km). Otherwise clinic flow or “Out of service area” / “Mobile booking not configured” messaging.

### 1.3 Booking flows

- **Clinic-based or hybrid (clinic):** “Book Session” → standard **BookingFlow** (pick slot at clinic).
- **Mobile or hybrid (mobile), within radius:** “Book Session” → **MobileBookingRequestFlow** (request; practitioner accepts later).
- **Mobile/hybrid but out of radius:** Clear message that the practitioner doesn’t serve that area (no misleading “Book” that would fail later).

**Profile and direct links:** All entry points that can lead to a booking must route to the correct flow. **ProfileViewer** and **DirectBooking** (and ClientBooking, MySessions, MyBookings, ClientSessionDashboard where applicable) use the same rules: when the practitioner is **mobile-only**, the single CTA opens **MobileBookingRequestFlow** (address + practitioner accept). When the practitioner is **hybrid**, the UI shows two options (e.g. “Book at clinic” and “Request visit to my location”) so the user can choose; “Request visit to my location” opens **MobileBookingRequestFlow**. When **clinic-only**, the single CTA opens **BookingFlow**. This ensures clients never see the clinic flow (Select Service, Select Date, no address) for a mobile-only therapist.

---

## 2. User journey (step-by-step, user-friendly and clear)

### Journey A: Client finds a mobile therapist and requests a session

1. **Marketplace**
   - User sees practitioner type badges: “Clinic-based”, “Travels to you”, “Clinic + Mobile”.
   - **Mobile-only cards** show the radius visual (no clinic image) and “Serves within X km” so it’s obvious they travel.

2. **Optional: narrow by location**
   - User uses “Search by location” (address or current location).
   - Results are within the search radius; each card can show “X.X km away”.
   - Only practitioners whose **service radius** includes that point show “Book Session” for mobile.

3. **Open booking**
   - User clicks “Book Session” on a practitioner who has mobile (or hybrid) and is in range.
   - If only mobile: **MobileBookingRequestFlow** opens.
   - If hybrid: same mobile flow when they’re in the practitioner’s mobile radius.

4. **Mobile request flow (4 steps)**
   - **Step 1 – Service:** Choose mobile service (name, price, duration). No clinic slots.
   - **Step 2 – Date & time:** Pick date and preferred time (request only; practitioner confirms later).
   - **Step 3 – Your address:** Enter address where the session will take place. App shows distance from practitioner’s base and **service radius**; if outside radius, user cannot continue and sees a clear error.
   - **Step 4 – Review & pay:** Summary (service, date/time, address, distance). Guest users enter name, email, phone. User goes to Stripe to **authorise** payment (captured only if practitioner accepts).

5. **After submit**
   - User is told the practitioner can accept or decline. When the practitioner accepts, the session is confirmed and payment is captured.

### Journey B: Client finds a clinic-based therapist

1. **Marketplace**
   - Card shows clinic image or static map of clinic address; location line is the clinic address.

2. **Book Session**
   - Opens standard **BookingFlow**: pick date, see real availability, book a slot and pay. No “request” step; booking is confirmed when the slot is chosen.

---

## 3. Acceptance criteria (summary)

- **AC-Card-Mobile:** Mobile-only practitioners never show a clinic image on the marketplace card; they show the radius visual (“Travels to you”, “Serves within X km”, optional map of base area).
- **AC-Card-Radius:** Radius is visible on the card: text “Serves within X km” and a radius-style visual (e.g. concentric circles + icon) on mobile-only cards.
- **AC-Booking-Mobile:** Mobile/hybrid booking uses the request flow (date/time + client address, radius check, then payment authorisation; practitioner accepts before capture).
- **AC-Radius-Check:** If the client’s address is outside the practitioner’s service radius, the flow blocks submission and shows a clear, non-technical message.
- **AC-No-Clinic-Photo:** No clinic photo or clinic-address static map is used for practitioner type “mobile”; only the radius visual (and optional base-area map) is used.

---

## 4. Where in the codebase

| Element | Location |
|--------|----------|
| Which flow (clinic vs mobile) | `src/lib/booking-flow-type.ts` – `canBookClinic()`, `canRequestMobile()`, `defaultBookingFlowType()` |
| Card hero: clinic vs mobile | `Marketplace.tsx` – `isMobileOnly` → `MobileServiceAreaBlock` else clinic/location image |
| Radius visual block | `MobileServiceAreaBlock.tsx` |
| Location line text | `Marketplace.tsx` – `getLocationDisplay()` |
| Mobile request flow | `MobileBookingRequestFlow.tsx` |
| Radius check (client address) | `MobileBookingRequestFlow.tsx` (front-end); `create_mobile_booking_request` (backend) |
| Profile booking CTAs | `ProfileViewer.tsx` – uses `booking-flow-type`; “Book at clinic” / “Request visit to my location” or single CTA |
| Direct booking link | `DirectBooking.tsx` – uses `booking-flow-type`; renders BookingFlow or MobileBookingRequestFlow (or choice for hybrid) |
| Client booking list | `ClientBooking.tsx` – “At clinic” / “Request mobile” per card using `booking-flow-type` |

---

*This document keeps the mobile therapist journey consistent and user-friendly: clear visuals (radius, no clinic image for mobile-only), clear copy, and a single request-and-accept flow for mobile sessions.*
