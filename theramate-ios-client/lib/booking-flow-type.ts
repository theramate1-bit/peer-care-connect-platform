/**
 * Clinic vs mobile booking eligibility — keep aligned with
 * `peer-care-connect/src/lib/booking-flow-type.ts`.
 */

export type TherapistType = "clinic_based" | "mobile" | "hybrid";
export type ServiceType = "clinic" | "mobile" | "both";

export interface BookingProductLike {
  is_active: boolean;
  service_type?: ServiceType | string | null;
}

export interface PractitionerForBookingFlow {
  therapist_type?: TherapistType | string | null;
  mobile_service_radius_km?: number | null;
  base_latitude?: number | null;
  base_longitude?: number | null;
  products?: BookingProductLike[] | null;
}

export function normalizeTherapistType(
  value: string | null | undefined,
): TherapistType | null {
  if (value === "clinic_based" || value === "mobile" || value === "hybrid") {
    return value;
  }
  return null;
}

export function getEffectiveProductServiceType(
  therapistType: TherapistType | null | undefined,
  product: BookingProductLike,
): ServiceType {
  const declared = product.service_type ?? null;
  if (declared === "clinic" || declared === "mobile" || declared === "both") {
    if (therapistType === "mobile" && declared === "clinic") return "mobile";
    if (therapistType === "clinic_based" && declared === "mobile") {
      return "clinic";
    }
    return declared;
  }
  if (therapistType === "mobile") return "mobile";
  if (therapistType === "clinic_based") return "clinic";
  if (therapistType === "hybrid") return "both";
  return "clinic";
}

export function isProductMobileBookable(
  therapistType: TherapistType | null | undefined,
  product: BookingProductLike,
): boolean {
  if (!product.is_active) return false;
  const type = getEffectiveProductServiceType(therapistType, product);
  return type === "mobile" || type === "both";
}

export function isProductClinicBookable(
  therapistType: TherapistType | null | undefined,
  product: BookingProductLike,
): boolean {
  if (!product.is_active) return false;
  const type = getEffectiveProductServiceType(therapistType, product);
  return type === "clinic" || type === "both";
}

export function canBookClinic(
  practitioner: PractitionerForBookingFlow,
): boolean {
  const type = normalizeTherapistType(
    practitioner.therapist_type as string | null | undefined,
  );
  const hasClinicType = type === "clinic_based" || type === "hybrid";
  const products = practitioner.products ?? [];
  const hasClinicProduct = products.some((p) =>
    isProductClinicBookable(type, p),
  );
  return !!hasClinicType && hasClinicProduct;
}

export function canRequestMobile(
  practitioner: PractitionerForBookingFlow,
): boolean {
  const type = normalizeTherapistType(
    practitioner.therapist_type as string | null | undefined,
  );
  const hasMobileType = type === "mobile" || type === "hybrid";
  const products = practitioner.products ?? [];
  const hasMobileProduct = products.some((p) =>
    isProductMobileBookable(type, p),
  );
  const hasRadius = practitioner.mobile_service_radius_km != null;
  const hasBaseCoords =
    practitioner.base_latitude != null && practitioner.base_longitude != null;
  return !!hasMobileType && !!hasMobileProduct && hasRadius && hasBaseCoords;
}

export function defaultBookingFlowType(
  practitioner: PractitionerForBookingFlow,
): "clinic" | "mobile" {
  const clinic = canBookClinic(practitioner);
  const mobile = canRequestMobile(practitioner);
  if (clinic && !mobile) return "clinic";
  if (mobile && !clinic) return "mobile";
  if (clinic && mobile) return "clinic";
  return "clinic";
}
