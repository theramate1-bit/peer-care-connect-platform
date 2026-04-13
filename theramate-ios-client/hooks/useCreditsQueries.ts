import React from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchMyCredits, fetchMyCreditTransactions } from "@/lib/api/credits";

export function useCreditsQueries(
  userId: string | undefined,
  enabled: boolean,
) {
  const creditsQuery = useQuery({
    queryKey: ["credits", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await fetchMyCredits(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId && enabled,
  });

  const txQuery = useQuery({
    queryKey: ["credit_transactions", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchMyCreditTransactions({
        userId,
        limit: 60,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && enabled,
  });

  const loading = creditsQuery.isLoading || txQuery.isLoading;
  const hasError = creditsQuery.isError || txQuery.isError;
  const errMsg =
    (creditsQuery.error instanceof Error
      ? creditsQuery.error.message
      : "") ||
    (txQuery.error instanceof Error ? txQuery.error.message : "") ||
    "Could not load credits.";

  const refetchAll = React.useCallback(() => {
    void creditsQuery.refetch();
    void txQuery.refetch();
  }, [creditsQuery.refetch, txQuery.refetch]);

  return {
    creditsQuery,
    txQuery,
    loading,
    hasError,
    errMsg,
    refetchAll,
  };
}
