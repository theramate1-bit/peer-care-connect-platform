import { useQuery } from "@tanstack/react-query";
import {
  fetchClientSessions,
  type SessionWithTherapist,
} from "@/lib/api/clientSessions";

export function useClientSessions(clientId: string | undefined) {
  return useQuery<SessionWithTherapist[]>({
    queryKey: ["client_sessions", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await fetchClientSessions(clientId);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}
