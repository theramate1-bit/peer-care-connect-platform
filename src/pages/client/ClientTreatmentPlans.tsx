import React, { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTreatmentPlans, type TreatmentPlan } from "@/lib/treatmentPlans";

const ClientTreatmentPlans: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await fetchTreatmentPlans(user.id);
      if (error) throw error;
      setPlans(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load treatment plans");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <PageHeader
        title="Treatment plans"
        description="Care plans shared by your practitioners."
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

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Loading…</p>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No treatment plans yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between gap-2">
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  {p.status ? (
                    <Badge variant="secondary">{p.status}</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {p.practitioner_name}
                </p>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {p.created_at ? (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(p.created_at), "PP")}
                  </p>
                ) : null}
                {Array.isArray(p.goals) && p.goals.length > 0 ? (
                  <div>
                    <p className="font-medium text-xs uppercase text-muted-foreground mb-1">
                      Goals
                    </p>
                    <ul className="list-disc pl-5">
                      {p.goals.slice(0, 5).map((g, i) => (
                        <li key={i}>
                          {typeof g === "object" && g && "title" in g
                            ? String((g as { title?: string }).title)
                            : String(g)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientTreatmentPlans;
