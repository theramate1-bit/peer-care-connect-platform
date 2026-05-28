# Mobile & Hybrid Therapist Booking Flow
## How Mobile and Hybrid Therapists Know Where to Go

**Date:** February 2025  
**Status:** ✅ **IMPLEMENTED**

---

## 🎯 **OVERVIEW**

This document explains the complete booking flow for **mobile therapists** and **hybrid therapists** (who offer both clinic and mobile services), including how they receive location information and navigate to client addresses.

---

## 📋 **BOOKING FLOW SUMMARY**

### **Therapist Types:**

1. **Mobile Therapist** (`therapist_type: 'mobile'`)
   - Only offers mobile services (travels to clients)
   - Has `base_address`, `base_latitude`, `base_longitude`
   - Has `mobile_service_radius_km`

2. **Hybrid Therapist** (`therapist_type: 'hybrid'`)
   - Offers BOTH clinic and mobile services
   - Has `clinic_address`, `clinic_latitude`, `clinic_longitude` (for clinic bookings)
   - Has `base_address`, `base_latitude`, `base_longitude` (for mobile bookings)
   - Has `mobile_service_radius_km` (for mobile service area)

3. **Clinic-Based Therapist** (`therapist_type: 'clinic_based'`)
   - Only offers clinic services (clients come to clinic)
   - Uses standard `BookingFlow` (not covered in this doc)

---

### **1. Client/Guest Initiates Mobile Booking**

**Location:** `src/components/marketplace/MobileBookingRequestFlow.tsx`

**For Mobile Therapists:**
- Client sees **"Request Mobile Session"** button on marketplace
- Opens `MobileBookingRequestFlow` modal

**For Hybrid Therapists:**
- Client sees **TWO buttons** on marketplace:
  - **"Book Clinic Session"** → Opens `BookingFlow` (standard clinic booking)
  - **"Request Mobile Session"** → Opens `MobileBookingRequestFlow` (mobile request)
- Client chooses which type of service they want

**Mobile Booking Process:**
1. Client/guest selects a mobile or hybrid therapist from marketplace
2. Clicks **"Request Mobile Session"** button
3. Chooses a mobile service (service_type: 'mobile' or 'both')
4. Selects date and time
5. **Enters their address** using `SmartLocationPicker` component
   - Address is geocoded to get latitude/longitude coordinates
   - **Distance from practitioner's base** is calculated automatically (uses `base_latitude`/`base_longitude`)
   - Validates that address is within practitioner's service radius
6. Optionally adds notes (parking instructions, access codes, etc.)
7. For guests: Provides name, email, phone, marketing consent
8. Payment authorization is held (not captured yet)
9. Mobile booking request is created in database

