import {
  buildPracticeLocationUpdate,
  isDuplicateQualification,
  validatePracticeLocations,
  type PracticeLocationValues,
} from "@/lib/practitionerProfile";

const baseValues: PracticeLocationValues = {
  therapistType: "clinic_based",
  clinicAddress: "1 Clinic St",
  clinicLatitude: 51.5,
  clinicLongitude: -0.1,
  baseAddress: "",
  baseLatitude: null,
  baseLongitude: null,
  mobileServiceRadiusKm: null,
};

describe("practitionerProfile helpers", () => {
  it("validates clinic-based requirements", () => {
    expect(validatePracticeLocations(baseValues)).toBeNull();
    expect(
      validatePracticeLocations({
        ...baseValues,
        clinicAddress: "",
      }),
    ).toContain("Clinic address");
  });

  it("validates mobile requirements", () => {
    expect(
      validatePracticeLocations({
        ...baseValues,
        therapistType: "mobile",
      }),
    ).toContain("Service radius");
    expect(
      validatePracticeLocations({
        ...baseValues,
        therapistType: "mobile",
        clinicAddress: "",
        clinicLatitude: null,
        clinicLongitude: null,
        baseAddress: "2 Base Rd",
        baseLatitude: 51.51,
        baseLongitude: -0.11,
        mobileServiceRadiusKm: 12,
      }),
    ).toBeNull();
  });

  it("fills hybrid base fields from clinic when omitted", () => {
    const update = buildPracticeLocationUpdate({
      ...baseValues,
      therapistType: "hybrid",
      baseAddress: "",
      baseLatitude: null,
      baseLongitude: null,
      mobileServiceRadiusKm: 20,
    });
    expect(update.base_address).toBe("1 Clinic St");
    expect(update.base_latitude).toBe(51.5);
    expect(update.base_longitude).toBe(-0.1);
    expect(update.mobile_service_radius_km).toBe(20);
  });

  it("detects duplicate qualifications by name institution year", () => {
    const existing = [
      { name: "BSc Osteopathy", institution: "X Uni", year_obtained: 2022 },
    ];
    expect(
      isDuplicateQualification(existing, {
        name: " bsc osteopathy ",
        institution: "x uni",
        year_obtained: 2022,
      }),
    ).toBe(true);
    expect(
      isDuplicateQualification(existing, {
        name: "BSc Osteopathy",
        institution: "X Uni",
        year_obtained: 2021,
      }),
    ).toBe(false);
  });
});
