/**
 * Unit tests for practitionerServices
 */

jest.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import {
  getServiceCategories,
  getPractitionerServices,
  getActiveServices,
  getServiceById,
  type PractitionerService,
} from "../practitionerServices";
import { supabase } from "@/integrations/supabase/client";

const mockFrom = supabase.from as jest.Mock;

describe("practitionerServices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getServiceCategories", () => {
    it("returns categories from supabase", async () => {
      const mockCategories = [
        { id: "c1", name: "Sports Therapy", description: "Desc", platform_fee_percentage: 4, is_active: true },
      ];
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockCategories, error: null }),
      });

      const result = await getServiceCategories();
      expect(result).toEqual(mockCategories);
      expect(mockFrom).toHaveBeenCalledWith("service_categories");
    });

    it("throws on error", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
      });

      await expect(getServiceCategories()).rejects.toThrow("Failed to fetch service categories");
    });
  });

  describe("getPractitionerServices", () => {
    it("returns services for practitioner", async () => {
      const mockServices: PractitionerService[] = [
        {
          id: "s1",
          practitioner_id: "p1",
          service_name: "Sports Massage",
          service_type: "massage_therapy",
          duration_minutes: 60,
          base_price_pence: 7000,
          platform_fee_percentage: 4,
          platform_fee_pence: 280,
          practitioner_earnings_pence: 6720,
          is_active: true,
          created_at: "2025-01-01",
          updated_at: "2025-01-01",
        },
      ];
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockServices, error: null }),
      });

      const result = await getPractitionerServices("p1");
      expect(result).toEqual(mockServices);
      expect(mockFrom).toHaveBeenCalledWith("practitioner_services");
    });
  });

  describe("getActiveServices", () => {
    it("applies filters for sports_therapy", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      await getActiveServices({
        serviceType: "sports_therapy",
        minPrice: 5000,
        maxPrice: 10000,
        duration: 60,
      });

      const chain = mockFrom();
      expect(chain.eq).toHaveBeenCalledWith("is_active", true);
    });

    it("filters by massage_therapy and osteopathy service types", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      await getActiveServices({ serviceType: "massage_therapy" });
      await getActiveServices({ serviceType: "osteopathy" });

      expect(mockFrom).toHaveBeenCalledWith("practitioner_services");
    });
  });

  describe("getServiceById", () => {
    it("returns service when found", async () => {
      const mockService = {
        id: "s1",
        practitioner_id: "p1",
        service_name: "Sports Massage",
        service_type: "massage_therapy",
        duration_minutes: 60,
        base_price_pence: 7000,
      };
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockService, error: null }),
      });

      const result = await getServiceById("s1");
      expect(result).toEqual(mockService);
    });
  });
});
