import { useQuery } from "@tanstack/react-query";
import { fetchPractitionerMobileRequests } from "@/lib/api/practitionerMobileRequests";

export function usePractitionerMobileRequests(
  practitionerId: string | undefined,
  status: string | null = "pending",
) {
  return useQuery({
    queryKey: ["practitioner_mobile_requests", practitionerId, status],
    queryFn: async () => {
      if (!practitionerId) return [];
      const { data, error } = await fetchPractitionerMobileRequests(
        practitionerId,
        status,
      );
      if (error) throw error;
      return data;
    },
    enabled: !!practitionerId,
  });
}
