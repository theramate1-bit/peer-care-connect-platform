import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Star } from "lucide-react";
import { toast } from "sonner";

import BookingFlow from "@/components/booking/BookingFlow";
import { MobileBookingRequestFlow } from "@/components/marketplace/MobileBookingRequestFlow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canBookClinic, canRequestMobile } from "@/lib/booking-flow-type";
import {
  fetchMarketplacePractitionerById,
  type MarketplacePractitioner,
} from "@/lib/marketplacePractitioners";

/**
 * Public practitioner profile + booking entry (guest-friendly).
 * Parity with app public therapist surfaces and `HybridBookingChooser` on web.
 */
const PublicTherapistProfile: React.FC = () => {
  const { therapistId } = useParams<{ therapistId: string }>();
  const [practitioner, setPractitioner] =
    useState<MarketplacePractitioner | null>(null);
  const [loading, setLoading] = useState(true);
  const [flowMode, setFlowMode] = useState<"clinic" | "mobile" | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!therapistId) {
        setLoading(false);
        return;
      }
      const { data, error } =
        await fetchMarketplacePractitionerById(therapistId);
      if (!mounted) return;
      if (error) {
        toast.error("Failed to load practitioner profile");
        setPractitioner(null);
      } else {
        setPractitioner(data);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [therapistId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        Loading profile…
      </div>
    );
  }

  if (!practitioner) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">
              This practitioner profile is not available.
            </p>
            <Button asChild>
              <Link to="/marketplace">Browse practitioners</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const practitionerName = `${practitioner.first_name} ${practitioner.last_name}`;
  const clinicOk = canBookClinic(practitioner);
  const mobileOk = canRequestMobile(practitioner);

  if (!clinicOk && !mobileOk) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Button variant="ghost" className="mb-4" asChild>
          <Link to="/marketplace">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to marketplace
          </Link>
        </Button>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Online booking is not available for this practitioner yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (flowMode === "mobile" && mobileOk) {
    return (
      <MobileBookingRequestFlow
        embedded
        practitioner={{
          id: practitioner.id,
          first_name: practitioner.first_name,
          last_name: practitioner.last_name,
          therapist_type: practitioner.therapist_type,
          mobile_service_radius_km: practitioner.mobile_service_radius_km,
          base_latitude: practitioner.base_latitude,
          base_longitude: practitioner.base_longitude,
          products: practitioner.products,
        }}
        guestMode
        onCancel={() => setFlowMode(null)}
      />
    );
  }

  if (effectiveMode === "clinic" && clinicOk) {
    return (
      <BookingFlow
        practitionerId={practitioner.id}
        practitionerName={practitionerName}
        practitionerType={
          practitioner.user_role as
            | "sports_therapist"
            | "massage_therapist"
            | "osteopath"
        }
        acceptInPersonPayment={practitioner.accept_in_person_payment}
        guestMode
        onBookingComplete={() => {
          toast.success("Booking created successfully!");
          setFlowMode(null);
        }}
        onCancel={() => setFlowMode(null)}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Button variant="ghost" className="mb-4" asChild>
        <Link to="/marketplace">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Link>
      </Button>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">{practitionerName}</CardTitle>
          {practitioner.location ? (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {practitioner.location}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {practitioner.verified ? (
            <Badge variant="secondary">Verified</Badge>
          ) : null}
          {practitioner.total_reviews > 0 ? (
            <p className="text-sm flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {practitioner.average_rating} ({practitioner.total_reviews}{" "}
              reviews)
            </p>
          ) : null}
          {practitioner.bio ? (
            <p className="text-sm text-muted-foreground">{practitioner.bio}</p>
          ) : null}
          {clinicOk && mobileOk ? (
            <>
              <Button className="w-full" onClick={() => setFlowMode("clinic")}>
                Book at clinic
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setFlowMode("mobile")}
              >
                Request mobile visit
              </Button>
            </>
          ) : clinicOk ? (
            <Button className="w-full" onClick={() => setFlowMode("clinic")}>
              Book at clinic
            </Button>
          ) : mobileOk ? (
            <Button className="w-full" onClick={() => setFlowMode("mobile")}>
              Request mobile visit
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicTherapistProfile;
