import { useState } from "react";
import { Lightbulb, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const BEST_PRACTICES = [
  "Consider your experience level when setting prices.",
  "Research local market rates using the Market Analysis above.",
  "Factor in your costs (travel, materials, time) for mobile or clinic.",
  "Test different price points and review bookings to find your sweet spot.",
];

interface PricingTipsProps {
  /** Optional profile for contextual tips (e.g. experience_years). */
  experienceYears?: number | null;
  className?: string;
}

/**
 * Pricing tips and best practices for practitioners (KAN-73).
 * Accessible with clear headings and screen-reader friendly content.
 */
export function PricingTips({ experienceYears, className }: PricingTipsProps) {
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  const contextualTip =
    experienceYears != null && experienceYears >= 5
      ? "With 5+ years of experience, you can consider positioning at or slightly above market average."
      : experienceYears != null && experienceYears < 2
        ? "As you build experience and reviews, you can gradually increase prices."
        : null;

  return (
    <div className={className} role="region" aria-labelledby="pricing-tips-heading">
      <h4 id="pricing-tips-heading" className="font-medium text-sm flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4 text-muted-foreground" aria-hidden />
        Pricing Tips
      </h4>
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          {BEST_PRACTICES.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
        {contextualTip && (
          <p className="text-sm text-primary font-medium border-t pt-2 mt-2">
            {contextualTip}
          </p>
        )}
        <Dialog open={learnMoreOpen} onOpenChange={setLearnMoreOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-primary font-medium text-sm"
              aria-expanded={learnMoreOpen}
              aria-controls="pricing-guide-dialog"
            >
              Learn more about pricing
              <ExternalLink className="h-3.5 w-3.5 ml-1 inline-block" aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent
            id="pricing-guide-dialog"
            className="max-w-lg max-h-[85vh] overflow-y-auto"
            aria-describedby="pricing-guide-description"
          >
            <DialogHeader>
              <DialogTitle>Pricing guide</DialogTitle>
              <DialogDescription id="pricing-guide-description">
                Tips and strategies to set prices that work for you and your clients.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <section>
                <h5 className="font-semibold mb-2">Successful pricing strategies</h5>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Start near market average and adjust based on demand and feedback.</li>
                  <li>Bundle sessions (e.g. 5-pack) at a small discount to encourage commitment.</li>
                  <li>Differentiate clinic vs mobile pricing if your costs differ.</li>
                  <li>Review your prices every 6–12 months and after gaining more experience.</li>
                </ul>
              </section>
              <section>
                <h5 className="font-semibold mb-2">Common pricing mistakes to avoid</h5>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Setting prices too low and burning out or resenting the work.</li>
                  <li>Ignoring local competition and market rates.</li>
                  <li>Not accounting for travel time, materials, or cancellation risk.</li>
                  <li>Changing prices too often, which can confuse or frustrate returning clients.</li>
                </ul>
              </section>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
