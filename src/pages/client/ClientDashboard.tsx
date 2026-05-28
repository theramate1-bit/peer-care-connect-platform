import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, isToday, isTomorrow } from "date-fns";
import { Calendar, ChevronRight, Clock, Search } from "lucide-react";
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

function formatSessionWhen(s: SessionWithTherapist): string {
  const d = getSessionStartDate(s);
  const t = format(d, "HH:mm");
  if (isToday(d)) return `Today · ${t}`;
  if (isTomorrow(d)) return `Tomorrow · ${t}`;
  return `${format(d, "EEE d MMM")} · ${t}`;
}

/**
 * Client home — parity with app `(tabs)/index` (next session + quick links).
 */
const ClientDashboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [sessions, setSessions] = useState<SessionWithTherapist[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setSessions([]);
      setLoading(false);
      return;
    }
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

  const nextSession = useMemo(() => {
    const upcoming = sessions
      .filter(isSessionUpcoming)
      .sort(
        (a, b) =>
          getSessionStartDate(a).getTime() - getSessionStartDate(b).getTime(),
      );
    return upcoming[0] ?? null;
  }, [sessions]);

  const firstName = userProfile?.first_name?.trim() || "there";

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <PageHeader
        title={`Hello, ${firstName}`}
        description="Your upcoming care and quick actions."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Next session
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : nextSession ? (
            <div className="space-y-2">
              <p className="font-medium">{nextSession.therapist_name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatSessionWhen(nextSession)}
              </p>
              <Badge variant="secondary">
                {nextSession.status ?? "scheduled"}
              </Badge>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link to="/client/sessions">All sessions</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                No upcoming sessions. Book your next visit from the marketplace.
              </p>
              <Button asChild>
                <Link to="/marketplace">
                  <Search className="h-4 w-4 mr-2" />
                  Find a practitioner
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="ghost"
              className="w-full justify-between h-auto py-3"
              asChild
            >
              <Link to="/client/booking">
                Book a session
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="ghost"
              className="w-full justify-between h-auto py-3"
              asChild
            >
              <Link to="/client/mobile-requests">
                Mobile requests
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="ghost"
              className="w-full justify-between h-auto py-3"
              asChild
            >
              <Link to="/client/messages">
                Messages
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="ghost"
              className="w-full justify-between h-auto py-3"
              asChild
            >
              <Link to="/client/plans">
                Treatment plans
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="ghost"
              className="w-full justify-between h-auto py-3"
              asChild
            >
              <Link to="/client/exercises">
                Exercises
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="ghost"
              className="w-full justify-between h-auto py-3"
              asChild
            >
              <Link to="/client/favorites">
                Saved practitioners
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="ghost"
              className="w-full justify-between h-auto py-3"
              asChild
            >
              <Link to="/client/progress">
                Progress & goals
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="ghost"
              className="w-full justify-between h-auto py-3"
              asChild
            >
              <Link to="/client/sessions">
                My sessions
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="ghost"
              className="w-full justify-between h-auto py-3"
              asChild
            >
              <Link to="/booking/find">
                Find my booking
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDashboard;
