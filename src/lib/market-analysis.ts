/**
 * Market analysis for practitioners (KAN-71).
 * Aggregates anonymized pricing data from practitioner_products
 * (no practitioner names or identifiers) for averages and ranges.
 */

import { supabase } from "@/integrations/supabase/client";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cacheSingle: Record<string, { data: MarketAnalysis; at: number }> = {};
let cacheBreakdown: { data: MarketAnalysisBreakdownRow[]; at: number } | null = null;

export interface MarketAnalysis {
  averagePence: number;
  minPence: number;
  maxPence: number;
  sampleSize: number;
}

export interface MarketAnalysisBreakdownRow {
  serviceCategory: string;
  averagePence: number;
  minPence: number;
  maxPence: number;
  sampleSize: number;
}

export type YourPriceVsMarket = "above" | "below" | "at";

/**
 * Compare current price to market average (tolerance ~2% for "at").
 */
export function getYourPriceVsMarket(
  currentPricePence: number,
  averagePence: number
): YourPriceVsMarket {
  if (averagePence <= 0) return "at";
  const diff = (currentPricePence - averagePence) / averagePence;
  if (diff > 0.02) return "above";
  if (diff < -0.02) return "below";
  return "at";
}

/**
 * Get anonymized market analysis for a single service type.
 * Returns average, min, max and sample size (no practitioner data).
 */
export async function getMarketAnalysisForService(
  serviceCategory: string | undefined
): Promise<MarketAnalysis | null> {
  if (!serviceCategory?.trim()) return null;

  const cacheKey = serviceCategory;
  const cached = cacheSingle[cacheKey];
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
  const averagePence = Math.round(sum / amounts.length);
  const minPence = Math.min(...amounts);
  const maxPence = Math.max(...amounts);

  const result: MarketAnalysis = {
    averagePence,
    minPence,
    maxPence,
    sampleSize: amounts.length,
  };

  cacheSingle[cacheKey] = { data: result, at: Date.now() };
  return result;
}

/**
 * Get breakdown by service type (all categories with active listings).
 * Used for "View market analysis" expanded view.
 */
export async function getMarketAnalysisBreakdown(): Promise<MarketAnalysisBreakdownRow[]> {
  if (cacheBreakdown && Date.now() - cacheBreakdown.at < CACHE_TTL_MS) {
    return cacheBreakdown.data;
  }

  const { data: rows, error } = await supabase
    .from("practitioner_products")
    .select("service_category, price_amount")
    .eq("is_active", true)
    .not("price_amount", "is", null)
    .not("service_category", "is", null)
    .gt("price_amount", 0);

  if (error || !rows?.length) {
    return [];
  }

  const byCategory: Record<string, number[]> = {};
  for (const r of rows) {
    const cat = (r.service_category as string)?.trim();
    if (!cat) continue;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(r.price_amount as number);
  }

  const result: MarketAnalysisBreakdownRow[] = Object.entries(byCategory).map(
    ([serviceCategory, amounts]) => {
      const sum = amounts.reduce((a, b) => a + b, 0);
      return {
        serviceCategory,
        averagePence: Math.round(sum / amounts.length),
        minPence: Math.min(...amounts),
        maxPence: Math.max(...amounts),
        sampleSize: amounts.length,
      };
    }
  );

  result.sort((a, b) => a.serviceCategory.localeCompare(b.serviceCategory));
  cacheBreakdown = { data: result, at: Date.now() };
  return result;
}
