import {
  getSessionLocation,
  type SessionLocationInput,
  type PractitionerLocationInput,
} from "../sessionLocation";

describe("sessionLocation", () => {
  it("returns visit address for mobile with address", () => {
    const session: SessionLocationInput = {
      appointment_type: "mobile",
      visit_address: "123 Client St",
    };
    const practitioner: PractitionerLocationInput = {
      clinic_address: "456 Clinic Rd",
    };
    const result = getSessionLocation(session, practitioner);
    expect(result.sessionLocation).toBe("123 Client St");
    expect(result.locationLabel).toBe("Visit address");
    expect(result.directionsUrl).toBeUndefined();
  });

  it("returns placeholder when mobile without visit address", () => {
    const session: SessionLocationInput = {
      appointment_type: "mobile",
      visit_address: null,
    };
    const result = getSessionLocation(session, null);
    expect(result.sessionLocation).toBe("Visit address to be confirmed");
  });

  it("returns clinic address for clinic sessions", () => {
    const session: SessionLocationInput = { appointment_type: "clinic" };
    const practitioner: PractitionerLocationInput = {
      clinic_address: "789 Clinic Ave",
    };
    const result = getSessionLocation(session, practitioner);
    expect(result.sessionLocation).toBe("789 Clinic Ave");
    expect(result.locationLabel).toBe("Location");
    expect(result.directionsUrl).toContain("789%20Clinic%20Ave");
  });

  it("falls back to practitioner.location when no clinic_address", () => {
    const session: SessionLocationInput = {};
    const practitioner: PractitionerLocationInput = {
      location: "Fallback Location",
    };
    const result = getSessionLocation(session, practitioner);
    expect(result.sessionLocation).toBe("Fallback Location");
  });

  it("handles null practitioner", () => {
    const session: SessionLocationInput = { appointment_type: "clinic" };
    const result = getSessionLocation(session, null);
    expect(result.sessionLocation).toBe("");
    expect(result.locationLabel).toBe("Location");
  });

  it("uses clinic_address over location when both present", () => {
    const session: SessionLocationInput = { appointment_type: "clinic" };
    const practitioner: PractitionerLocationInput = {
      clinic_address: "Clinic First",
      location: "Fallback Location",
    };
    const result = getSessionLocation(session, practitioner);
    expect(result.sessionLocation).toBe("Clinic First");
  });

  it("trims visit_address for mobile", () => {
    const session: SessionLocationInput = {
      appointment_type: "mobile",
      visit_address: "  123 Street  ",
    };
    const result = getSessionLocation(session, null);
    expect(result.sessionLocation).toBe("123 Street");
  });

  it("returns directionsUrl for clinic with address", () => {
    const session: SessionLocationInput = { appointment_type: "clinic" };
    const practitioner: PractitionerLocationInput = {
      clinic_address: "10 Downing St",
    };
    const result = getSessionLocation(session, practitioner);
    expect(result.directionsUrl).toBeDefined();
    expect(result.directionsUrl).toContain("google.com/maps");
    expect(result.directionsUrl).toContain("destination=");
  });
});
