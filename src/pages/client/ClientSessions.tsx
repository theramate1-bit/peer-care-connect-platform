import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Calendar, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchClientSessions,
  getSessionStartDate,
  isSessionUpcoming,
  type SessionWithTherapist,
} from "@/lib/clientSessions";

function formatWhen(s: SessionWithTherapist): string {
  const d = getSessionStartDate(s);
  return `${format(d, "EEE d MMM yyyy")} · ${format(d, "HH:mm")}`;
}

/**
 * Client sessions list — parity with app bookings tab (simplified).
 */
const ClientSessions: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithTherapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await fetchClientSessions(user.id);
      if (error) throw error;
      setSessions(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load sessions");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const { upcoming, past } = useMemo(() => {
    const up = sessions
      .filter(isSessionUpcoming)
      .sort(
        (a, b) =>
          getSessionStartDate(a).getTime() - getSessionStartDate(b).getTime(),
      );
    const pa = sessions
      .filter((s) => !isSessionUpcoming(s))
      .sort(
        (a, b) =>
          getSessionStartDate(b).getTime() - getSessionStartDate(a).getTime(),
      );
    return { upcoming: up, past: pa };
  }, [sessions]);

  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <PageHeader
        title="My sessions"
        description="Upcoming and past appointments."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </PageHeader>

      <div className="flex gap-2 mb-6">
        <Button
          variant={tab === "upcoming" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("upcoming")}
        >
          Upcoming ({upcoming.length})
        </Button>
        <Button
          variant={tab === "past" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("past")}
        >
          Past ({past.length})
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading…</p>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-muted-foreground">No {tab} sessions.</p>
            <Button asChild>
              <Link to="/marketplace">Book a session</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base">
                    {s.therapist_name}
                  </CardTitle>
                  <Badge variant="secondary">{s.status ?? "scheduled"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatWhen(s)}
                </p>
                <p className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {s.duration_minutes} min · {s.session_type || "Session"}
                </p>
                <Button variant="link" className="h-auto p-0 mt-2" asChild>
                  <Link to="/booking/find">Find booking details by email</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientSessions;
