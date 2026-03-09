/**
 * Single source of truth for which booking flow to show (clinic vs mobile request).
 * Used by Marketplace, ProfileViewer, DirectBooking, and other entry points.
 */

export type TherapistType = 'clinic_based' | 'mobile' | 'hybrid';
export type ServiceType = 'clinic' | 'mobile' | 'both';

export interface BookingProductLike {
  is_active: boolean;
  service_type?: ServiceType | null;
}

export interface PractitionerForBookingFlow {
  therapist_type?: TherapistType | null;
  mobile_service_radius_km?: number | null;
  base_latitude?: number | null;
  base_longitude?: number | null;
  products?: BookingProductLike[] | null;
}

/**
 * Normalize product service_type using practitioner_type so legacy/misaligned records
 * still behave consistently across UI surfaces.
 */
export function getEffectiveProductServiceType(
  therapistType: TherapistType | null | undefined,
  product: BookingProductLike
): ServiceType {
  const declared = product.service_type ?? null;

  if (declared === 'clinic' || declared === 'mobile' || declared === 'both') {
    if (therapistType === 'mobile' && declared === 'clinic') return 'mobile';
    if (therapistType === 'clinic_based' && declared === 'mobile') return 'clinic';
    return declared;
  }

  if (therapistType === 'mobile') return 'mobile';
  if (therapistType === 'clinic_based') return 'clinic';
  if (therapistType === 'hybrid') return 'both';
  return 'clinic';
}

export function isProductMobileBookable(
  therapistType: TherapistType | null | undefined,
  product: BookingProductLike
): boolean {
  if (!product.is_active) return false;
  const type = getEffectiveProductServiceType(therapistType, product);
  return type === 'mobile' || type === 'both';
}

export function isProductClinicBookable(
  therapistType: TherapistType | null | undefined,
  product: BookingProductLike
): boolean {
  if (!product.is_active) return false;
  const type = getEffectiveProductServiceType(therapistType, product);
  return type === 'clinic' || type === 'both';
}

/**
 * True if the practitioner offers clinic (or both) services and can be booked at a clinic.
 */
export function canBookClinic(practitioner: PractitionerForBookingFlow): boolean {
  const type = practitioner.therapist_type;
  const hasClinicType = type === 'clinic_based' || type === 'hybrid';
  const products = practitioner.products ?? [];
  const hasClinicProduct = products.some((p) => isProductClinicBookable(type, p));
  return !!hasClinicType && hasClinicProduct;
}

/**
 * True if the practitioner offers mobile (or both) services with radius and base coords set,
 * so "Request mobile session" can be shown and the mobile flow can run.
 */
export function canRequestMobile(practitioner: PractitionerForBookingFlow): boolean {
  const type = practitioner.therapist_type;
  const hasMobileType = type === 'mobile' || type === 'hybrid';
  const products = practitioner.products ?? [];
  const hasMobileProduct = products.some((p) => isProductMobileBookable(type, p));
  const hasRadius =
    practitioner.mobile_service_radius_km != null &&
    practitioner.base_latitude != null &&
    practitioner.base_longitude != null;
  return !!hasMobileType && hasMobileProduct && hasRadius;
}

/**
 * When only one flow is available, which one to open for a single "Book" CTA.
 * When both are available, UI should show two CTAs; this default is for consistency (e.g. analytics).
 */
export function defaultBookingFlowType(
  practitioner: PractitionerForBookingFlow
): 'clinic' | 'mobile' {
  const clinic = canBookClinic(practitioner);
  const mobile = canRequestMobile(practitioner);
  if (clinic && !mobile) return 'clinic';
  if (mobile && !clinic) return 'mobile';
  if (clinic && mobile) return 'clinic'; // hybrid: default to clinic; UI shows both options
  return 'clinic';
}
