import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Mirrors web `BookingCalendar` realtime: sessions, blocks, working hours.
 */
export function usePractitionerDiaryRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const invalidateSessions = () => {
      void queryClient.invalidateQueries({
        queryKey: ["practitioner_sessions", userId],
      });
    };

    const invalidateCalendar = () => {
      void queryClient.invalidateQueries({
        queryKey: ["practitioner_calendar", userId],
      });
    };

    const invalidateAvailability = () => {
      void queryClient.invalidateQueries({
        queryKey: ["practitioner_availability", userId],
      });
    };

    const chTherapist = supabase
      .channel(`practitioner_diary_sess_th_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_sessions",
          filter: `therapist_id=eq.${userId}`,
        },
        invalidateSessions,
      )
      .subscribe();

    const chClient = supabase
      .channel(`practitioner_diary_sess_cl_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_sessions",
          filter: `client_id=eq.${userId}`,
        },
        invalidateSessions,
      )
      .subscribe();

    const chBlocks = supabase
      .channel(`practitioner_diary_blocks_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "calendar_events",
          filter: `user_id=eq.${userId}`,
        },
        invalidateCalendar,
      )
      .subscribe();

    const chAvail = supabase
      .channel(`practitioner_diary_avail_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "practitioner_availability",
          filter: `user_id=eq.${userId}`,
        },
        invalidateAvailability,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(chTherapist);
      void supabase.removeChannel(chClient);
      void supabase.removeChannel(chBlocks);
      void supabase.removeChannel(chAvail);
    };
  }, [userId, queryClient]);
}
