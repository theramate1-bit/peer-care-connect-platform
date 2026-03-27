/**
 * Central booking email location logic: clinic vs mobile.
 * Location rule: visit_address → appointment_type → clinic_address → practitioner.location.
 * Keep in sync with peer-care-connect/src/utils/sessionLocation.ts (getSessionLocation).
 * Used by confirmation, cancellation, and reschedule emails so templates stay consistent.
 */

export type LocationKind = "clinic" | "mobile";

export interface SessionLocationInput {
  appointment_type?: string | null;
  visit_address?: string | null;
}

export interface PractitionerLocationInput {
  location?: string | null;
  clinic_address?: string | null;
}

export interface BookingEmailLocationData {
  locationKind: LocationKind;
  /** Display line for session location (clinic address or visit address) */
  sessionLocation: string;
  /** For client email: only set when clinic (directions to clinic). Omit for mobile. */
  directionsUrlForClient: string | undefined;
  /** For practitioner email: clinic → directions to clinic; mobile → directions to client. */
  directionsUrlForPractitioner: string | undefined;
  /** When mobile, the visit/client address for practitioner template. */
  visitAddress: string | undefined;
}

function buildDirectionsUrl(
  address: string | null | undefined,
): string | undefined {
  if (!address || typeof address !== "string" || !address.trim())
    return undefined;
  try {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address.trim())}`;
  } catch {
    return undefined;
  }
}

/**
 * Returns location data for booking-related emails (confirmation, cancellation, reschedule).
 * Booking record wins: session.appointment_type determines clinic vs mobile; visit address from session or override.
 */
export function getBookingEmailLocationData(
  session: SessionLocationInput,
  practitioner: PractitionerLocationInput,
  visitAddressOverride?: string | null,
): BookingEmailLocationData {
  const isMobile = session.appointment_type === "mobile";
  const visitAddress =
    (session.visit_address && session.visit_address.trim()) ||
    (visitAddressOverride && String(visitAddressOverride).trim()) ||
    undefined;

  const clinicAddress =
    (practitioner.clinic_address &&
      String(practitioner.clinic_address).trim()) ||
    (practitioner.location && String(practitioner.location).trim()) ||
    undefined;

  if (isMobile && visitAddress) {
    return {
      locationKind: "mobile",
      sessionLocation: visitAddress,
      directionsUrlForClient: undefined,
      directionsUrlForPractitioner: buildDirectionsUrl(visitAddress),
      visitAddress,
    };
  }

  // Mobile with no visit address: do not fall back to clinic
  if (isMobile) {
    return {
      locationKind: "mobile",
      sessionLocation: "Visit address to be confirmed",
      directionsUrlForClient: undefined,
      directionsUrlForPractitioner: undefined,
      visitAddress: undefined,
    };
  }

  // Clinic (default): session at practitioner's clinic/location
  return {
    locationKind: "clinic",
    sessionLocation: clinicAddress || "",
    directionsUrlForClient: buildDirectionsUrl(clinicAddress),
    directionsUrlForPractitioner: buildDirectionsUrl(clinicAddress),
    visitAddress: undefined,
  };
}
