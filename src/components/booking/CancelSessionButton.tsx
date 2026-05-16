import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CancelSessionButtonProps {
  sessionId: string;
  paymentCollection: string;
  paymentStatus: string;
  sessionStatus: string;
  onCancelled?: () => void;
}

const CancelSessionButton: React.FC<CancelSessionButtonProps> = ({
  sessionId,
  paymentCollection,
  paymentStatus,
  sessionStatus,
  onCancelled,
}) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Do not allow cancel if already in a terminal state
  if (["cancelled", "completed", "no_show"].includes(sessionStatus))
    return null;

  // Do not allow cancel of already-collected cash bookings (practitioner should refund out of band first)
  if (paymentCollection === "in_person" && paymentStatus === "completed")
    return null;

  const handleCancel = async () => {
    setLoading(true);
    try {
      const trimmedReason = reason.trim() || "Cancelled by practitioner";

      const { data: cancelPayload, error: rpcError } = await supabase.rpc(
        "cancel_client_session",
        {
          p_session_id: sessionId,
          p_reason: trimmedReason,
          p_cancelled_by: "practitioner",
        },
      );

      if (rpcError) throw rpcError;
      const parsed = cancelPayload as {
        success?: boolean;
        error_message?: string;
      } | null;
      if (!parsed?.success) {
        throw new Error(parsed?.error_message || "Could not cancel session");
      }

      // Best-effort email notification; do not block UI if it fails
      try {
        await supabase.functions.invoke("send-booking-notification", {
          body: {
            emailType: "cancellation",
            sessionId,
            cancellationReason: trimmedReason,
            rescheduledBy: "practitioner",
          },
        });
      } catch (notifyErr) {
        console.warn("Cancellation notification failed", notifyErr);
      }

      toast.success(
        paymentCollection === "in_person"
          ? "Session cancelled — no card was charged."
          : "Session cancelled.",
      );
      setShowConfirm(false);
      setReason("");
      onCancelled?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not cancel session",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!showConfirm) {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setShowConfirm(true)}
        className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <X className="h-4 w-4" />
        Cancel session
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 border border-red-200 bg-red-50 rounded-md">
      <div className="flex items-start gap-2 text-sm text-red-900">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>
          Cancel this session? The client will be notified by email.
          {paymentCollection === "in_person" && " No card was charged."}
        </span>
      </div>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        disabled={loading}
        maxLength={200}
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={handleCancel}
          disabled={loading}
        >
          {loading ? "Cancelling…" : "Confirm cancel"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setShowConfirm(false);
            setReason("");
          }}
          disabled={loading}
        >
          Keep session
        </Button>
      </div>
    </div>
  );
};

export default CancelSessionButton;
