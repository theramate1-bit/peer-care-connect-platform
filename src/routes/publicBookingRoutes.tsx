/**
 * Public booking routes — register in AppContent (or root router) for 1:1 parity with app.
 *
 * ```tsx
 * import FindBooking from "@/pages/booking/FindBooking";
 * import GuestBookingView from "@/pages/booking/GuestBookingView";
 * import MobileBookingSuccess from "@/pages/MobileBookingSuccess";
 *
 * <Route path="/book/:slug" element={<DirectBooking />} />
 * <Route path="/therapist/:therapistId/public" element={<PublicTherapistProfile />} />
 * <Route path="/booking/find" element={<FindBooking />} />
 * <Route path="/booking/view/:sessionId" element={<GuestBookingView />} />
 * <Route path="/booking-success" element={<BookingSuccess />} />
 * <Route path="/mobile-booking/success" element={<MobileBookingSuccess />} />
 * <Route path="/guest/mobile-requests" element={<GuestMobileRequests />} />
 * ```
 *
 * Wired in `peer-care-connect/src/components/AppContent.tsx`.
 */

export { default as FindBooking } from "@/pages/booking/FindBooking";
export { default as GuestBookingView } from "@/pages/booking/GuestBookingView";
export { default as DirectBooking } from "@/pages/booking/DirectBooking";
export { default as PublicTherapistProfile } from "@/pages/therapist/PublicTherapistProfile";
export { default as BookingSuccess } from "@/pages/BookingSuccess";
export { default as MobileBookingSuccess } from "@/pages/MobileBookingSuccess";

export const PUBLIC_BOOKING_PATHS = [
  "/book/:slug",
  "/therapist/:therapistId/public",
  "/booking/find",
  "/booking/view/:sessionId",
  "/booking-success",
  "/mobile-booking/success",
  "/guest/mobile-requests",
] as const;
