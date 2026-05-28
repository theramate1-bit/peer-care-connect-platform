import { APP_CONFIG } from "@/constants/config";
import { openHostedWebSession } from "@/lib/openHostedWeb";

/**
 * Guest card checkout stays on the web app (product policy). Opens in-app WebView.
 */
export function openGuestBookingOnWeb(params: {
  practitionerId: string;
  mode?: "clinic" | "mobile";
}): void {
  const base = APP_CONFIG.WEB_URL.replace(/\/$/, "");
  const q = new URLSearchParams({
    therapistId: params.practitionerId,
    guest: "1",
  });
  if (params.mode === "mobile") {
    q.set("mode", "mobile");
  }
  openHostedWebSession({
    kind: "web_app",
    url: `${base}/client/booking?${q.toString()}`,
    dismissPath: "/booking",
  });
}
