/**
 * Session location for practitioner UI — mirrors peer-care-connect `src/utils/sessionLocation.ts`.
 * Booking-record-first: visit_address → appointment_type → clinic / practitioner address.
 */

export interface SessionLocationInput {
  appointment_type?: string | null;
  visit_address?: string | null;
}

export interface PractitionerLocationInput {
  location?: string | null;
  clinic_address?: string | null;
}

export interface SessionLocationResult {
  sessionLocation: string;
  directionsUrl: string | undefined;
  locationLabel: string;
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

export function getSessionLocation(
  session: SessionLocationInput,
  practitioner: PractitionerLocationInput | null | undefined,
): SessionLocationResult {
  const isMobile = session.appointment_type === "mobile";
  const visitAddress =
    (session.visit_address &&
      typeof session.visit_address === "string" &&
      session.visit_address.trim()) ||
    undefined;

  const clinicAddress =
    (practitioner?.clinic_address &&
      String(practitioner.clinic_address).trim()) ||
    (practitioner?.location && String(practitioner.location).trim()) ||
    undefined;

  if (isMobile && visitAddress) {
    return {
      sessionLocation: visitAddress,
      directionsUrl: undefined,
      locationLabel: "Visit address",
    };
  }

  if (isMobile) {
    return {
      sessionLocation: "Visit address to be confirmed",
      directionsUrl: undefined,
      locationLabel: "Visit address",
    };
  }

  const sessionLocation = clinicAddress || practitioner?.location?.trim() || "";
  return {
    sessionLocation,
    directionsUrl: buildDirectionsUrl(sessionLocation || undefined),
    locationLabel: "Location",
  };
}
