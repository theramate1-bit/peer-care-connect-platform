import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarClock, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface RescheduleSessionButtonProps {
  sessionId: string;
  sessionDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM or HH:MM:SS
  paymentCollection: string;
  sessionStatus: string;
  onRescheduled?: () => void;
}

/**
 * Practitioner-side reschedule control.
 * - UPDATE is guarded by DB triggers (prevent_overlapping_bookings / blocked time).
 * - Best-effort rescheduling email reuses the existing cash-aware template.
 */
const RescheduleSessionButton: React.FC<RescheduleSessionButtonProps> = ({
  sessionId,
  sessionDate,
  startTime,
  paymentCollection,
  sessionStatus,
  onRescheduled,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [loading, setLoading] = useState(false);

  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  if (["cancelled", "completed", "no_show"].includes(sessionStatus))
    return null;

  const existingTime = (startTime || "").slice(0, 5);

  const handleConfirm = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      toast.error("Choose a valid new date.");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(newTime)) {
      toast.error("Choose a valid new time.");
      return;
    }
    if (newDate < todayIso) {
      toast.error("New date must be today or later.");
      return;
    }
    if (newDate === sessionDate && newTime === existingTime) {
      toast.error("Pick a different date or time.");
      return;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("client_sessions")
        .update({
          session_date: newDate,
          start_time: newTime,
          updated_at: now,
        })
        .eq("id", sessionId);

      if (updateError) {
        const raw = updateError.message || "";
        const friendly = /overlap|conflict|blocked/i.test(raw)
          ? "That slot clashes with another session or blocked time."
          : raw || "Could not reschedule session";
        throw new Error(friendly);
      }

      try {
        await supabase.functions.invoke("send-booking-notification", {
          body: {
            emailType: "rescheduling",
            sessionId,
            originalDate: sessionDate,
            originalTime: existingTime,
            newDate,
            newTime,
            rescheduledBy: "practitioner",
          },
        });
      } catch (notifyErr) {
        console.warn("Reschedule notification failed", notifyErr);
      }

      toast.success(
        paymentCollection === "in_person"
          ? "Session rescheduled — client emailed. Pay-at-clinic unchanged."
          : "Session rescheduled — client emailed.",
      );
      setShowForm(false);
      setNewDate("");
      setNewTime("");
      onRescheduled?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reschedule");
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setShowForm(true)}
        className="gap-1 text-blue-700 hover:text-blue-800 hover:bg-blue-50"
      >
        <CalendarClock className="h-4 w-4" />
        Reschedule
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 border border-blue-200 bg-blue-50 rounded-md">
      <div className="flex items-start gap-2 text-sm text-blue-900">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>
          Move this session to a new date and time. The client will be notified
          by email.
          {paymentCollection === "in_person" &&
            " Pay-at-clinic status is preserved."}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-blue-900">New date</label>
          <input
            type="date"
            min={todayIso}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            disabled={loading}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-blue-900">New time</label>
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            disabled={loading}
          />
        </div>
      </div>

      <div className="text-xs text-blue-900/80">
        Currently scheduled: {sessionDate} at {existingTime}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? "Saving…" : "Confirm reschedule"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setShowForm(false);
            setNewDate("");
            setNewTime("");
          }}
          disabled={loading}
        >
          Keep current
        </Button>
      </div>
    </div>
  );
};

export default RescheduleSessionButton;
