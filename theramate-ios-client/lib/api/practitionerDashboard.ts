/**
 * Aggregates practitioner home data: sessions, pending actions, light metrics.
 */

import { fetchPractitionerSessions, type SessionWithClient } from "./practitionerSessions";
import { fetchPractitionerMobileRequests } from "./practitionerMobileRequests";
import { fetchPendingExchangeRequestsForRecipient } from "./practitionerExchange";
import { fetchUserNotifications } from "./notifications";

export type PractitionerDashboardData = {
  sessions: SessionWithClient[];
  todaySessions: SessionWithClient[];
  pendingMobileRequestsCount: number;
  pendingExchangeCount: number;
  unreadNotificationsCount: number;
  monthSessionCount: number;
  monthRevenuePence: number;
};

function sessionDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchPractitionerDashboard(
  practitionerId: string,
): Promise<{ data: PractitionerDashboardData | null; error: Error | null }> {
  try {
    const [
      sessionsRes,
      mobileRes,
      exchangeRes,
      notifRes,
    ] = await Promise.all([
      fetchPractitionerSessions(practitionerId),
      fetchPractitionerMobileRequests(practitionerId, "pending"),
      fetchPendingExchangeRequestsForRecipient(practitionerId),
      fetchUserNotifications(practitionerId),
    ]);

    if (sessionsRes.error) throw sessionsRes.error;
    if (mobileRes.error) throw mobileRes.error;
    if (exchangeRes.error) throw exchangeRes.error;
    if (notifRes.error) throw notifRes.error;

    const sessions = sessionsRes.data;
    const today = sessionDateStr(new Date());
    const todaySessions = sessions.filter((s) => s.session_date === today);

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const monthStart = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const monthSessions = sessions.filter(
      (s) => s.session_date >= monthStart && s.session_date.slice(0, 7) === `${y}-${String(m + 1).padStart(2, "0")}`,
    );
    let monthRevenuePence = 0;
    for (const s of monthSessions) {
      const st = (s.status || "").toLowerCase();
      if (st === "cancelled" || st === "declined" || st === "expired") continue;
      if (s.price != null) monthRevenuePence += Math.round(Number(s.price) * 100);
    }

    const unread = (notifRes.data || []).filter(
      (n) => n.is_read !== true,
    ).length;

    const data: PractitionerDashboardData = {
      sessions,
      todaySessions: todaySessions.sort((a, b) =>
        a.start_time.localeCompare(b.start_time),
      ),
      pendingMobileRequestsCount: mobileRes.data.length,
      pendingExchangeCount: exchangeRes.data.length,
      unreadNotificationsCount: unread,
      monthSessionCount: monthSessions.filter((s) => {
        const st = (s.status || "").toLowerCase();
        return st === "completed" || st === "confirmed" || st === "scheduled";
      }).length,
      monthRevenuePence,
    };

    return { data, error: null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}
