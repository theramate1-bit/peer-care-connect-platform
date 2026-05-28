import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Dumbbell, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchHomeExercisePrograms,
  type HomeExerciseProgram,
} from "@/lib/exercises";

const ClientExercises: React.FC = () => {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<HomeExerciseProgram[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await fetchHomeExercisePrograms(user.id);
      if (error) throw error;
      setPrograms(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load exercise programs");
      setPrograms([]);
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
        title="My exercises"
        description="Programs assigned by your practitioner."
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
      ) : programs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No exercise programs yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {programs.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between gap-2">
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  {p.status ? (
                    <Badge variant="secondary">{p.status}</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {p.description ? (
                  <p className="text-muted-foreground">{p.description}</p>
                ) : null}
                {p.start_date ? (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(p.start_date), "PP")}
                    {p.end_date
                      ? ` – ${format(new Date(p.end_date), "PP")}`
                      : ""}
                  </p>
                ) : null}
                {p.exercises.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {p.exercises.map((ex) => (
                      <li key={ex.id}>
                        {ex.name}
                        {ex.sets != null && ex.reps != null
                          ? ` — ${ex.sets}×${ex.reps}`
                          : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No exercises listed.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground mt-8">
        Mark completions in the mobile app for progress tracking.
      </p>
    </div>
  );
};

export default ClientExercises;
