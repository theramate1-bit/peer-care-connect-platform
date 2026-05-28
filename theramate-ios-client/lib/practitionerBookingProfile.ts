import {
  canBookClinic,
  canRequestMobile,
  type PractitionerForBookingFlow,
} from "@/lib/booking-flow-type";
import type { MarketplacePractitioner } from "@/lib/api/marketplace";

export function marketplacePractitionerToBookingFlow(
  p: MarketplacePractitioner,
): PractitionerForBookingFlow {
  return {
    therapist_type: p.therapist_type,
    mobile_service_radius_km: p.mobile_service_radius_km,
    base_latitude: p.base_latitude,
    base_longitude: p.base_longitude,
    products: p.products,
  };
}

export function bookingEligibilityForMarketplacePractitioner(
  p: MarketplacePractitioner,
): { clinic: boolean; mobile: boolean } {
  const flow = marketplacePractitionerToBookingFlow(p);
  return {
    clinic: canBookClinic(flow),
    mobile: canRequestMobile(flow),
  };
}
