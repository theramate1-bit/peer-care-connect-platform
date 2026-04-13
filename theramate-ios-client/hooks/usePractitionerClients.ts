import { useQuery } from "@tanstack/react-query";
import { fetchPractitionerClients } from "@/lib/api/practitionerClients";

export function usePractitionerClients(therapistId: string | undefined) {
  return useQuery({
    queryKey: ["practitioner_clients", therapistId],
    queryFn: async () => {
      if (!therapistId) return [];
      const { data, error } = await fetchPractitionerClients(therapistId);
      if (error) throw error;
      return data;
    },
    enabled: !!therapistId,
  });
}
