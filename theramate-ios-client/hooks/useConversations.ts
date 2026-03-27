import { useQuery } from "@tanstack/react-query";
import {
  fetchConversationSummaries,
  type ConversationSummary,
} from "@/lib/api/conversations";

export function useConversations(userId: string | undefined) {
  return useQuery<ConversationSummary[]>({
    queryKey: ["conversations", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchConversationSummaries(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
