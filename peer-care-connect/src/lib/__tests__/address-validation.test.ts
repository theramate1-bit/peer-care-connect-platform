import {
  validateDetailedStreetAddress,
  AddressValidationService,
  type AddressData,
} from "../address-validation";

describe("address-validation", () => {
  describe("validateDetailedStreetAddress", () => {
    it("rejects empty or whitespace-only input", () => {
      expect(validateDetailedStreetAddress("").isValid).toBe(false);
      expect(validateDetailedStreetAddress("   ").isValid).toBe(false);
      expect(validateDetailedStreetAddress(null).isValid).toBe(false);
      expect(validateDetailedStreetAddress(undefined).isValid).toBe(false);
    });

    it("accepts address with street number and comma parts", () => {
      const result = validateDetailedStreetAddress("123 High Street, London");
      expect(result.isValid).toBe(true);
    });

    it("accepts address with UK postcode", () => {
      const result = validateDetailedStreetAddress("SW1A 1AA");
      expect(result.isValid).toBe(true);
    });

    it("accepts full address with postcode", () => {
      const result = validateDetailedStreetAddress("10 Downing Street, London SW1A 2AA");
      expect(result.isValid).toBe(true);
    });

    it("rejects town/city only without number or postcode", () => {
      const result = validateDetailedStreetAddress("London");
      expect(result.isValid).toBe(false);
      expect(result.message).toContain("full base address");
    });

    it("rejects single part without postcode", () => {
      const result = validateDetailedStreetAddress("Just a street name");
      expect(result.isValid).toBe(false);
    });
  });

  describe("AddressValidationService.validate", () => {
    it("rejects incomplete address", async () => {
      const addr: AddressData = {
        line1: "",
        city: "London",
        postcode: "SW1A 1AA",
        country: "United Kingdom",
        formattedAddress: "London, SW1A 1AA",
      };
      const result = await AddressValidationService.validate(addr);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain("incomplete");
    });

    it("rejects invalid UK postcode when country is UK", async () => {
      const addr: AddressData = {
        line1: "123 Street",
        city: "London",
        postcode: "INVALID",
        country: "United Kingdom",
        formattedAddress: "123 Street, London, INVALID",
      };
      const result = await AddressValidationService.validate(addr);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain("postcode");
    });

    it("accepts valid UK address", async () => {
      const addr: AddressData = {
        line1: "123 High Street",
        city: "London",
        postcode: "SW1A 1AA",
        country: "United Kingdom",
        formattedAddress: "123 High Street, London, SW1A 1AA",
      };
      const result = await AddressValidationService.validate(addr);
      expect(result.isValid).toBe(true);
      expect(result.normalized).toEqual(addr);
    });

    it("accepts non-UK address without strict postcode check", async () => {
      const addr: AddressData = {
        line1: "123 Main St",
        city: "Dublin",
        postcode: "D02 XY45",
        country: "Ireland",
        formattedAddress: "123 Main St, Dublin",
      };
      const result = await AddressValidationService.validate(addr);
      expect(result.isValid).toBe(true);
    });
  });
});
