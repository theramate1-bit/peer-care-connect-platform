import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ChevronLeft, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPractitionerClients } from "@/lib/practitionerClients";
import {
  createTreatmentPlanRpc,
  fetchSessionsForTreatmentPlan,
  fetchTreatmentPlanById,
  fetchTreatmentPlansForPractitioner,
  jsonbToStringList,
  updateTreatmentPlanRpc,
  type TreatmentPlanRow,
} from "@/lib/practitionerTreatmentPlans";

const STATUSES = ["active", "paused", "completed", "cancelled"] as const;

function PlanList({
  plans,
  onOpen,
}: {
  plans: TreatmentPlanRow[];
  onOpen: (id: string) => void;
}) {
  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No care plans yet.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {plans.map((p) => (
        <Card
          key={p.id}
          className="cursor-pointer hover:border-primary/40"
          onClick={() => onOpen(p.id)}
        >
          <CardHeader className="pb-2 flex flex-row justify-between">
            <CardTitle className="text-base">{p.title}</CardTitle>
            <Badge variant="outline" className="capitalize">
              {p.status}
            </Badge>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Updated {format(new Date(p.updated_at), "PP")}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const PracticeTreatmentPlans: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const planId = searchParams.get("plan");
  const isNew = searchParams.get("new") === "1";
  const clientIdParam = searchParams.get("clientId");

  const [plans, setPlans] = useState<TreatmentPlanRow[]>([]);
  const [plan, setPlan] = useState<TreatmentPlanRow | null>(null);
  const [linked, setLinked] = useState<
    Awaited<ReturnType<typeof fetchSessionsForTreatmentPlan>>["data"]
  >([]);
  const [clients, setClients] = useState<{ client_id: string; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("active");
  const [goalsText, setGoalsText] = useState("");
  const [interventionsText, setInterventionsText] = useState("");
  const [clinicianNotes, setClinicianNotes] = useState("");
  const [newClientId, setNewClientId] = useState(clientIdParam ?? "");
  const [saving, setSaving] = useState(false);

  const loadList = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await fetchTreatmentPlansForPractitioner(user.id);
      if (error) throw error;
      setPlans(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load care plans");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadDetail = useCallback(async () => {
    if (!user?.id || !planId) return;
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetchTreatmentPlanById(planId),
        fetchSessionsForTreatmentPlan({
          planId,
          practitionerId: user.id,
        }),
      ]);
      if (pRes.error) throw pRes.error;
      if (sRes.error) throw sRes.error;
      const p = pRes.data;
      setPlan(p);
      setLinked(sRes.data);
      if (p) {
        setTitle(p.title);
        setStatus(p.status);
        setGoalsText(jsonbToStringList(p.goals).join("\n"));
        setInterventionsText(jsonbToStringList(p.interventions).join("\n"));
        setClinicianNotes(p.clinician_notes ?? "");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load plan");
    } finally {
      setLoading(false);
    }
  }, [user?.id, planId]);

  const loadClients = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await fetchPractitionerClients(user.id);
    setClients(
      data
        .filter((c) => c.client_id)
        .map((c) => ({ client_id: c.client_id!, name: c.name })),
    );
  }, [user?.id]);

  useEffect(() => {
    if (isNew) {
      void loadClients();
      setLoading(false);
      return;
    }
    if (planId) void loadDetail();
    else void loadList();
  }, [isNew, planId, loadList, loadDetail, loadClients]);

  const openPlan = (id: string) => {
    setSearchParams({ plan: id });
  };

  const createPlan = async () => {
    if (!user?.id || !newClientId.trim() || !title.trim()) {
      toast.error("Client ID and title are required");
      return;
    }
    setSaving(true);
    try {
      const goals = goalsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const interventions = interventionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const { data: id, error } = await createTreatmentPlanRpc({
        practitionerId: user.id,
        clientId: newClientId.trim(),
        title: title.trim(),
        goals: goals.length ? goals : ["Goal to be defined"],
        interventions: interventions.length
          ? interventions
          : ["Intervention to be defined"],
        startDate: null,
        endDate: null,
        clinicianNotes: clinicianNotes.trim() || null,
      });
      if (error || !id) throw error ?? new Error("Create failed");
      toast.success("Care plan created");
      setSearchParams({ plan: id });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not create plan");
    } finally {
      setSaving(false);
    }
  };

  const savePlan = async () => {
    if (!planId) return;
    setSaving(true);
    try {
      const goals = goalsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const interventions = interventionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const { ok, error } = await updateTreatmentPlanRpc({
        planId,
        patch: {
          title: title.trim(),
          status,
          goals,
          interventions,
          clinician_notes: clinicianNotes.trim() || null,
        },
      });
      if (error) throw error;
      if (!ok) throw new Error("Update failed");
      toast.success("Saved");
      void loadDetail();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (isNew) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate("/practice/treatment-plans")}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <PageHeader title="New care plan" />
        <div className="space-y-4">
          <div>
            <Label>Client user ID</Label>
            <Input
              value={newClientId}
              onChange={(e) => setNewClientId(e.target.value)}
              placeholder="UUID from client roster"
            />
            {clients.length > 0 ? (
              <select
                className="mt-2 w-full border rounded-md px-3 py-2 text-sm"
                value={newClientId}
                onChange={(e) => setNewClientId(e.target.value)}
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.client_id} value={c.client_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Goals (one per line)</Label>
            <Textarea
              value={goalsText}
              onChange={(e) => setGoalsText(e.target.value)}
              rows={4}
            />
          </div>
          <div>
            <Label>Interventions (one per line)</Label>
            <Textarea
              value={interventionsText}
              onChange={(e) => setInterventionsText(e.target.value)}
              rows={4}
            />
          </div>
          <div>
            <Label>Clinician notes</Label>
            <Textarea
              value={clinicianNotes}
              onChange={(e) => setClinicianNotes(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={() => void createPlan()} disabled={saving}>
            {saving ? "Creating…" : "Create plan"}
          </Button>
        </div>
      </div>
    );
  }

  if (planId && loading && !plan) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <p className="text-center text-muted-foreground">Loading plan…</p>
      </div>
    );
  }

  if (planId && plan) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate("/practice/treatment-plans")}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          All plans
        </Button>
        <PageHeader
          title={plan.title}
          description={`Client ${plan.client_id.slice(0, 8)}…`}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadDetail()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </PageHeader>

        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Goals</Label>
            <Textarea
              value={goalsText}
              onChange={(e) => setGoalsText(e.target.value)}
              rows={4}
            />
          </div>
          <div>
            <Label>Interventions</Label>
            <Textarea
              value={interventionsText}
              onChange={(e) => setInterventionsText(e.target.value)}
              rows={4}
            />
          </div>
          <div>
            <Label>Clinician notes</Label>
            <Textarea
              value={clinicianNotes}
              onChange={(e) => setClinicianNotes(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={() => void savePlan()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>

          <h3 className="text-lg font-semibold pt-4">Linked sessions</h3>
          {linked.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sessions linked yet.
            </p>
          ) : (
            linked.map((s) => (
              <Card key={s.link_id}>
                <CardContent className="py-4 text-sm flex justify-between items-center">
                  <span>
                    {s.session_date} · {s.start_time?.slice(0, 5)} ·{" "}
                    {s.session_type}
                  </span>
                  <Button variant="link" className="h-auto p-0" asChild>
                    <Link to={`/practice/clinical-notes/${s.session_id}`}>
                      Notes
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <PageHeader
        title="Care plans"
        description="Treatment plans for your clients."
      >
        <Button asChild size="sm">
          <Link to="/practice/treatment-plans?new=1">
            <Plus className="h-4 w-4 mr-1" />
            New
          </Link>
        </Button>
      </PageHeader>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Loading…</p>
      ) : (
        <PlanList plans={plans} onOpen={openPlan} />
      )}
    </div>
  );
};

export default PracticeTreatmentPlans;
