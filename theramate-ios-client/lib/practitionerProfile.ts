export type TherapistType = "clinic_based" | "mobile" | "hybrid";

export type PracticeLocationValues = {
  therapistType: TherapistType;
  clinicAddress: string;
  clinicLatitude: number | null;
  clinicLongitude: number | null;
  baseAddress: string;
  baseLatitude: number | null;
  baseLongitude: number | null;
  mobileServiceRadiusKm: number | null;
};

export function normalizeQualificationValue(
  value: string | null | undefined,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function isDuplicateQualification(
  existing: Array<{
    name?: string | null;
    institution?: string | null;
    year_obtained?: number | null;
  }>,
  next: {
    name: string;
    institution?: string | null;
    year_obtained?: number | null;
  },
): boolean {
  const nextName = normalizeQualificationValue(next.name);
  const nextInstitution = normalizeQualificationValue(next.institution);
  const nextYear = Number(next.year_obtained || 0);
  return existing.some((item) => {
    const itemName = normalizeQualificationValue(item.name);
    const itemInstitution = normalizeQualificationValue(item.institution);
    const itemYear = Number(item.year_obtained || 0);
    return (
      itemName === nextName &&
      itemInstitution === nextInstitution &&
      itemYear === nextYear
    );
  });
}

export function validatePracticeLocations(
  values: PracticeLocationValues,
): string | null {
  const type = values.therapistType;
  const clinicAddress = values.clinicAddress.trim();
  const baseAddress = values.baseAddress.trim();
  const radius = values.mobileServiceRadiusKm;
  const hasClinicCoords =
    values.clinicLatitude !== null && values.clinicLongitude !== null;
  const hasBaseCoords =
    values.baseLatitude !== null && values.baseLongitude !== null;

  if ((type === "clinic_based" || type === "hybrid") && !clinicAddress) {
    return "Clinic address is required for clinic-based and hybrid therapists.";
  }
  if ((type === "clinic_based" || type === "hybrid") && !hasClinicCoords) {
    return "Set a clinic map pin before saving.";
  }
  if ((type === "mobile" || type === "hybrid") && (!radius || radius <= 0)) {
    return "Service radius (km) is required for mobile and hybrid therapists.";
  }
  if (type === "mobile" && !baseAddress) {
    return "Base address is required for mobile therapists.";
  }
  if (type === "mobile" && !hasBaseCoords) {
    return "Set a base map pin before saving.";
  }
  if (type === "hybrid" && !baseAddress && !clinicAddress) {
    return "Set either a base address or clinic address for hybrid therapists.";
  }
  if (type === "hybrid" && !hasBaseCoords && !hasClinicCoords) {
    return "Set a map pin for clinic or base location.";
  }
  return null;
}

export function buildPracticeLocationUpdate(values: PracticeLocationValues) {
  const isHybrid = values.therapistType === "hybrid";
  const clinicAddress = values.clinicAddress.trim() || null;
  const baseAddressRaw = values.baseAddress.trim() || null;
  const baseAddress =
    isHybrid && clinicAddress
      ? (baseAddressRaw ?? clinicAddress)
      : baseAddressRaw;
  const clinicLatitude = values.clinicLatitude;
  const clinicLongitude = values.clinicLongitude;
  const baseLatitudeRaw = values.baseLatitude;
  const baseLongitudeRaw = values.baseLongitude;
  const baseLatitude =
    isHybrid && clinicLatitude !== null
      ? (baseLatitudeRaw ?? clinicLatitude)
      : baseLatitudeRaw;
  const baseLongitude =
    isHybrid && clinicLongitude !== null
      ? (baseLongitudeRaw ?? clinicLongitude)
      : baseLongitudeRaw;

  return {
    therapist_type: values.therapistType,
    clinic_address: clinicAddress,
    clinic_latitude: clinicLatitude,
    clinic_longitude: clinicLongitude,
    base_address: baseAddress,
    base_latitude: baseLatitude,
    base_longitude: baseLongitude,
    mobile_service_radius_km:
      values.therapistType === "mobile" || values.therapistType === "hybrid"
        ? values.mobileServiceRadiusKm
        : null,
  };
}
