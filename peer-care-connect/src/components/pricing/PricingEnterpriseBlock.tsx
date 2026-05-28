import { Link } from "react-router-dom";
import { ArrowRight, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface PricingEnterpriseBlockProps {
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function PricingEnterpriseBlock({ onSubmit, isSubmitting }: PricingEnterpriseBlockProps) {
  return (
    <div id="enterprise-pricing" className="scroll-mt-24">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-primary">
          <Building2 className="h-5 w-5" aria-hidden />
          <span className="text-sm font-semibold uppercase tracking-wide">Teams & clinics</span>
        </div>
        <h3 className="text-2xl font-bold tracking-tight text-foreground">Enterprise</h3>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Multi-seat pricing and onboarding — we&apos;ll send a tailored quote.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80 bg-card shadow-[var(--shadow-soft)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Custom quote</CardTitle>
            <CardDescription>Volume discounts & dedicated support.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="lg" asChild>
              <Link to="/contact">
                Talk to sales
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-[var(--shadow-soft)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Brief us</CardTitle>
            <CardDescription>We reply within one business day.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pe-firstName">First name *</Label>
                  <Input id="pe-firstName" name="firstName" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pe-lastName">Last name *</Label>
                  <Input id="pe-lastName" name="lastName" required />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pe-email">Work email *</Label>
                  <Input id="pe-email" name="email" type="email" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pe-phone">Phone</Label>
                  <Input id="pe-phone" name="phone" type="tel" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pe-company">Organisation *</Label>
                <Input id="pe-company" name="company" required />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pe-orgType">Type *</Label>
                  <select
                    id="pe-orgType"
                    name="organizationType"
                    required
                    className={selectClass}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    <option value="hospital">Hospital / health system</option>
                    <option value="clinic">Clinic</option>
                    <option value="spa">Spa / wellness</option>
                    <option value="sports">Sports medicine</option>
                    <option value="rehab">Rehab</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pe-team">Team size</Label>
                  <select id="pe-team" name="teamSize" className={selectClass} defaultValue="">
                    <option value="">Optional</option>
                    <option value="small">1–10</option>
                    <option value="medium">11–50</option>
                    <option value="large">51–200</option>
                    <option value="enterprise">200+</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pe-message">What do you need? *</Label>
                <Textarea id="pe-message" name="message" rows={3} required placeholder="e.g. seats, regions, integrations" />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
