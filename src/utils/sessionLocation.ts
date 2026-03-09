/**
 * Canonical session location resolution for UI (dashboard, calendar, analytics).
 * Location rule: visit_address → appointment_type → clinic_address → practitioner.location.
 * Keep in sync with supabase/functions/_shared/booking-email-data.ts (getBookingEmailLocationData).
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
  /** Display string for the session location */
  sessionLocation: string;
  /** Google Maps directions URL when applicable; undefined for mobile without address */
  directionsUrl: string | undefined;
  /** Label for UI e.g. "Visit address" / "Your address" for mobile, "Location" for clinic */
  locationLabel: string;
}

function buildDirectionsUrl(address: string | null | undefined): string | undefined {
  if (!address || typeof address !== 'string' || !address.trim()) return undefined;
  try {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address.trim())}`;
  } catch {
    return undefined;
  }
}

/**
 * Returns display location for a session using booking-record-first rule.
 * Use in dashboard lists, calendar modal, and analytics payloads.
 */
export function getSessionLocation(
  session: SessionLocationInput,
  practitioner: PractitionerLocationInput | null | undefined
): SessionLocationResult {
  const isMobile = session.appointment_type === 'mobile';
  const visitAddress =
    (session.visit_address && typeof session.visit_address === 'string' && session.visit_address.trim()) || undefined;

  const clinicAddress =
    (practitioner?.clinic_address && String(practitioner.clinic_address).trim()) ||
    (practitioner?.location && String(practitioner.location).trim()) ||
    undefined;

  if (isMobile && visitAddress) {
    return {
      sessionLocation: visitAddress,
      directionsUrl: undefined,
      locationLabel: 'Visit address',
    };
  }

  if (isMobile) {
    return {
      sessionLocation: 'Visit address to be confirmed',
      directionsUrl: undefined,
      locationLabel: 'Visit address',
    };
  }

  const sessionLocation = clinicAddress || practitioner?.location?.trim() || '';
  return {
    sessionLocation,
    directionsUrl: buildDirectionsUrl(sessionLocation || undefined),
    locationLabel: 'Location',
  };
}
