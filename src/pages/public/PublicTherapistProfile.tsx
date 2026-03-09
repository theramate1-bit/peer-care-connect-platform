import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HeaderClean } from "@/components/landing/HeaderClean";
import { FooterClean } from "@/components/FooterClean";
import { MessageSquare, Star } from "lucide-react";
import { ReviewSystem } from "@/lib/review-system";
import { PublicPractitionerProfileContent } from "@/components/profiles/PublicPractitionerProfileContent";
import { BookingFlow } from "@/components/marketplace/BookingFlow";
import { GuestBookingFlow } from "@/components/marketplace/GuestBookingFlow";
import { MobileBookingRequestFlow } from "@/components/marketplace/MobileBookingRequestFlow";
import { HybridBookingChooser } from "@/components/booking/HybridBookingChooser";
import {
  PublicPractitionerProfile,
  fetchPublicPractitionerProfile,
} from "@/lib/public-practitioner-profile";
import { canBookClinic, canRequestMobile } from "@/lib/booking-flow-type";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ReviewDisplay {
  id: string;
  overall_rating: number;
  comment: string | null;
  title: string | null;
  is_anonymous: boolean;
  created_at: string;
  client_name: string;
}

const PublicTherapistProfile = () => {
  const { user } = useAuth();
  const { therapistId } = useParams<{ therapistId: string }>();
  const [therapist, setTherapist] = useState<PublicPractitionerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [showMobileRequestFlow, setShowMobileRequestFlow] = useState(false);
  const [showHybridChoice, setShowHybridChoice] = useState(false);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [allReviews, setAllReviews] = useState<ReviewDisplay[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (!therapistId) return;
    (async () => {
      try {
        setLoading(true);
        const profile = await fetchPublicPractitionerProfile(therapistId);
        setTherapist(profile);
      } catch (error) {
        console.error("Error fetching therapist:", error);
        setTherapist(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [therapistId]);

  useEffect(() => {
    if (!therapistId) return;
    (async () => {
      setReviewsLoading(true);
      try {
        const stats = await ReviewSystem.getPractitionerStats(therapistId);
        setAverageRating(stats.averageRating);
        setTotalReviews(stats.totalReviews);

        const { data, error } = await supabase
          .from("reviews")
          .select(`
            id,
            overall_rating,
            comment,
            title,
            is_anonymous,
            created_at,
            client:users!reviews_client_id_fkey(first_name, last_name)
          `)
          .eq("therapist_id", therapistId)
          .in("review_status", ["approved", "published"])
          .order("created_at", { ascending: false });

        if (error) throw error;
        type ReviewRow = {
          id: string;
          overall_rating: number | null;
          comment: string | null;
          title: string | null;
          is_anonymous: boolean | null;
          created_at: string;
          client?: { first_name?: string | null; last_name?: string | null } | null;
        };

        const list = ((data || []) as ReviewRow[]).map((r) => ({
          id: r.id,
          overall_rating: r.overall_rating ?? 0,
          comment: r.comment ?? null,
          title: r.title ?? null,
          is_anonymous: r.is_anonymous ?? false,
          created_at: r.created_at,
          client_name: r.is_anonymous ? "Anonymous" : [r.client?.first_name, r.client?.last_name].filter(Boolean).join(" ") || "Client",
        }));
        setAllReviews(list);
      } catch (e) {
        console.error("Error fetching reviews:", e);
      } finally {
        setReviewsLoading(false);
      }
    })();
  }, [therapistId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <HeaderClean />
        <main id="main-content" className="container mx-auto p-6 mt-16">
          <div className="max-w-5xl mx-auto space-y-6">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
        <FooterClean />
      </div>
    );
  }

  if (!therapist) {
    return (
      <div className="min-h-screen bg-background">
        <HeaderClean />
        <main id="main-content" className="container mx-auto px-6 py-12 mt-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Therapist Not Found</h1>
          <p className="text-muted-foreground mb-6">The therapist profile you are looking for does not exist or has been removed.</p>
          <Link to="/marketplace">
            <Button>Back to Explore</Button>
          </Link>
        </main>
        <FooterClean />
      </div>
    );
  }

  const practitionerForFlows = {
    id: therapist.id,
    user_id: therapist.id,
    first_name: therapist.first_name,
    last_name: therapist.last_name,
    user_role: therapist.user_role || 'practitioner',
    location: therapist.location || '',
    hourly_rate: 0,
    specializations: therapist.specializations || [],
    bio: therapist.bio || '',
    experience_years: therapist.experience_years || 0,
    therapist_type: therapist.therapist_type ?? null,
    base_latitude: therapist.base_latitude ?? null,
    base_longitude: therapist.base_longitude ?? null,
    mobile_service_radius_km: therapist.mobile_service_radius_km ?? null,
    products: (therapist.products || []).map((p) => ({
      ...p,
      currency: 'gbp',
      stripe_price_id: '',
      is_active: p.is_active,
    })),
  };
  const offerClinic = canBookClinic(practitionerForFlows);
  const offerMobile = canRequestMobile(practitionerForFlows);

  const handleStartBooking = () => {
    if (offerClinic && offerMobile) {
      setShowHybridChoice(true);
      return;
    }
    if (offerClinic) {
      setShowMobileRequestFlow(false);
      setShowBookingFlow(true);
      return;
    }
    if (offerMobile) {
      setShowBookingFlow(false);
      setShowMobileRequestFlow(true);
      return;
    }

    toast.error("Booking is not available for this practitioner.", {
      description: "No active clinic or mobile services are configured yet.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <HeaderClean />
      <main id="main-content" className="container mx-auto px-6 py-12 mt-16">
        <div className="max-w-5xl mx-auto">
          <Link to="/marketplace" className="inline-flex items-center text-sm mb-6 hover:underline">
            ← Back to Explore
          </Link>

          <Card>
            <CardContent className="p-6">
              <PublicPractitionerProfileContent
                profile={therapist}
                onBook={handleStartBooking}
              />
            </CardContent>
          </Card>

          {showHybridChoice && (
            <Card className="mt-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-2">Choose Booking Type</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  This practitioner offers both clinic and mobile services. Choose your preferred booking option.
                </p>
                <HybridBookingChooser
                  onBookClinic={() => {
                    setShowHybridChoice(false);
                    setShowMobileRequestFlow(false);
                    setShowBookingFlow(true);
                  }}
                  onRequestMobile={() => {
                    setShowHybridChoice(false);
                    setShowBookingFlow(false);
                    setShowMobileRequestFlow(true);
                  }}
                  buttonSize="lg"
                  fullWidth={true}
                  practitionerName={`${therapist.first_name} ${therapist.last_name}`.trim()}
                />
              </CardContent>
            </Card>
          )}

          <Card className="mt-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Reviews</h2>
              <div
                className="flex items-center gap-2 mb-4"
                role="group"
                aria-label={
                  totalReviews > 0
                    ? `Rating ${averageRating.toFixed(1)} out of 5, ${totalReviews} ${totalReviews === 1 ? "review" : "reviews"}`
                    : "No reviews yet"
                }
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 shrink-0 ${
                      i <= Math.floor(averageRating) ? "fill-amber-500 text-amber-500" : "fill-gray-200 text-gray-200"
                    }`}
                    aria-hidden
                  />
                ))}
                {totalReviews > 0 ? (
                  <span className="text-sm text-muted-foreground">
                    {averageRating.toFixed(1)} ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">No reviews yet</span>
                )}
              </div>

              {reviewsLoading ? (
                <p className="text-sm text-muted-foreground">Loading reviews...</p>
              ) : allReviews.length === 0 ? (
                <div className="text-center py-8" role="status" aria-live="polite">
                  <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No reviews yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allReviews.map((r) => (
                    <div key={r.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex gap-0.5" aria-hidden>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i <= r.overall_rating ? "fill-amber-500 text-amber-500" : "fill-gray-200 text-gray-200"}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">{r.client_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      </div>
                      {r.title && <p className="font-medium text-sm mb-0.5">{r.title}</p>}
                      {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {showBookingFlow && (
        user ? (
          <BookingFlow
            open={showBookingFlow}
            onOpenChange={setShowBookingFlow}
            practitioner={practitionerForFlows}
            onRedirectToMobile={() => {
              setShowBookingFlow(false);
              setShowMobileRequestFlow(true);
            }}
          />
        ) : (
          <GuestBookingFlow
            open={showBookingFlow}
            onOpenChange={setShowBookingFlow}
            practitioner={practitionerForFlows}
            onRedirectToMobile={() => {
              setShowBookingFlow(false);
              setShowMobileRequestFlow(true);
            }}
          />
        )
      )}
      {showMobileRequestFlow && (
        <MobileBookingRequestFlow
          open={showMobileRequestFlow}
          onOpenChange={setShowMobileRequestFlow}
          practitioner={practitionerForFlows}
          clientLocation={null}
        />
      )}
      <FooterClean />
    </div>
  );
};

export default PublicTherapistProfile;
