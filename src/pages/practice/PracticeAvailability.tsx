import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_WORKING_HOURS,
  fetchPractitionerAvailability,
  savePractitionerAvailability,
  type DaySchedule,
  type SessionDefaults,
  type WorkingHoursState,
} from "@/lib/practitionerAvailability";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const PracticeAvailability: React.FC = () => {
  const { user } = useAuth();
  const [hours, setHours] = useState<WorkingHoursState>({
    ...DEFAULT_WORKING_HOURS,
  });
  const [defaults, setDefaults] = useState<SessionDefaults>({
    default_session_time: "10:00",
    default_duration_minutes: 60,
    default_session_type: "Treatment Session",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await fetchPractitionerAvailability(user.id);
      if (error) throw error;
      if (data) {
        setHours(data.working_hours);
        setDefaults({
          default_session_time: data.default_session_time,
          default_duration_minutes: data.default_duration_minutes,
          default_session_type: data.default_session_type,
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load availability");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateDay = (day: string, patch: Partial<DaySchedule>) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...patch },
    }));
  };

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { ok, error } = await savePractitionerAvailability({
        userId: user.id,
        workingHours: hours,
        sessionDefaults: defaults,
      });
      if (error) throw error;
      if (!ok) throw new Error("Save failed");
      toast.success("Availability saved");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <PageHeader
        title="Availability"
        description="Weekly hours and default session settings (same data as the mobile app)."
      />

      {loading ? (
        <p className="text-muted-foreground py-8 text-center">Loading…</p>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Working hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {DAYS.map((day) => {
                const d = hours[day];
                return (
                  <div
                    key={day}
                    className="flex flex-wrap items-center gap-3 border-b pb-3 last:border-0"
                  >
                    <div className="w-28 capitalize font-medium">{day}</div>
                    <Switch
                      checked={d.enabled}
                      onCheckedChange={(enabled) => updateDay(day, { enabled })}
                    />
                    <Input
                      type="time"
                      className="w-32"
                      disabled={!d.enabled}
                      value={d.start}
                      onChange={(e) =>
                        updateDay(day, { start: e.target.value })
                      }
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      className="w-32"
                      disabled={!d.enabled}
                      value={d.end}
                      onChange={(e) => updateDay(day, { end: e.target.value })}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Session defaults</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Default start time</Label>
                <Input
                  type="time"
                  value={defaults.default_session_time}
                  onChange={(e) =>
                    setDefaults((d) => ({
                      ...d,
                      default_session_time: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  value={defaults.default_duration_minutes}
                  onChange={(e) =>
                    setDefaults((d) => ({
                      ...d,
                      default_duration_minutes: Number(e.target.value) || 60,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Session type label</Label>
                <Input
                  value={defaults.default_session_type}
                  onChange={(e) =>
                    setDefaults((d) => ({
                      ...d,
                      default_session_type: e.target.value,
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save availability"}
          </Button>
        </>
      )}
    </div>
  );
};

export default PracticeAvailability;
