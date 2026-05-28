import {
  canBookClinic,
  canRequestMobile,
  defaultBookingFlowType,
  getEffectiveProductServiceType,
  isProductClinicBookable,
  isProductMobileBookable,
} from "@/lib/booking-flow-type";

describe("booking-flow-type", () => {
  it("keeps hybrid practitioners clinic-first by default when both flows are available", () => {
    const practitioner = {
      therapist_type: "hybrid" as const,
      mobile_service_radius_km: 15,
      base_latitude: 51.5,
      base_longitude: -0.1,
      products: [{ is_active: true, service_type: "both" as const }],
    };

    expect(canBookClinic(practitioner)).toBe(true);
    expect(canRequestMobile(practitioner)).toBe(true);
    expect(defaultBookingFlowType(practitioner)).toBe("clinic");
  });

  it("does not allow hybrid mobile requests without real base coordinates", () => {
    const practitioner = {
      therapist_type: "hybrid" as const,
      mobile_service_radius_km: 15,
      base_latitude: null,
      base_longitude: null,
      products: [{ is_active: true, service_type: "both" as const }],
    };

    expect(canBookClinic(practitioner)).toBe(true);
    expect(canRequestMobile(practitioner)).toBe(false);
    expect(defaultBookingFlowType(practitioner)).toBe("clinic");
  });

  it("normalizes legacy service types by practitioner type", () => {
    expect(
      getEffectiveProductServiceType("mobile", {
        is_active: true,
        service_type: "clinic",
      }),
    ).toBe("mobile");

    expect(
      getEffectiveProductServiceType("clinic_based", {
        is_active: true,
        service_type: "mobile",
      }),
    ).toBe("clinic");
  });

  it("defaults to mobile when only mobile flow is available", () => {
    const practitioner = {
      therapist_type: "mobile" as const,
      mobile_service_radius_km: 20,
      base_latitude: 51.5,
      base_longitude: -0.1,
      products: [{ is_active: true, service_type: "mobile" as const }],
    };
    expect(defaultBookingFlowType(practitioner)).toBe("mobile");
  });

  it("returns clinic when neither flow is available (fallback)", () => {
    const practitioner = {
      therapist_type: "clinic_based" as const,
      products: [{ is_active: false }],
    };
    expect(defaultBookingFlowType(practitioner)).toBe("clinic");
  });

  it("rejects inactive products for bookability", () => {
    expect(
      isProductClinicBookable("clinic_based", { is_active: false, service_type: "clinic" })
    ).toBe(false);
    expect(
      isProductMobileBookable("mobile", { is_active: false, service_type: "mobile" })
    ).toBe(false);
  });

  it("handles empty products array", () => {
    const practitioner = { therapist_type: "hybrid" as const, products: [] };
    expect(canBookClinic(practitioner)).toBe(false);
    expect(canRequestMobile(practitioner)).toBe(false);
  });

  it("handles null/undefined therapist_type with unknown service_type", () => {
    const product = { is_active: true, service_type: null };
    expect(getEffectiveProductServiceType(null, product)).toBe("clinic");
  });

  describe("practitioner types: clinic_based", () => {
    it("canBookClinic true, canRequestMobile false", () => {
      const p = {
        therapist_type: "clinic_based" as const,
        products: [{ is_active: true, service_type: "clinic" as const }],
      };
      expect(canBookClinic(p)).toBe(true);
      expect(canRequestMobile(p)).toBe(false);
    });
  });

  describe("practitioner types: mobile", () => {
    it("canRequestMobile true when radius and coords set", () => {
      const p = {
        therapist_type: "mobile" as const,
        mobile_service_radius_km: 20,
        base_latitude: 51.5,
        base_longitude: -0.1,
        products: [{ is_active: true, service_type: "mobile" as const }],
      };
      expect(canBookClinic(p)).toBe(false);
      expect(canRequestMobile(p)).toBe(true);
    });
  });

  describe("practitioner types: hybrid", () => {
    it("both flows when products and coords set", () => {
      const p = {
        therapist_type: "hybrid" as const,
        mobile_service_radius_km: 15,
        base_latitude: 51.5,
        base_longitude: -0.1,
        products: [{ is_active: true, service_type: "both" as const }],
      };
      expect(canBookClinic(p)).toBe(true);
      expect(canRequestMobile(p)).toBe(true);
    });
  });
});
