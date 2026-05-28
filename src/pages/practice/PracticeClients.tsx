import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ChevronLeft, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchPractitionerClients,
  normalizeClientEmail,
  type PractitionerClientSummary,
} from "@/lib/practitionerClients";
import {
  fetchPractitionerSessions,
  type SessionWithClient,
} from "@/lib/practitionerSessions";
import { fetchGoals, type GoalItem } from "@/lib/progress";
import {
  fetchHomeExercisePrograms,
  type HomeExerciseProgram,
} from "@/lib/exercises";

type HubTab = "sessions" | "goals" | "exercises";

function parseTab(raw: string | null): HubTab {
  if (raw === "goals" || raw === "exercises" || raw === "exercise-programs")
    return raw === "goals" ? "goals" : "exercises";
  return "sessions";
}

const PracticeClients: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const clientKey = searchParams.get("client");
  const emailParam = searchParams.get("email");
  const tab = parseTab(searchParams.get("tab"));

  const [clients, setClients] = useState<PractitionerClientSummary[]>([]);
  const [sessions, setSessions] = useState<SessionWithClient[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [programs, setPrograms] = useState<HomeExerciseProgram[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [hubLoading, setHubLoading] = useState(false);

  const selected = useMemo(() => {
    if (!clientKey && !emailParam) return null;
    return (
      clients.find((c) => c.key === clientKey) ??
      clients.find(
        (c) =>
          emailParam &&
          c.email &&
          normalizeClientEmail(c.email) === normalizeClientEmail(emailParam),
      ) ??
      null
    );
  }, [clients, clientKey, emailParam]);

  const loadList = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await fetchPractitionerClients(user.id);
      if (error) throw error;
      setClients(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load clients");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadHub = useCallback(async () => {
    if (!user?.id || !selected) return;
    setHubLoading(true);
    try {
      const emailNorm = selected.email
        ? normalizeClientEmail(selected.email)
        : null;
      const [sessRes, goalsRes, exRes] = await Promise.all([
        fetchPractitionerSessions(user.id),
        selected.client_id
          ? fetchGoals(selected.client_id)
          : Promise.resolve({ data: [] as GoalItem[], error: null }),
        selected.client_id
          ? fetchHomeExercisePrograms(selected.client_id)
          : Promise.resolve({ data: [] as HomeExerciseProgram[], error: null }),
      ]);
      if (sessRes.error) throw sessRes.error;
      if (goalsRes.error) throw goalsRes.error;
      if (exRes.error) throw exRes.error;

      const filtered = sessRes.data.filter((s) => {
        if (selected.client_id && s.client_id === selected.client_id)
          return true;
        if (emailNorm && s.client_email) {
          return normalizeClientEmail(s.client_email) === emailNorm;
        }
        return false;
      });
      setSessions(filtered);
      setGoals(goalsRes.data);
      setPrograms(exRes.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load client details");
    } finally {
      setHubLoading(false);
    }
  }, [user?.id, selected]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selected) void loadHub();
  }, [selected, loadHub]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)),
    );
  }, [clients, search]);

  const openClient = (c: PractitionerClientSummary) => {
    const next = new URLSearchParams(searchParams);
    next.set("client", c.key);
    if (c.email) next.set("email", c.email);
    next.set("tab", "sessions");
    setSearchParams(next);
  };

  const closeHub = () => {
    navigate("/practice/clients");
  };

  if (selected) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" size="sm" className="mb-4" onClick={closeHub}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          All clients
        </Button>
        <PageHeader
          title={selected.name}
          description={selected.email ?? undefined}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadHub()}
            disabled={hubLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${hubLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </PageHeader>

        <div className="flex gap-2 mb-4 text-sm text-muted-foreground">
          <span>{selected.session_count} sessions</span>
          <span>·</span>
          <Badge variant="outline">{selected.status}</Badge>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            const next = new URLSearchParams(searchParams);
            next.set("tab", v);
            setSearchParams(next);
          }}
        >
          <TabsList>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="exercises">Exercises</TabsTrigger>
          </TabsList>
          <TabsContent value="sessions" className="mt-4 space-y-2">
            {hubLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : sessions.length === 0 ? (
              <p className="text-muted-foreground">
                No sessions for this client.
              </p>
            ) : (
              sessions.map((s) => (
                <Card key={s.id}>
                  <CardContent className="py-4 text-sm">
                    <p className="font-medium">
                      {format(
                        new Date(`${s.session_date}T${s.start_time}`),
                        "PPp",
                      )}
                    </p>
                    <p className="text-muted-foreground">
                      {s.session_type} · {s.status} · {s.payment_status}
                    </p>
                    <div className="flex gap-3 mt-1">
                      <Button variant="link" className="h-auto p-0" asChild>
                        <Link to={`/practice/clinical-notes/${s.id}`}>
                          Clinical notes
                        </Link>
                      </Button>
                      <Button variant="link" className="h-auto p-0" asChild>
                        <Link to={`/bookings?highlight=${s.id}`}>Diary</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          <TabsContent value="goals" className="mt-4 space-y-2">
            {!selected.client_id ? (
              <p className="text-muted-foreground text-sm">
                Goals require a registered client account.
              </p>
            ) : goals.length === 0 ? (
              <p className="text-muted-foreground">No goals yet.</p>
            ) : (
              goals.map((g) => (
                <Card key={g.id}>
                  <CardContent className="py-4 text-sm">
                    <p className="font-medium">{g.goal_title}</p>
                    <p className="text-muted-foreground">{g.status}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          <TabsContent value="exercises" className="mt-4 space-y-2">
            {!selected.client_id ? (
              <p className="text-muted-foreground text-sm">
                Exercise programs require a registered client account.
              </p>
            ) : programs.length === 0 ? (
              <p className="text-muted-foreground">No programs assigned.</p>
            ) : (
              programs.map((p) => (
                <Card key={p.id}>
                  <CardContent className="py-4 text-sm">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-muted-foreground">
                      {p.exercises.length} exercise(s)
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <PageHeader
        title="Clients"
        description="People you have treated — grouped by email from completed sessions."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadList()}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </PageHeader>

      <Input
        className="mb-4"
        placeholder="Search name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Loading…</p>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No clients yet. Completed paid sessions appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredClients.map((c) => (
            <Card
              key={c.key}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => openClient(c)}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">{c.name}</CardTitle>
                <Badge variant="outline">{c.status}</Badge>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {c.email ?? "—"} · {c.session_count} sessions
                {c.last_session_date
                  ? ` · last ${format(new Date(c.last_session_date), "PP")}`
                  : ""}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PracticeClients;
