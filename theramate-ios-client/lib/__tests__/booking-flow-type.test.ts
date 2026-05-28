import {
  canBookClinic,
  canRequestMobile,
  getEffectiveProductServiceType,
} from "@/lib/booking-flow-type";

describe("booking-flow-type", () => {
  it("normalizes mobile practitioner clinic product to mobile", () => {
    expect(
      getEffectiveProductServiceType("mobile", {
        is_active: true,
        service_type: "clinic",
      }),
    ).toBe("mobile");
  });

  it("requires clinic products for clinic CTA", () => {
    expect(
      canBookClinic({
        therapist_type: "hybrid",
        products: [{ is_active: true, service_type: "mobile" }],
      }),
    ).toBe(false);
  });

  it("requires radius and base coords for mobile CTA", () => {
    expect(
      canRequestMobile({
        therapist_type: "hybrid",
        products: [{ is_active: true, service_type: "both" }],
        mobile_service_radius_km: 10,
        base_latitude: null,
        base_longitude: 51.5,
      }),
    ).toBe(false);

    expect(
      canRequestMobile({
        therapist_type: "hybrid",
        products: [{ is_active: true, service_type: "both" }],
        mobile_service_radius_km: 10,
        base_latitude: 51.5,
        base_longitude: -0.1,
      }),
    ).toBe(true);
  });
});
