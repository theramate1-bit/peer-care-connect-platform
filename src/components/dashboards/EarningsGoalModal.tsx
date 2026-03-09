import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EarningsGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGoal: number | null | undefined;
  onSave: (amountPounds: number) => Promise<void>;
}

export function EarningsGoalModal({
  open,
  onOpenChange,
  currentGoal,
  onSave,
}: EarningsGoalModalProps) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(currentGoal != null && currentGoal > 0 ? String(currentGoal) : "");
      setError(null);
    }
  }, [open, currentGoal]);

  const handleSave = async () => {
    const num = Math.round(parseFloat(value));
    if (Number.isNaN(num) || num < 0) {
      setError("Please enter a valid amount (e.g. 2000)");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(num);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save goal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set monthly earnings goal</DialogTitle>
          <DialogDescription>
            Set a target for how much you want to earn this month. We&apos;ll show your progress on the dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="goal-amount">Goal amount (£/month)</Label>
            <Input
              id="goal-amount"
              type="number"
              min={0}
              step={100}
              placeholder="e.g. 2000"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-describedby="goal-amount-error"
            />
            {error && (
              <p id="goal-amount-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
