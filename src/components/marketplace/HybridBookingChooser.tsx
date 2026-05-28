import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, ArrowLeft } from "lucide-react";

type HybridBookingChooserProps = {
  practitionerName: string;
  onChooseClinic: () => void;
  onChooseMobile: () => void;
  onBack: () => void;
};

export function HybridBookingChooser({
  practitionerName,
  onChooseClinic,
  onChooseMobile,
  onBack,
}: HybridBookingChooserProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <Button variant="ghost" className="mb-4" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>How would you like to book?</CardTitle>
          <p className="text-sm text-muted-foreground">
            {practitionerName} offers clinic and mobile sessions.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 justify-start"
            onClick={onChooseClinic}
          >
            <Building2 className="h-5 w-5 mr-3 shrink-0" />
            <span className="text-left">
              <span className="font-semibold block">Book at clinic</span>
              <span className="text-sm text-muted-foreground font-normal">
                Choose a slot at their practice location
              </span>
            </span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 justify-start"
            onClick={onChooseMobile}
          >
            <MapPin className="h-5 w-5 mr-3 shrink-0" />
            <span className="text-left">
              <span className="font-semibold block">Request mobile visit</span>
              <span className="text-sm text-muted-foreground font-normal">
                They travel to your address — payment held until they accept
              </span>
            </span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
