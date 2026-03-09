/**
 * Pricing recommendations for practitioners (KAN-70).
 * Uses marketplace data (practitioner_products) to suggest competitive prices
 * by service type; optionally adjusts for experience and duration.
 */

import { supabase } from "@/integrations/supabase/client";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache: Record<string, { data: PricingRecommendation; at: number }> = {};

export interface PricingRecommendation {
  recommendedPricePence: number;
  factors: string[];
  marketAveragePence: number;
  sampleSize: number;
}

/**
 * Get a recommended price for a service based on market data.
 * Aggregates completed prices from practitioner_products by service_category;
 * optionally applies a small adjustment for experience and duration.
 */
export async function getPricingRecommendation(
  serviceCategory: string | undefined,
  options?: {
    durationMinutes?: number;
    experienceYears?: number;
    location?: string;
  }
): Promise<PricingRecommendation | null> {
  if (!serviceCategory?.trim()) return null;

  const cacheKey = [serviceCategory, options?.durationMinutes ?? 0, options?.experienceYears ?? 0].join(":");
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  const { data: rows, error } = await supabase
    .from("practitioner_products")
    .select("price_amount")
    .eq("is_active", true)
    .eq("service_category", serviceCategory)
    .not("price_amount", "is", null)
    .gt("price_amount", 0);

  if (error || !rows?.length) {
    return null;
  }

  const amounts = rows.map((r) => r.price_amount as number);
  const sum = amounts.reduce((a, b) => a + b, 0);
  const marketAveragePence = Math.round(sum / amounts.length);
  const sampleSize = amounts.length;

  const factors: string[] = [
    `Market average for this service type: £${(marketAveragePence / 100).toFixed(0)}`,
    `Based on ${sampleSize} active listing${sampleSize !== 1 ? "s" : ""}`,
  ];

  let recommendedPricePence = marketAveragePence;

  if (options?.durationMinutes && options.durationMinutes > 60) {
    const durationFactor = options.durationMinutes / 60;
    recommendedPricePence = Math.round(marketAveragePence * durationFactor);
    factors.push(`Adjusted for ${options.durationMinutes}-minute duration (vs 60 min baseline)`);
  }
  if (options?.experienceYears != null && options.experienceYears > 5) {
    const experienceBoost = Math.min(1.15, 1 + (options.experienceYears - 5) * 0.01);
    recommendedPricePence = Math.round(recommendedPricePence * experienceBoost);
    factors.push(`Slight premium for ${options.experienceYears}+ years experience`);
  }

  const result: PricingRecommendation = {
    recommendedPricePence,
    factors,
    marketAveragePence,
    sampleSize,
  };

  cache[cacheKey] = { data: result, at: Date.now() };
  return result;
}
