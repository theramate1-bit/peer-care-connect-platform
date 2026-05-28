import {
  validateData,
  sessionSchema,
  productSchema,
  paymentSchema,
  profileSchema,
  ALLOWED_DURATION_MINUTES,
} from "../validators";

describe("validators", () => {
  describe("validateData", () => {
    it("returns success and data for valid input", () => {
      const schema = productSchema;
      const data = {
        name: "Test Product",
        price_amount: 50,
        currency: "gbp" as const,
      };
      const result = validateData(schema, data);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it("returns errors for invalid input", () => {
      const result = validateData(productSchema, {
        name: "ab",
        price_amount: -1,
        currency: "gbp",
      });
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it("handles non-Zod errors", () => {
      const schema = { parse: () => { throw new Error("custom"); } } as any;
      const result = validateData(schema, {});
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(["Validation failed"]);
    });
  });

  describe("sessionSchema", () => {
    it("rejects past dates", () => {
      const result = sessionSchema.safeParse({
        client_email: "a@b.com",
        client_name: "Jane Doe",
        session_date: "2020-01-01",
        start_time: "10:00",
        duration_minutes: 60,
        price: 50,
        session_type: "Massage",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid time format", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const result = sessionSchema.safeParse({
        client_email: "a@b.com",
        client_name: "Jane Doe",
        session_date: futureDate.toISOString().slice(0, 10),
        start_time: "25:00",
        duration_minutes: 60,
        price: 50,
        session_type: "Massage",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid duration", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const result = sessionSchema.safeParse({
        client_email: "a@b.com",
        client_name: "Jane Doe",
        session_date: futureDate.toISOString().slice(0, 10),
        start_time: "10:00",
        duration_minutes: 25,
        price: 50,
        session_type: "Massage",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("productSchema", () => {
    it("accepts valid product", () => {
      const result = productSchema.safeParse({
        name: "60 min Massage",
        price_amount: 60,
        duration_minutes: 60,
        currency: "gbp",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid duration", () => {
      const result = productSchema.safeParse({
        name: "Product",
        price_amount: 50,
        duration_minutes: 20,
        currency: "gbp",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("paymentSchema", () => {
    it("rejects amount below 100 (pence)", () => {
      const result = paymentSchema.safeParse({
        amount: 50,
        practitioner_id: "123e4567-e89b-12d3-a456-426614174000",
        price_id: "price_abc",
        client_email: "a@b.com",
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-uuid practitioner_id", () => {
      const result = paymentSchema.safeParse({
        amount: 100,
        practitioner_id: "not-a-uuid",
        price_id: "price_abc",
        client_email: "a@b.com",
      });
      expect(result.success).toBe(false);
    });

    it("rejects price_id not starting with price_", () => {
      const result = paymentSchema.safeParse({
        amount: 100,
        practitioner_id: "123e4567-e89b-12d3-a456-426614174000",
        price_id: "prod_abc",
        client_email: "a@b.com",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ALLOWED_DURATION_MINUTES", () => {
    it("includes expected values", () => {
      expect(ALLOWED_DURATION_MINUTES).toContain(30);
      expect(ALLOWED_DURATION_MINUTES).toContain(45);
      expect(ALLOWED_DURATION_MINUTES).toContain(60);
      expect(ALLOWED_DURATION_MINUTES).toContain(75);
      expect(ALLOWED_DURATION_MINUTES).toContain(90);
    });
    it("has exactly 5 values", () => {
      expect(ALLOWED_DURATION_MINUTES).toHaveLength(5);
    });
  });

  describe("profileSchema", () => {
    it("accepts valid profile", () => {
      const result = profileSchema.safeParse({
        first_name: "Jane",
        last_name: "Doe",
        email: "jane@example.com",
      });
      expect(result.success).toBe(true);
    });
    it("rejects first_name too short", () => {
      const result = profileSchema.safeParse({
        first_name: "A",
        last_name: "Doe",
        email: "j@x.com",
      });
      expect(result.success).toBe(false);
    });
    it("rejects invalid email", () => {
      const result = profileSchema.safeParse({
        first_name: "Jane",
        last_name: "Doe",
        email: "not-email",
      });
      expect(result.success).toBe(false);
    });
    it("accepts optional phone with valid format", () => {
      const result = profileSchema.safeParse({
        first_name: "Jane",
        last_name: "Doe",
        email: "j@x.com",
        phone_number: "+447700900123",
      });
      expect(result.success).toBe(true);
    });
    it("rejects invalid phone format", () => {
      const result = profileSchema.safeParse({
        first_name: "Jane",
        last_name: "Doe",
        email: "j@x.com",
        phone_number: "abc",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("sessionSchema edge cases", () => {
    it("rejects duration 15", () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      const result = sessionSchema.safeParse({
        client_email: "a@b.com",
        client_name: "Jane Doe",
        session_date: future.toISOString().slice(0, 10),
        start_time: "10:00",
        duration_minutes: 15,
        price: 50,
        session_type: "Massage",
      });
      expect(result.success).toBe(false);
    });
    it("accepts duration 90", () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      const result = sessionSchema.safeParse({
        client_email: "a@b.com",
        client_name: "Jane Doe",
        session_date: future.toISOString().slice(0, 10),
        start_time: "10:00",
        duration_minutes: 90,
        price: 50,
        session_type: "Massage",
      });
      expect(result.success).toBe(true);
    });
    it("rejects start_time 24:00", () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      const result = sessionSchema.safeParse({
        client_email: "a@b.com",
        client_name: "Jane Doe",
        session_date: future.toISOString().slice(0, 10),
        start_time: "24:00",
        duration_minutes: 60,
        price: 50,
        session_type: "Massage",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("productSchema edge cases", () => {
    it("rejects name too short", () => {
      const result = productSchema.safeParse({
        name: "ab",
        price_amount: 50,
        currency: "gbp",
      });
      expect(result.success).toBe(false);
    });
    it("accepts optional duration_minutes", () => {
      const result = productSchema.safeParse({
        name: "Product Name",
        price_amount: 50,
        currency: "gbp",
      });
      expect(result.success).toBe(true);
    });
  });
});
