import React, { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { RefreshCw, Target } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { fetchGoals, type GoalItem } from "@/lib/progress";

const ClientProgressGoals: React.FC = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await fetchGoals(user.id);
      if (error) throw error;
      setGoals(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load goals");
      setGoals([]);
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
        title="Progress & goals"
        description="Goals set with your practitioner. Detailed metrics are shown per practitioner in the app."
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
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No goals yet. Your practitioner can add goals after a session.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => (
            <Card key={g.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between gap-2">
                  <CardTitle className="text-base">{g.goal_title}</CardTitle>
                  <Badge variant="secondary">{g.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {g.goal_description ? (
                  <p className="text-muted-foreground">{g.goal_description}</p>
                ) : null}
                <p>
                  Target: {g.target_value} {g.target_unit}
                  {g.target_date
                    ? ` by ${format(new Date(g.target_date), "PP")}`
                    : ""}
                </p>
                {g.progress_notes ? (
                  <p className="text-xs text-muted-foreground">
                    {g.progress_notes}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientProgressGoals;
