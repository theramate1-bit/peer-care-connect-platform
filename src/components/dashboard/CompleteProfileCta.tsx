import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle, X } from "lucide-react";

interface CompleteProfileCtaProps {
  onClick: () => void;
  /** Optional completion percentage to show e.g. 17 for "17% complete" */
  completionPercent?: number;
  /** Called when the user dismisses the card */
  onDismiss?: () => void;
}

/**
 * Call-to-action for practitioners to complete their profile.
 * Card style with progress bar matching the reference dashboard design.
 */
export const CompleteProfileCta = ({ onClick, completionPercent, onDismiss }: CompleteProfileCtaProps) => {
  const percent = completionPercent != null ? Math.min(100, Math.max(0, completionPercent)) : 0;

  return (
    <Card className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <CardContent className="p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="mt-0.5 p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <UserCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                  Complete Your Profile
                </h3>
                {percent < 100 && (
                  <span className="text-xs font-medium text-primary">
                    {percent}% complete
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Activate your profile to start accepting bookings and gain visibility.
              </p>
            </div>
          </div>
          <Button
            onClick={onClick}
            variant="outline"
            size="sm"
            className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-medium shrink-0"
          >
            Complete Profile
          </Button>
        </div>
        {onDismiss && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="min-h-[44px] min-w-[44px] p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
