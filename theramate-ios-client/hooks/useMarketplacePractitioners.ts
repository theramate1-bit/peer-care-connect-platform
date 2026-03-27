import { useQuery } from "@tanstack/react-query";
import {
  fetchMarketplacePractitioners,
  type MarketplacePractitioner,
} from "@/lib/api/marketplace";

export function useMarketplacePractitioners() {
  return useQuery<MarketplacePractitioner[]>({
    queryKey: ["marketplace", "practitioners"],
    queryFn: async () => {
      const { data, error } = await fetchMarketplacePractitioners();
      if (error) throw error;
      return data;
    },
  });
}
