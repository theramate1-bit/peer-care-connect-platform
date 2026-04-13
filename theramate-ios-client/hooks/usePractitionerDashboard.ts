import { useQuery } from "@tanstack/react-query";
import { fetchPractitionerDashboard } from "@/lib/api/practitionerDashboard";

export function usePractitionerDashboard(practitionerId: string | undefined) {
  return useQuery({
    queryKey: ["practitioner_dashboard", practitionerId],
    queryFn: async () => {
      if (!practitionerId) return null;
      const { data, error } = await fetchPractitionerDashboard(practitionerId);
      if (error) throw error;
      return data;
    },
    enabled: !!practitionerId,
  });
}
