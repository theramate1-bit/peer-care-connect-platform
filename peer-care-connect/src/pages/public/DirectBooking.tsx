import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BookingFlow } from '@/components/marketplace/BookingFlow';
import { GuestBookingFlow } from '@/components/marketplace/GuestBookingFlow';
import { MobileBookingRequestFlow } from '@/components/marketplace/MobileBookingRequestFlow';
import { PractitionerMatchExplanation } from '@/components/marketplace/PractitionerMatchExplanation';
import { HybridBookingChooser } from '@/components/booking/HybridBookingChooser';
import { canBookClinic, canRequestMobile } from '@/lib/booking-flow-type';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PractitionerProduct {
  id: string;
  name: string;
  description?: string;
  price_amount: number;
  currency: string;
  duration_minutes: number;
  service_type?: 'clinic' | 'mobile' | 'both';
  is_active: boolean;
  stripe_price_id?: string;
}

interface Practitioner {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  location: string;
  hourly_rate: number;
  specializations: string[];
  bio: string;
  experience_years: number;
  user_role: string;
  average_rating: number;
  total_sessions: number;
  profile_photo_url?: string;
  is_active: boolean;
  profile_completed: boolean;
  therapist_type?: 'clinic_based' | 'mobile' | 'hybrid' | null;
  base_latitude?: number | null;
  base_longitude?: number | null;
  mobile_service_radius_km?: number | null;
  stripe_connect_account_id?: string | null;
  clinic_latitude?: number | null;
  clinic_longitude?: number | null;
  products?: PractitionerProduct[];
}