**Data Stored:**
- `client_address` (full address string)
- `client_latitude` (decimal)
- `client_longitude` (decimal)
- `distance_from_base_km` (calculated distance from practitioner's **base address**)
- `client_notes` (optional instructions)

**Note for Hybrid Therapists:**
- Mobile bookings use `base_address`/`base_latitude`/`base_longitude` for distance calculation
- Clinic bookings use `clinic_address`/`clinic_latitude`/`clinic_longitude` (different flow)

---

### **2. Practitioner Receives Notification**

**Email Notification:**
- **Template:** `booking_request_practitioner`
- **Location:** `supabase/functions/send-email/index.ts` (line 2922)
- **Content:**
  - Client name
  - Service type
  - Requested date and time
  - **Client address (clickable link)** ✅
  - Distance from base
  - Price
  - Link to review request in dashboard

**In-App Notification:**
- Notification created in database
- Practitioner sees notification badge
- Can click to go to mobile requests page

**Email Address Link:**
- Address is clickable: `https://maps.google.com/maps?q={address}`
- Opens device's default maps app (iOS: Apple Maps, Android: Google Maps)
- Desktop: Opens Google Maps in browser

---

### **3. Practitioner Views Request**

**Page:** `/practice/mobile-requests`  
**Component:** `src/components/practitioner/MobileRequestManagement.tsx`

**Information Displayed:**
- ✅ **Client Address** (clickable link with map icon)
  - Opens in maps app when clicked
  - Shows distance from practitioner's base
- ✅ Service details (name, duration, price)
- ✅ Date and time
- ✅ Client notes (parking, access codes, etc.)
- ✅ Client contact information

**Actions Available:**
- **Accept:** Captures payment, creates session
- **Decline:** Releases payment, optionally suggests alternate time
- **Resend Notification:** Resends email to practitioner

**Address Display:**
```tsx
<a href={generateMapsUrl(request.client_address)}>
  <MapPin /> {request.client_address} <ExternalLink />
</a>
```

---

### **4. Practitioner Accepts Request**

**Process:**
1. Practitioner clicks "Accept" button
2. Payment authorization is captured (converted to actual payment)
3. Mobile booking request status changes to 'accepted'
4. Session is automatically created
5. Client receives confirmation email with:
   - Session details
   - **Clickable address link** ✅
   - Practitioner contact info

**Accept Dialog:**
- Shows full request details
- **Address is clickable** ✅
- Shows distance from base
- Confirms payment capture

---

### **5. Session Confirmation & Reminders**

**Email Templates with Location:**
- `booking_confirmation_client` - Clickable address ✅
- `booking_confirmation_practitioner` - Clickable address ✅
- `session_reminder_24h` - Clickable address ✅
- `session_reminder_2h` - Clickable address ✅
- `session_reminder_1h` - Clickable address ✅

**All addresses are clickable links** that open in maps apps.

---

## 🗺️ **MAPS INTEGRATION**

### **Maps URL Generation**

**Function:** `src/emails/utils/maps.ts`

```typescript
generateMapsUrl(location: string): string
```

**Behavior:**
- Uses Apple Maps URL format (universal)
- iOS: Opens Apple Maps app
- Android: Opens Google Maps app
- Desktop: Opens Google Maps web

**Format:**
```
https://maps.apple.com/?q={encoded_address}
```

---

## 📱 **HOW THERAPISTS NAVIGATE**

### **Option 1: Click Address Link**
- In email notification → Click address → Opens maps app
- In dashboard → Click address → Opens maps app
- In accept dialog → Click address → Opens maps app

### **Option 2: Copy Address**
- Copy address text from email or dashboard
- Paste into any maps app manually

### **Option 3: Use Coordinates**
- Database stores `client_latitude` and `client_longitude`
- Can be used for precise navigation
- Currently displayed as distance calculation

---

## ✅ **CURRENT IMPLEMENTATION STATUS**

### **✅ Implemented:**
- ✅ Address collection with geocoding
- ✅ Distance calculation from base
- ✅ Email notifications with clickable addresses
- ✅ Dashboard display with clickable addresses
- ✅ Accept dialog with clickable address
- ✅ All confirmation/reminder emails with clickable addresses
- ✅ Client notes field for special instructions

### **📋 Data Available:**
- ✅ Full address string
- ✅ Latitude/longitude coordinates
- ✅ Distance from base
- ✅ Client notes (parking, access, etc.)

---

## 🔄 **COMPLETE FLOW DIAGRAM**

### **Mobile Therapist Flow:**
```
1. Client Books Mobile Session
   ↓
   [Enters Address] → Geocoded → Stored with lat/long
   ↓
2. Request Created
   ↓
   [Email Sent] → Practitioner receives notification
   ↓
3. Practitioner Views
   ↓
   [Dashboard] → Sees address (clickable) + distance from base + notes
   ↓
4. Practitioner Accepts
   ↓
   [Payment Captured] → Session Created
   ↓
5. Confirmation Sent
   ↓
   [Both receive emails] → With clickable addresses
   ↓
6. Session Day
   ↓
   [Reminder emails] → With clickable addresses
   ↓
7. Therapist Navigates
   ↓
   [Clicks address] → Opens maps app → Gets directions
```

### **Hybrid Therapist Flow:**
```
1. Client Chooses Service Type
   ├─→ "Book Clinic Session" → BookingFlow → Clinic address shown
   └─→ "Request Mobile Session" → MobileBookingRequestFlow
       ↓
       [Enters Address] → Geocoded → Distance from BASE calculated
       ↓
2. Mobile Request Created
   ↓
   [Email Sent] → Practitioner receives notification
   ↓
3. Practitioner Views
   ↓
   [Dashboard] → Sees address (clickable) + distance from BASE + notes
   ↓
4. Practitioner Accepts
   ↓
   [Payment Captured] → Session Created
   ↓
5. Confirmation Sent
   ↓
   [Both receive emails] → With clickable addresses
   ↓
6. Session Day
   ↓
   [Reminder emails] → With clickable addresses
   ↓
7. Therapist Navigates
   ↓
   [Clicks address] → Opens maps app → Gets directions
```

---

## 📧 **EMAIL EXAMPLES**

### **Practitioner Notification Email:**
```
New Mobile Booking Request

Client Address: [Clickable Link] 123 Test Street, London
Distance: 5.2 km from your base
```

### **Client Confirmation Email:**
```
Your mobile request was accepted!

Location: [Clickable Link] 123 Test Street, London
```

---

## 🎯 **KEY FEATURES**

1. **Clickable Addresses Everywhere**
   - Email notifications ✅
   - Dashboard view ✅
   - Accept dialog ✅
   - Confirmation emails ✅
   - Reminder emails ✅

2. **Distance Information**
   - Shows distance from practitioner's base
   - Helps therapist plan travel time
   - Validates service radius

3. **Client Notes**
   - Parking instructions
   - Access codes
   - Special directions
   - Building/floor information

4. **Coordinates Stored**
   - Precise location data
   - Can be used for advanced navigation
   - Enables distance calculations

---

## 🔍 **TECHNICAL DETAILS**

### **Database Schema:**
```sql
mobile_booking_requests (
  client_address TEXT,
  client_latitude NUMERIC,
  client_longitude NUMERIC,
  distance_from_base_km NUMERIC,
  client_notes TEXT
)
```

### **Components:**
- `MobileBookingRequestFlow.tsx` - Client booking form
- `MobileRequestManagement.tsx` - Practitioner dashboard
- `MobileRequestStatus.tsx` - Client view

### **Functions:**
- `create_mobile_booking_request()` - Creates request, calculates distance
- `accept_mobile_booking_request()` - Accepts, captures payment
- `decline_mobile_booking_request()` - Declines, releases payment

---

## ✅ **SUMMARY**

**Mobile and Hybrid therapists know where to go through:**

1. **Email Notifications** - Clickable address link in every email
2. **Dashboard View** - Clickable address in mobile requests page
3. **Accept Dialog** - Clickable address when accepting
4. **Confirmation Emails** - Clickable address in all confirmations
5. **Reminder Emails** - Clickable address in all reminders
6. **Client Notes** - Additional instructions (parking, access, etc.)
7. **Distance Info** - Shows distance from **base address** for planning

**All addresses are clickable** and open the device's default maps application, making navigation seamless for mobile therapists.

### **Key Differences: Hybrid vs Mobile-Only**

| Feature | Mobile Therapist | Hybrid Therapist |
|---------|-----------------|------------------|
| **Booking Options** | Mobile only | Clinic OR Mobile |
| **Mobile Distance** | From `base_address` | From `base_address` |
| **Clinic Distance** | N/A | From `clinic_address` |
| **Marketplace Buttons** | "Request Mobile" | "Book Clinic" + "Request Mobile" |
| **Location Display** | Base address + radius | Clinic address + base address + radius |

**For Hybrid Therapists:**
- **Clinic bookings:** Use `BookingFlow`, show `clinic_address` (clickable)
- **Mobile bookings:** Use `MobileBookingRequestFlow`, show `client_address` (clickable), distance from `base_address`

---

## 📝 **FILES REFERENCED**

- `src/components/marketplace/MobileBookingRequestFlow.tsx` - Mobile booking form
- `src/components/marketplace/BookingFlow.tsx` - Clinic booking form (for hybrid therapists)
- `src/components/practitioner/MobileRequestManagement.tsx` - Practitioner dashboard
- `src/components/client/MobileRequestStatus.tsx` - Client view
- `src/pages/Marketplace.tsx` - Marketplace with booking buttons
- `src/lib/booking-flow-type.ts` - Booking flow logic (clinic vs mobile)
- `src/emails/utils/maps.ts` - Maps URL generation
- `supabase/functions/send-email/index.ts` - Email notifications
- `supabase/migrations/20250127_add_notifications_to_mobile_requests.sql` - Notification system

---

## 🔍 **HYBRID THERAPIST SPECIFICS**

### **Distance Calculation Logic:**

**For Mobile Bookings (Hybrid Therapists):**
```typescript
// Uses base address for distance calculation
const useBaseAddress = practitioner.therapist_type === 'mobile' || 
                       practitioner.therapist_type === 'hybrid';
const baseLat = useBaseAddress ? practitioner.base_latitude : practitioner.clinic_latitude;
const baseLon = useBaseAddress ? practitioner.base_longitude : practitioner.clinic_longitude;
```

**For Clinic Bookings (Hybrid Therapists):**
- Uses `clinic_address`/`clinic_latitude`/`clinic_longitude`
- Standard clinic booking flow
- Address shown is clinic address (clickable)

### **Marketplace Button Logic:**

```typescript
// Hybrid therapists show BOTH buttons if they have both service types
const hasClinicServices = therapist_type === 'clinic_based' || 
                          therapist_type === 'hybrid' ||
                          products.some(p => p.service_type === 'clinic' || p.service_type === 'both');

const hasMobileServices = (therapist_type === 'mobile' || therapist_type === 'hybrid') &&
                          products.some(p => p.service_type === 'mobile' || p.service_type === 'both') &&
                          geoSearchActive &&
                          distance_km <= mobile_service_radius_km;
```

---

**Last Updated:** February 2025
