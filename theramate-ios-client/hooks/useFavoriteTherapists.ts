import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import {
  addFavorite,
  fetchFavoriteTherapistIds,
  removeFavorite,
} from "@/lib/api/favorites";

const qk = (userId: string | undefined) => ["favorite_therapist_ids", userId] as const;

export function useFavoriteTherapistIds() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk(userId),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchFavoriteTherapistIds(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useToggleFavoriteTherapist() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async ({
      therapistId,
      nextSaved,
    }: {
      therapistId: string;
      nextSaved: boolean;
    }) => {
      if (!userId) throw new Error("Not signed in");
      if (nextSaved) {
        const { error } = await addFavorite(userId, therapistId);
        if (error) throw error;
      } else {
        const { error } = await removeFavorite(userId, therapistId);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: qk(userId) });
      }
    },
  });
}