const DirectBooking = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(true);
  const [flowType, setFlowType] = useState<'clinic' | 'mobile' | null>(null);

  useEffect(() => {
    if (slug) {
      fetchPractitionerBySlug(slug);
    } else {
      setError('Invalid booking link');
      setLoading(false);
    }
  }, [slug]);

  const fetchPractitionerBySlug = async (bookingSlug: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch practitioner by booking_slug
      // Note: user_role can be 'sports_therapist', 'massage_therapist', or 'osteopath'
      const { data, error: fetchError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          location,
          hourly_rate,
          specializations,
          bio,
          experience_years,
          user_role,
          profile_photo_url,
          is_active,
          profile_completed,
          booking_slug,
          therapist_type,
          base_latitude,
          base_longitude,
          mobile_service_radius_km,
          stripe_connect_account_id,
          clinic_latitude,
          clinic_longitude
        `)
        .eq('booking_slug', bookingSlug)
        .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
        .single();

      if (fetchError) {
        // Try alternative: check if slug matches user_role patterns
        if (fetchError.code === 'PGRST116') {
          setError('Practitioner not found. This booking link may be invalid.');
        } else {
          throw fetchError;
        }
        return;
      }

      if (!data) {
        setError('Practitioner not found');
        return;
      }

      if (!data.is_active) {
        setError('This practitioner is not currently accepting bookings.');
        return;
      }

      if (!data.profile_completed) {
        setError('This practitioner profile is not yet complete.');
        return;
      }

      // Fetch average rating and total sessions
      const { data: reviews } = await supabase
        .from('reviews')
        .select('overall_rating')
        .eq('therapist_id', data.id)
        .eq('review_status', 'published');

      const averageRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / reviews.length
        : 0;

      const { count: totalSessions } = await supabase
        .from('client_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('therapist_id', data.id)
        .in('status', ['scheduled', 'confirmed', 'completed']);

      const { data: productsData } = await supabase
        .from('practitioner_products')
        .select('id, name, description, price_amount, currency, duration_minutes, service_type, is_active, stripe_price_id')
        .eq('practitioner_id', data.id)
        .eq('is_active', true);

      const products = (productsData ?? []) as PractitionerProduct[];

      // Transform to match Practitioner interface
      setPractitioner({
        id: data.id,
        user_id: data.id,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        location: data.location || '',
        hourly_rate: data.hourly_rate || 0,
        specializations: data.specializations || [],
        bio: data.bio || '',
        experience_years: data.experience_years || 0,
        user_role: data.user_role || 'practitioner',
        average_rating: averageRating,
        total_sessions: totalSessions || 0,
        profile_photo_url: data.profile_photo_url,
        is_active: data.is_active,
        profile_completed: data.profile_completed,
        therapist_type: data.therapist_type ?? null,
        base_latitude: data.base_latitude ?? null,
        base_longitude: data.base_longitude ?? null,
        mobile_service_radius_km: data.mobile_service_radius_km ?? null,
        stripe_connect_account_id: data.stripe_connect_account_id ?? null,
        clinic_latitude: data.clinic_latitude ?? null,
        clinic_longitude: data.clinic_longitude ?? null,
        products,
      });

      const offerClinic = canBookClinic({ therapist_type: data.therapist_type, mobile_service_radius_km: data.mobile_service_radius_km, base_latitude: data.base_latitude, base_longitude: data.base_longitude, products });
      const offerMobile = canRequestMobile({ therapist_type: data.therapist_type, mobile_service_radius_km: data.mobile_service_radius_km, base_latitude: data.base_latitude, base_longitude: data.base_longitude, products });
      if (offerMobile && !offerClinic) {
        setFlowType('mobile');
        setBookingOpen(true);
      } else if (offerClinic && !offerMobile) {
        setFlowType('clinic');
        setBookingOpen(true);
      } else if (offerClinic && offerMobile) {
        // Hybrid therapist - show choice UI, don't auto-open booking
        setFlowType(null);
        setBookingOpen(false);
      } else {
        // No bookable clinic or mobile services
        setError('This practitioner is not currently accepting bookings. No active services are configured.');
        setPractitioner(null);
      }
    } catch (err) {
      console.error('Error fetching practitioner:', err);
      setError('Failed to load practitioner. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingClose = (open: boolean) => {
    setBookingOpen(open);
    if (!open) {
      // Redirect to marketplace when booking is closed
      navigate('/marketplace');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading booking form...</p>
        </div>
      </div>
    );
  }

  if (error || !practitioner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h1 className="text-2xl font-bold mb-4">Booking Unavailable</h1>
          <p className="text-muted-foreground mb-6">{error || 'Practitioner not found'}</p>
          <Button
            onClick={() => navigate('/marketplace')}
            className="px-4 py-2"
          >
            Browse Marketplace
          </Button>
        </div>
      </div>
    );
  }

  const offerClinic = canBookClinic(practitioner);
  const offerMobile = canRequestMobile(practitioner);
  const showChoice = offerClinic && offerMobile;

  return (
    <div className="min-h-screen bg-background">
      {/* Practitioner Match Explanation - Show why this practitioner was selected */}
      <div className="container mx-auto px-6 py-4 max-w-2xl space-y-4">
        <PractitionerMatchExplanation
          practitioner={practitioner}
          matchScore={85} // Default match score for direct links
        />
        {showChoice && !bookingOpen && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-2">Choose Booking Type</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This practitioner offers both clinic and mobile services. Please choose your preferred option.
            </p>
            <HybridBookingChooser
              onBookClinic={() => { setFlowType('clinic'); setBookingOpen(true); }}
              onRequestMobile={() => { setFlowType('mobile'); setBookingOpen(true); }}
              fullWidth={true}
              buttonSize="lg"
              practitionerName={`${practitioner.first_name} ${practitioner.last_name}`.trim()}
            />
          </Card>
        )}
      </div>

      {/* Clinic booking flow */}
      {flowType === 'clinic' && bookingOpen && (
        user ? (
          <BookingFlow
            open={bookingOpen}
            onOpenChange={handleBookingClose}
            practitioner={practitioner}
            onRedirectToMobile={() => setFlowType('mobile')}
          />
        ) : (
          <GuestBookingFlow
            open={bookingOpen}
            onOpenChange={handleBookingClose}
            practitioner={practitioner}
            onRedirectToMobile={() => setFlowType('mobile')}
          />
        )
      )}

      {/* Mobile request flow (address + practitioner accept) */}
      {flowType === 'mobile' && bookingOpen && (
        <MobileBookingRequestFlow
          open={bookingOpen}
          onOpenChange={handleBookingClose}
          practitioner={practitioner}
          clientLocation={null}
        />
      )}
    </div>
  );
};

export default DirectBooking;

