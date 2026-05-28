import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Calendar, ChevronRight, MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrencyFromPence } from "@/lib/utils";
import {
  fetchPractitionerDashboard,
  type PractitionerDashboardData,
} from "@/lib/practitionerDashboard";
import type { SessionWithClient } from "@/lib/practitionerSessions";

function SessionRow({ s }: { s: SessionWithClient }) {
  const loc =
    (s.appointment_type || "clinic").toLowerCase() === "mobile"
      ? "Mobile"
      : "Clinic";
  return (
    <div className="flex items-center py-3 border-b last:border-0">
      <div className="flex-1">
        <p className="font-medium">{s.client_name}</p>
        <p className="text-sm text-muted-foreground">
          {s.session_type || "Session"} · {s.start_time?.slice(0, 5)} ·{" "}
          {s.duration_minutes} min
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <MapPin className="h-3 w-3" />
          {loc}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

/**
 * Practitioner home — parity with app `(ptabs)/index`.
 */
const PracticeDashboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [dash, setDash] = useState<PractitionerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const name =
    userProfile?.first_name?.trim() ||
    userProfile?.email?.split("@")[0] ||
    "there";

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await fetchPractitionerDashboard(user.id);
      if (error) throw error;
      setDash(data);
    } catch (e) {
      console.error(e);
      toast.error("Could not load dashboard");
      setDash(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const mobilePending = dash?.pendingMobileRequestsCount ?? 0;
  const exchangePending =
    (dash?.pendingExchangeCount ?? 0) +
    (dash?.exchangeOutgoingPendingCount ?? 0) +
    (dash?.exchangeReciprocalNeededCount ?? 0) +
    (dash?.exchangeAwaitingReciprocalCount ?? 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <PageHeader
        title={`Hello, ${name}`}
        description="Today's sessions and items that need your attention."
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/notifications">
              <Bell className="h-4 w-4 mr-1" />
              {dash && dash.unreadNotificationsCount > 0
                ? dash.unreadNotificationsCount
                : null}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">
          Loading dashboard…
        </p>
      ) : !dash ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Dashboard unavailable.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(mobilePending > 0 || exchangePending > 0) && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Action required</h2>
              {mobilePending > 0 ? (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="pt-6">
                    <p className="font-medium">Mobile visit requests</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {mobilePending} pending request
                      {mobilePending === 1 ? "" : "s"}.
                    </p>
                    <Button className="mt-3" size="sm" asChild>
                      <Link to="/practice/mobile-requests">Review</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
              {exchangePending > 0 ? (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="pt-6">
                    <p className="font-medium">Treatment exchange</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {dash.pendingExchangeCount > 0 &&
                        `${dash.pendingExchangeCount} to answer. `}
                      {dash.exchangeReciprocalNeededCount > 0 &&
                        `${dash.exchangeReciprocalNeededCount} reciprocal session(s) to book. `}
                      {dash.exchangeAwaitingReciprocalCount > 0 &&
                        `${dash.exchangeAwaitingReciprocalCount} awaiting their return book.`}
                    </p>
                    <Button className="mt-3" size="sm" asChild>
                      <Link to="/practice/exchange-requests">
                        Open exchange
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">This month</p>
                <p className="text-2xl font-bold">{dash.monthSessionCount}</p>
                <p className="text-xs text-muted-foreground">sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Month revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrencyFromPence(dash.monthRevenuePence)}
                </p>
                <p className="text-xs text-muted-foreground">booked value</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/practice/upcoming-sessions">Full diary</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {dash.todaySessions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No sessions today.
                </p>
              ) : (
                dash.todaySessions.map((s) => <SessionRow key={s.id} s={s} />)
              )}
            </CardContent>
          </Card>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" asChild>
              <Link to="/practice/clients">Clients</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/practice/schedule">Diary</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/bookings">All bookings</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/practice/scheduler">Availability</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/practice/billing">Billing</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/credits">Peer credits</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/practice/analytics">Analytics</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/practice/treatment-plans">Care plans</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/practice/clinical-files">Clinical files</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeDashboard;
