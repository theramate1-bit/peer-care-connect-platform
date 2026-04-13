import { useQuery } from "@tanstack/react-query";
import { fetchPractitionerSessions } from "@/lib/api/practitionerSessions";

export function usePractitionerSessions(therapistId: string | undefined) {
  return useQuery({
    queryKey: ["practitioner_sessions", therapistId],
    queryFn: async () => {
      if (!therapistId) return [];
      const { data, error } = await fetchPractitionerSessions(therapistId);
      if (error) throw error;
      return data;
    },
    enabled: !!therapistId,
  });
}
