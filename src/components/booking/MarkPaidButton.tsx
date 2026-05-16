import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface MarkPaidButtonProps {
  sessionId: string;
  paymentCollection: string;
  paymentStatus: string;
  onMarkedPaid?: () => void;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "external_terminal", label: "Card Terminal" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

const MarkPaidButton: React.FC<MarkPaidButtonProps> = ({
  sessionId,
  paymentCollection,
  paymentStatus,
  onMarkedPaid,
}) => {
  const [method, setMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  if (paymentCollection !== "in_person") return null;
  if (paymentStatus === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
        <Check className="h-4 w-4" /> Paid
      </span>
    );
  }

  const handleMarkPaid = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        "mark_session_paid_in_person",
        {
          p_session_id: sessionId,
          p_method: method,
        },
      );
      if (error) throw error;
      const result = data as { success?: boolean; error?: string };
      if (!result?.success)
        throw new Error(result?.error || "Failed to mark as paid");
      toast.success("Session marked as paid");
      setShowPicker(false);
      onMarkedPaid?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not mark session as paid",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!showPicker) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowPicker(true)}
        className="gap-1"
      >
        <Banknote className="h-4 w-4" />
        Record clinic payment
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={method} onValueChange={setMethod}>
        <SelectTrigger className="w-36 h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_METHODS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={handleMarkPaid} disabled={loading}>
        {loading ? "Saving..." : "Save payment"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setShowPicker(false)}
        disabled={loading}
      >
        Cancel
      </Button>
    </div>
  );
};

export default MarkPaidButton;
