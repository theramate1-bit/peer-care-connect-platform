import {
  getBookingEmailLocationData,
  type SessionLocationInput,
  type PractitionerLocationInput,
} from "../../../supabase/functions/_shared/booking-email-data";

describe("booking-email-data", () => {
  it("returns mobile location when appointment_type is mobile and visit_address present", () => {
    const session: SessionLocationInput = {
      appointment_type: "mobile",
      visit_address: "123 Client St, London",
    };
    const practitioner: PractitionerLocationInput = {
      clinic_address: "456 Clinic Rd",
      location: "Practitioner HQ",
    };

    const result = getBookingEmailLocationData(session, practitioner);

    expect(result.locationKind).toBe("mobile");
    expect(result.sessionLocation).toBe("123 Client St, London");
    expect(result.visitAddress).toBe("123 Client St, London");
    expect(result.directionsUrlForClient).toBeUndefined();
    expect(result.directionsUrlForPractitioner).toContain("123%20Client%20St");
  });

  it("returns mobile with placeholder when no visit address", () => {
    const session: SessionLocationInput = {
      appointment_type: "mobile",
      visit_address: null,
    };
    const practitioner: PractitionerLocationInput = {
      clinic_address: "456 Clinic Rd",
    };

    const result = getBookingEmailLocationData(session, practitioner);

    expect(result.locationKind).toBe("mobile");
    expect(result.sessionLocation).toBe("Visit address to be confirmed");
    expect(result.visitAddress).toBeUndefined();
  });

  it("uses visitAddressOverride when provided", () => {
    const session: SessionLocationInput = {
      appointment_type: "mobile",
      visit_address: null,
    };
    const practitioner: PractitionerLocationInput = {};
    const override = "  Override Lane  ";

    const result = getBookingEmailLocationData(session, practitioner, override);

    expect(result.sessionLocation).toBe("Override Lane");
    expect(result.visitAddress).toBe("Override Lane");
  });

  it("returns clinic location when appointment_type is clinic or default", () => {
    const session: SessionLocationInput = {
      appointment_type: "clinic",
      visit_address: null,
    };
    const practitioner: PractitionerLocationInput = {
      clinic_address: "789 Clinic Ave",
    };

    const result = getBookingEmailLocationData(session, practitioner);

    expect(result.locationKind).toBe("clinic");
    expect(result.sessionLocation).toBe("789 Clinic Ave");
    expect(result.directionsUrlForClient).toContain("789%20Clinic%20Ave");
    expect(result.directionsUrlForPractitioner).toContain("789%20Clinic%20Ave");
    expect(result.visitAddress).toBeUndefined();
  });

  it("falls back to practitioner.location when clinic_address is empty", () => {
    const session: SessionLocationInput = {};
    const practitioner: PractitionerLocationInput = {
      location: "Fallback Location",
    };

    const result = getBookingEmailLocationData(session, practitioner);

    expect(result.locationKind).toBe("clinic");
    expect(result.sessionLocation).toBe("Fallback Location");
  });

  it("returns empty sessionLocation when no clinic or location", () => {
    const session: SessionLocationInput = { appointment_type: "clinic" };
    const practitioner: PractitionerLocationInput = {};

    const result = getBookingEmailLocationData(session, practitioner);

    expect(result.locationKind).toBe("clinic");
    expect(result.sessionLocation).toBe("");
    expect(result.directionsUrlForClient).toBeUndefined();
  });

  it("trims whitespace from addresses", () => {
    const session: SessionLocationInput = {
      appointment_type: "mobile",
      visit_address: "  123 Trimmed St  ",
    };
    const practitioner: PractitionerLocationInput = {};

    const result = getBookingEmailLocationData(session, practitioner);

    expect(result.sessionLocation).toBe("123 Trimmed St");
  });

  it("handles null appointment_type as clinic default", () => {
    const session: SessionLocationInput = { appointment_type: null };
    const practitioner: PractitionerLocationInput = {
      clinic_address: "Default Clinic",
    };

    const result = getBookingEmailLocationData(session, practitioner);

    expect(result.locationKind).toBe("clinic");
    expect(result.sessionLocation).toBe("Default Clinic");
  });
});
