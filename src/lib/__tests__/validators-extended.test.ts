/**
 * Extended parameterized tests for validators
 */
import {
  sessionSchema,
  productSchema,
  paymentSchema,
  profileSchema,
  ALLOWED_DURATION_MINUTES,
  validateData,
} from "@/lib/validators";

describe("validators extended", () => {
  const futureDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  };

  describe("ALLOWED_DURATION_MINUTES each value", () => {
    it.each(ALLOWED_DURATION_MINUTES)("accepts duration %s", (dur) => {
      const result = sessionSchema.safeParse({
        client_email: "a@b.com",
        client_name: "Jane Doe",
        session_date: futureDate(),
        start_time: "10:00",
        duration_minutes: dur,
        price: 50,
        session_type: "Massage",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("productSchema currency", () => {
    it("requires gbp", () => {
      expect(
        productSchema.safeParse({
          name: "Product",
          price_amount: 50,
          currency: "usd",
        }).success
      ).toBe(false);
    });
  });

  describe("paymentSchema amount", () => {
    it("accepts 100 pence", () => {
      expect(
        paymentSchema.safeParse({
          amount: 100,
          practitioner_id: "123e4567-e89b-12d3-a456-426614174000",
          price_id: "price_abc",
          client_email: "a@b.com",
        }).success
      ).toBe(true);
    });
  });

  describe("profileSchema optional fields", () => {
    it("accepts minimal valid profile", () => {
      expect(
        profileSchema.safeParse({
          first_name: "Jane",
          last_name: "Doe",
          email: "j@x.com",
        }).success
      ).toBe(true);
    });
  });

  describe("validateData with productSchema", () => {
    it("returns data on success", () => {
      const result = validateData(productSchema, {
        name: "60 min Session",
        price_amount: 6000,
        duration_minutes: 60,
        currency: "gbp",
      });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("profileSchema", () => {
    it("accepts optional bio", () => {
      expect(
        profileSchema.safeParse({
          first_name: "Jane",
          last_name: "Doe",
          email: "j@x.com",
          bio: "Practitioner with 10 years experience",
        }).success
      ).toBe(true);
    });
  });

  describe("sessionSchema start_time", () => {
    it.each(["09:00", "12:30", "23:59", "00:00"])("accepts %s", (time) => {
      const result = sessionSchema.safeParse({
        client_email: "a@b.com",
        client_name: "Jane Doe",
        session_date: futureDate(),
        start_time: time,
        duration_minutes: 60,
        price: 50,
        session_type: "Massage",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("paymentSchema price_id", () => {
    it("rejects invalid price_id", () => {
      expect(
        paymentSchema.safeParse({
          amount: 100,
          practitioner_id: "123e4567-e89b-12d3-a456-426614174000",
          price_id: "prod_abc",
          client_email: "a@b.com",
        }).success
      ).toBe(false);
    });
  });
});
