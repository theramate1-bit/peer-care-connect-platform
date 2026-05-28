/**
 * Client-side email triggers — prefer DB/pg_net where possible; this is a
 * fallback for expiry notices when the UI detects expired requests.
 */

import { supabase } from "@/integrations/supabase/client";

export const NotificationSystem = {
  async sendMobileBookingExpiredNotification(
    _userId: string,
    params: {
      requestId: string;
      practitionerName?: string;
      serviceType?: string;
      requestedDate?: string;
      requestedTime?: string;
    },
  ): Promise<void> {
    const { error } = await supabase.functions.invoke(
      "send-booking-notification",
      {
        body: {
          emailType: "mobile_expired",
          requestId: params.requestId,
        },
      },
    );
    if (error) {
      throw error;
    }
  },
};
