import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  MapPin,
  Star,
  Clock,
  User as UserIcon,
  Filter,
  MessageSquare,
  Calendar,
  Sparkles,
  ExternalLink,
  PoundSterling,
  Building,
  Car,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MessagingManager } from '@/lib/messaging';
import { BookingFlow } from '@/components/marketplace/BookingFlow';
import { GuestBookingFlow } from '@/components/marketplace/GuestBookingFlow';
import { MobileBookingRequestFlow } from '@/components/marketplace/MobileBookingRequestFlow';
import { HybridBookingChooser } from '@/components/booking/HybridBookingChooser';
import { SmartSearch } from '@/components/marketplace/SmartSearch';
import { PublicProfileModal } from '@/components/profiles/PublicProfileModal';
import { ReviewsModal, type ReviewsModalPractitioner } from '@/components/marketplace/ReviewsModal';
import { NextAvailableSlot } from '@/components/marketplace/NextAvailableSlot';
import { Analytics } from '@/lib/analytics';
import { getServiceLabel } from '@/lib/service-defaults';
import { canBookClinic, canRequestMobile } from '@/lib/booking-flow-type';
import { GeoSearchService, PractitionerWithDistance } from '@/lib/geo-search-service';
import { LocationManager } from '@/lib/location';
import { getBestLocationImageUrl } from '@/lib/location-images';
import { MobileServiceAreaBlock } from '@/components/marketplace/MobileServiceAreaBlock';
import { HeaderClean } from '@/components/landing/HeaderClean';
import { FooterClean } from '@/components/FooterClean';
import { Skeleton } from '@/components/ui/skeleton';
import { PractitionerGridSkeleton } from '@/components/ui/skeleton-loaders';
import { EmptyPractitioners } from '@/components/ui/empty-state';
import { getPublicLocationDisplay } from '@/lib/public-practitioner-profile';

interface Practitioner {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  location: string;
  clinic_address?: string;
  address_city?: string;
  clinic_latitude?: number;
  clinic_longitude?: number;
  base_address?: string;
  base_latitude?: number;
  base_longitude?: number;
  therapist_type?: 'clinic_based' | 'mobile' | 'hybrid';
  mobile_service_radius_km?: number;
  service_radius_used?: 'clinic' | 'base';
  clinic_image_url?: string | null;
  specializations: string[];
  bio: string;
  experience_years: number;
  user_role: string;
  profile_photo_url?: string | null;
  average_rating?: number;
  total_sessions?: number;
  total_reviews?: number;
  professional_statement?: string;
  treatment_philosophy?: string;
  services_offered?: string[];
  distance_km?: number;
  has_liability_insurance?: boolean;
  products?: Array<{
    id: string;
    name: string;
    description: string;
    price_amount: number;
    currency: string;
    duration_minutes: number;
    stripe_price_id: string;
    is_active: boolean;
    category?: string;
    service_type?: 'clinic' | 'mobile' | 'both' | null;
  }>;
}

const Marketplace = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userProfile } = useAuth();
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [filteredPractitioners, setFilteredPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [showMobileRequestFlow, setShowMobileRequestFlow] = useState(false);
  const modalOpenRef = useRef(false);
  modalOpenRef.current = showBookingFlow || showMobileRequestFlow;
  const [searchMode, setSearchMode] = useState<'traditional' | 'smart'>('traditional');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [reviewsModalPractitioner, setReviewsModalPractitioner] = useState<ReviewsModalPractitioner | null>(null);

  // Refetch practitioner when opening booking modal (stale data edge case)
  const refetchPractitioner = useCallback(async (practitionerId: string): Promise<Practitioner | null> => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        location,
        clinic_address,
        address_city,
        clinic_latitude,
        clinic_longitude,
        therapist_type,
        base_address,
        base_latitude,
        base_longitude,
        mobile_service_radius_km,
        clinic_image_url,
        specializations,
        services_offered,
        bio,
        experience_years,
        user_role,
        profile_photo_url,
        has_liability_insurance,
        products:practitioner_products(*)
      `)
      .eq('id', practitionerId)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    const p = { ...data, user_id: data.id } as Practitioner;
    // Preserve ratings from current list if present
    const existing = practitioners.find((x) => x.id === practitionerId || x.user_id === practitionerId);
    if (existing) {
      p.average_rating = existing.average_rating;
      p.total_reviews = existing.total_reviews;
      p.total_sessions = existing.total_sessions;
    }
    return p;
  }, [practitioners]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');
  const [distanceKm, setDistanceKm] = useState<string>('all');
  const [availability, setAvailability] = useState<string>('any');
  const [serviceOffered, setServiceOffered] = useState<string>('all');
  const [liabilityInsured, setLiabilityInsured] = useState<string>('all');
  const [selectedPractitionerType, setSelectedPractitionerType] = useState<'all' | 'clinic_based' | 'mobile' | 'hybrid'>('all');
  const [geoSearchLocation, setGeoSearchLocation] = useState<{ lat: number; lon: number; address?: string } | null>(null);
  const [geoSearchActive, setGeoSearchActive] = useState(false);
  const [loadingGeoSearch, setLoadingGeoSearch] = useState(false);

  // Service filters
  const [serviceFilters, setServiceFilters] = useState({
    category: 'all',
    priceMin: 0,
    priceMax: 200,
    durationMin: 15,
    durationMax: 180,
  });

  // Refetch practitioner when booking modal opens (eligibility may have changed)
  useEffect(() => {
    if (!selectedPractitioner || (!showBookingFlow && !showMobileRequestFlow)) return;
    const id = selectedPractitioner.id || selectedPractitioner.user_id;
    refetchPractitioner(id).then((fresh) => {
      if (fresh) setSelectedPractitioner(fresh);
    });
  }, [showBookingFlow, showMobileRequestFlow, selectedPractitioner?.id, refetchPractitioner]);

  // Read URL parameters on mount
  useEffect(() => {
    const roleParam = searchParams.get('role') || searchParams.get('specialty'); // Support both 'role' and legacy 'specialty'
    const searchParam = searchParams.get('search');
    
    if (roleParam) {
      // Map legacy specialty values to user_role values
      const roleMap: Record<string, string> = {
        'osteopath': 'osteopath',
        'sports_massage': 'massage_therapist',
        'sports_therapist': 'sports_therapist',
        'massage_therapist': 'massage_therapist',
      };
      
      const mappedRole = roleMap[roleParam] || roleParam;
      if (['osteopath', 'sports_therapist', 'massage_therapist'].includes(mappedRole)) {
        setSelectedRole(mappedRole);
      }
    }
    
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, [searchParams]);

  // Handle mobile checkout return URL params.
  // Canonical success finalization lives on /mobile-booking/success.
  useEffect(() => {
    const mobileSuccess = searchParams.get('mobile_checkout_success');
    const mobileCanceled = searchParams.get('mobile_checkout_canceled');
    const requestId = searchParams.get('mobile_request_id');
    const checkoutSessionId = searchParams.get('mobile_checkout_session_id');

    if (mobileCanceled && requestId) {
      toast.warning('Mobile request payment was canceled. No request has been sent to the practitioner yet.');
      const url = new URL(window.location.href);
      url.searchParams.delete('mobile_checkout_canceled');
      url.searchParams.delete('mobile_request_id');
      window.history.replaceState({}, '', url.toString());
      return;
    }

    if (!mobileSuccess || !requestId || !checkoutSessionId) return;

    navigate(
      `/mobile-booking/success?mobile_checkout_success=1&mobile_request_id=${encodeURIComponent(
        requestId
      )}&mobile_checkout_session_id=${encodeURIComponent(checkoutSessionId)}`,
      { replace: true }
    );
  }, [searchParams, navigate]);

  useEffect(() => {
    loadPractitioners();

    // Refetch when user returns to tab (practitioner may have updated profile)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Don't unmount modal by refetching when user is mid-booking
        if (modalOpenRef.current) return;
        loadPractitioners(true); // Silent refetch - no loading state, preserves form
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Subscribe to new products being added
    const productsSubscription = supabase
      .channel('marketplace-products')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'practitioner_products',
          filter: 'is_active=eq.true',
        },
        (payload) => {
          toast.success('New service available!');
          loadPractitioners(); // Refresh
        }
      )
      .subscribe();

    // Subscribe to public review changes for real-time marketplace rating updates.
    const reviewsSubscription = supabase
      .channel('marketplace-reviews')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews',
          filter: 'review_status=in.(approved,published)',
        },
        () => {
          loadPractitioners();
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      productsSubscription.unsubscribe();
      reviewsSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (geoSearchActive && geoSearchLocation) {
      performGeoSearch();
    } else {
      filterAndSortPractitioners();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practitioners, searchTerm, selectedRole, selectedLocation, selectedPractitionerType, priceRange, sortBy, distanceKm, availability, serviceOffered, liabilityInsured, geoSearchActive, geoSearchLocation]);

  const performGeoSearch = async () => {
    if (!geoSearchLocation) return;

    try {
      setLoadingGeoSearch(true);
      const radius = distanceKm === 'all' ? 25 : parseInt(distanceKm);

      const results = await GeoSearchService.findPractitionersNearby(
        geoSearchLocation.lat,
        geoSearchLocation.lon,
        radius,
        {
          radiusKm: radius,
          serviceType: serviceOffered !== 'all' ? serviceOffered : undefined,
          minPrice: priceRange !== 'all' ? parseInt(priceRange.split('-')[0]) : undefined,
          maxPrice: priceRange !== 'all' && priceRange.includes('-') ? parseInt(priceRange.split('-')[1]) : undefined,
          role: selectedRole !== 'all' ? selectedRole : undefined
        }
      );

      // Merge with existing practitioner data (ratings, products, etc.)
      const enrichedResults = await Promise.all(
        results.map(async (p) => {
          // Canonical public rating source: reviews table only.
          const { data: reviews } = await supabase
            .from('reviews')
            .select('overall_rating')
            .eq('therapist_id', p.user_id)
            .in('review_status', ['approved', 'published']);

          const { data: sessions } = await supabase
            .from('client_sessions')
            .select('id')
            .eq('therapist_id', p.user_id)
            .eq('status', 'completed');

          const { data: products } = await supabase
            .from('practitioner_products')
            .select('*')
            .eq('practitioner_id', p.user_id)
            .eq('is_active', true);

          // Get user data required for listing (excluding aggregate rating fields).
          const { data: userData } = await supabase
            .from('users')
            .select('has_liability_insurance, clinic_image_url')
            .eq('id', p.user_id)
            .single();

          const allRatings = (reviews || []).map(r => r.overall_rating).filter((r): r is number => typeof r === 'number');
          const averageRating = allRatings.length
            ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
            : 0;

          return {
            ...p,
            average_rating: averageRating,
            total_reviews: allRatings.length,
            total_sessions: sessions?.length || 0,
            products: products || [],
            has_liability_insurance: userData?.has_liability_insurance || false,
            clinic_image_url: userData?.clinic_image_url || null
          };
        })
      );

      // Strict eligibility first, then apply UI filters
      let filteredResults = enrichedResults.filter(isPractitionerEligibleForMarketplace);
      if (liabilityInsured === 'insured') {
        filteredResults = filteredResults.filter(p => p.has_liability_insurance === true);
      }
      if (selectedPractitionerType !== 'all') {
        filteredResults = filteredResults.filter(p => p.therapist_type === selectedPractitionerType);
      }

      setFilteredPractitioners(filteredResults);
    } catch (error) {
      console.error('Error performing geo-search:', error);
      toast.error('Failed to search by location');
      setGeoSearchActive(false);
      filterAndSortPractitioners();
    } finally {
      setLoadingGeoSearch(false);
    }
  };

  const handleLocationSearch = async (locationInput: string) => {
    if (!locationInput.trim()) {
      setGeoSearchActive(false);
      setGeoSearchLocation(null);
      filterAndSortPractitioners();
      return;
    }

    try {
      setLoadingGeoSearch(true);
      // Use geocoding to get coordinates
      const geocodeResult = await LocationManager.geocodeAddress(
        locationInput,
        '', // city - not needed for general search
        '', // state - not needed
        'United Kingdom' // default country
      );

      if (geocodeResult && geocodeResult.latitude && geocodeResult.longitude) {
        setGeoSearchLocation({
          lat: geocodeResult.latitude,
          lon: geocodeResult.longitude,
          address: locationInput
        });
        setGeoSearchActive(true);
      } else {
        toast.error('Could not find location. Please try a different address.');
        setGeoSearchActive(false);
        setGeoSearchLocation(null);
      }
    } catch (error) {
      console.error('Error geocoding location:', error);
      toast.error('Failed to process location');
      setGeoSearchActive(false);
      setGeoSearchLocation(null);
    } finally {
      setLoadingGeoSearch(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLoadingGeoSearch(true);
      const location = await LocationManager.getCurrentLocation();

      if (location) {
        setGeoSearchLocation({
          lat: location.latitude,
          lon: location.longitude
        });
        setGeoSearchActive(true);
      } else {
        toast.error('Unable to get your current location');
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      toast.error('Failed to get current location');
    } finally {
      setLoadingGeoSearch(false);
    }
  };

  // Helper function to generate Google Maps URL
  const getGoogleMapsUrl = (address: string, lat?: number, lon?: number): string => {
    if (lat && lon) {
      return `https://www.google.com/maps?q=${lat},${lon}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  /** Location display for cards: clinic = exact address; mobile = area/city + radius (KAN-190). */
  const getLocationDisplay = (p: Practitioner): { text: string; link?: string } => {
    const display = getPublicLocationDisplay({
      therapist_type: p.therapist_type ?? null,
      clinic_address: p.clinic_address ?? null,
      address_city: p.address_city ?? null,
      location: p.location ?? null,
      base_address: p.base_address ?? null,
      mobile_service_radius_km: p.mobile_service_radius_km ?? null,
    });

    const text = display.summary || 'Location not specified';
    return {
      text,
      link: display.mapAddress ? getGoogleMapsUrl(display.mapAddress, p.clinic_latitude, p.clinic_longitude) : undefined,
    };
  };

  const isValidTherapistType = (
    type: Practitioner['therapist_type']
  ): type is 'clinic_based' | 'mobile' | 'hybrid' => (
    type === 'clinic_based' || type === 'mobile' || type === 'hybrid'
  );

  /**
   * Strict marketplace eligibility by explicit practitioner type.
   * No fallback assumptions are applied.
   */
  const isPractitionerEligibleForMarketplace = (p: Practitioner): boolean => {
    if (!isValidTherapistType(p.therapist_type)) return false;
    // Must have at least one bookable product (clinic or mobile)
    if (!canBookClinic(p) && !canRequestMobile(p)) return false;
    if (p.therapist_type === 'clinic_based') return !!p.clinic_address?.trim();
    if (p.therapist_type === 'mobile') {
      return (
        !!p.base_address?.trim() &&
        p.mobile_service_radius_km != null &&
        p.base_latitude != null &&
        p.base_longitude != null
      );
    }
    return (
      !!p.clinic_address?.trim() &&
      !!p.base_address?.trim() &&
      p.mobile_service_radius_km != null &&
      p.base_latitude != null &&
      p.base_longitude != null
    );
  };

  const loadPractitioners = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          location,
          clinic_address,
          address_city,
          clinic_latitude,
          clinic_longitude,
          therapist_type,
          base_address,
          base_latitude,
          base_longitude,
          mobile_service_radius_km,
          clinic_image_url,
          specializations,
          services_offered,
          bio,
          experience_years,
          user_role,
          profile_completed,
          onboarding_status,
          profile_photo_url,
          has_liability_insurance,
          products:practitioner_products(*)
        `)
        .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
        .eq('is_active', true)
        .eq('profile_completed', true)
        .eq('onboarding_status', 'completed')
        .not('stripe_connect_account_id', 'is', null);

      if (error) throw error;

      // Get ratings for each practitioner
      const practitionersWithRatings = await Promise.all(
        (data || []).map(async (practitioner) => {
          // Canonical public rating source: reviews table only.
          const { data: reviews } = await supabase
            .from('reviews')
            .select('overall_rating')
            .eq('therapist_id', practitioner.id)
            .in('review_status', ['approved', 'published']);

          const { data: sessions } = await supabase
            .from('client_sessions')
            .select('id')
            .eq('therapist_id', practitioner.id)
            .eq('status', 'completed');

          const allRatings = (reviews || []).map(r => r.overall_rating).filter((r): r is number => typeof r === 'number');
          const averageRating = allRatings.length
            ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
            : 0;

          return {
            ...practitioner,
            user_id: practitioner.id, // Add user_id for compatibility
            average_rating: averageRating,
            total_reviews: allRatings.length,
            total_sessions: sessions?.length || 0
          };
        })
      );

      const eligiblePractitioners = practitionersWithRatings.filter(isPractitionerEligibleForMarketplace);
      setPractitioners(eligiblePractitioners);
    } catch (error: any) {
      console.error('Error loading practitioners:', error);
      const errorMessage = error?.message || 'Failed to load practitioners';
      toast.error('Failed to load practitioners', {
        description: errorMessage,
        action: {
          label: 'Retry',
          onClick: () => loadPractitioners()
        },
        duration: 5000
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleMessagePractitioner = async (practitioner: any) => {
    if (!user) {
      toast.error('Please sign in to message practitioners');
      navigate('/sign-in');
      return;
    }

    try {
      // Create or get conversation
      const conversationId = await MessagingManager.getOrCreateConversation(
        user.id,
        practitioner.user_id
      );

      // Send system message about inquiry
      await MessagingManager.sendMessage(
        conversationId,
        user.id,
        `${userProfile?.first_name || 'Client'} is interested in your services. Please respond to their inquiry.`,
        'system'
      );

      // Navigate to messages
      navigate(`/messages?conversation=${conversationId}&inquiry=true`);
      toast.success('Conversation started with practitioner');
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const filterAndSortPractitioners = () => {
    let filtered = [...practitioners];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.specializations.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.bio.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (selectedRole !== 'all') {
      filtered = filtered.filter(p => p.user_role === selectedRole);
    }

    // Location filter
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(p => p.location.toLowerCase().includes(selectedLocation.toLowerCase()));
    }

    // Practitioner type filter (clinic / mobile / hybrid)
    if (selectedPractitionerType !== 'all') {
      filtered = filtered.filter(p => p.therapist_type === selectedPractitionerType);
    }

    // Services offered filter (broad modalities)
    if (serviceOffered !== 'all') {
      filtered = filtered.filter(p => (p.services_offered || []).includes(serviceOffered));
    }

    // Liability insurance filter
    if (liabilityInsured === 'insured') {
      filtered = filtered.filter(p => p.has_liability_insurance === true);
    }

    // Price range filter - check both hourly_rate and product prices
    if (priceRange !== 'all') {
      const [min, max] = priceRange.split('-').map(Number);
      filtered = filtered.filter(p => {
        // Check product prices only (no hourly_rate)
        if (p.products && p.products.length > 0) {
          const activeProducts = p.products.filter(prod => prod.is_active);
          if (activeProducts.length > 0) {
            const minProductPrice = Math.min(...activeProducts.map(prod => prod.price_amount / 100));
            return max
              ? (minProductPrice >= min && minProductPrice <= max)
              : (minProductPrice >= min);
          }
        }

        // No active products, exclude from price filter
        return false;
      });
    }

    // Distance filter - if geo-search is active, sorting is handled by geo-search
    // Otherwise, apply text-based location filter

    // Note: Availability (e.g. "today") would require per-practitioner slot data; not implemented at list level.
    // Slot availability is checked in the booking flow.

    // Sort - prioritize distance if geo-search is active
    filtered.sort((a, b) => {
      // If distance is available (geo-search active), sort by distance first
      if (geoSearchActive && a.distance_km !== undefined && b.distance_km !== undefined) {
        if (sortBy === 'distance' || geoSearchActive) {
          return a.distance_km - b.distance_km;
        }
      }

      switch (sortBy) {
        case 'rating':
          return (b.average_rating || 0) - (a.average_rating || 0);
        case 'price_low':
          // Sort by minimum product price
          const aMinPrice = a.products && a.products.length > 0
            ? Math.min(...a.products.filter(p => p.is_active).map(p => p.price_amount))
            : Infinity;
          const bMinPrice = b.products && b.products.length > 0
            ? Math.min(...b.products.filter(p => p.is_active).map(p => p.price_amount))
            : Infinity;
          return aMinPrice - bMinPrice;
        case 'price_high':
          // Sort by maximum product price (descending) - most expensive practitioners first
          const aMaxPrice = a.products && a.products.length > 0
            ? Math.max(...a.products.filter(p => p.is_active).map(p => p.price_amount))
            : 0;
          const bMaxPrice = b.products && b.products.length > 0
            ? Math.max(...b.products.filter(p => p.is_active).map(p => p.price_amount))
            : 0;
          return bMaxPrice - aMaxPrice;
        case 'experience':
          return b.experience_years - a.experience_years;
        case 'sessions':
          return (b.total_sessions || 0) - (a.total_sessions || 0);
        case 'distance':
          if (a.distance_km !== undefined && b.distance_km !== undefined) {
            return a.distance_km - b.distance_km;
          }
          return 0;
        default:
          return 0;
      }
    });

    setFilteredPractitioners(filtered);

    // Track filter application
    Analytics.trackEvent('marketplace_filter_applied', {
      role: selectedRole,
      location: selectedLocation,
      serviceOffered,
      priceRange,
      distanceKm,
      availability,
      results: filtered.length
    });
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'sports_therapist': return 'Sports Therapist';
      case 'massage_therapist': return 'Massage Therapist';
      case 'osteopath': return 'Osteopath';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    return 'bg-gray-100 text-gray-700 border border-gray-200';
  };

  /** Practitioner type badge: Mobile / Clinic / Hybrid so cards are visually distinct. */
  const getPractitionerTypeBadge = (therapistType?: 'clinic_based' | 'mobile' | 'hybrid' | null) => {
    if (therapistType === 'mobile') return { label: 'Travels to you', icon: Car, className: 'bg-amber-50 text-amber-800 border border-amber-200' };
    if (therapistType === 'hybrid') return { label: 'Clinic + Mobile', icon: MapPin, className: 'bg-slate-100 text-slate-700 border border-slate-200' };
    if (therapistType === 'clinic_based') return { label: 'Clinic-based', icon: Building, className: 'bg-gray-100 text-gray-700 border border-gray-200' };
    // Default for null/undefined (legacy or incomplete profile) - use neutral styling
    return { label: 'Clinic-based', icon: Building, className: 'bg-gray-100 text-gray-700 border border-gray-200' };
  };

  /** KAN-37: Prominent star display - 5 stars visible, filled by rating (0-5). */
  const renderStars = (rating: number) => {
    const r = Math.min(5, Math.max(0, rating));
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 shrink-0 transition-colors ${
          i < Math.floor(r) ? 'fill-amber-500 text-amber-500' : 'fill-gray-200 text-gray-200'
        }`}
        aria-hidden
      />
    ));
  };

  const uniqueLocations = [...new Set(
    practitioners
      .map(p => (p.location || '').trim())
      .filter(Boolean)
  )].sort();

  if (loading) {
    return (
      <>
        {!user && <HeaderClean />}
        <main id="main-content" className={`container mx-auto p-6 ${!user ? 'mt-16' : ''}`}>
          <div className="mb-6">
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <PractitionerGridSkeleton count={6} />
        </main>
        {!user && <FooterClean />}
      </>
    );
  }

  // Get active filters count
  const activeFiltersCount = [
    selectedRole !== 'all',
    selectedLocation !== 'all',
    selectedPractitionerType !== 'all',
    priceRange !== 'all',
    serviceOffered !== 'all',
    liabilityInsured !== 'all',
    distanceKm !== 'all',
    availability !== 'any',
    geoSearchActive
  ].filter(Boolean).length;

  const hasActiveFilters = activeFiltersCount > 0;

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedRole('all');
    setSelectedLocation('all');
    setSelectedPractitionerType('all');
    setPriceRange('all');
    setServiceOffered('all');
    setLiabilityInsured('all');
    setDistanceKm('all');
    setAvailability('any');
    setGeoSearchActive(false);
    setGeoSearchLocation(null);
  };

  return (
    <>
      {!user && <HeaderClean />}
      <main id="main-content" className={`container mx-auto p-6 ${!user ? 'mt-16' : ''}`}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Find Your Therapist</h1>
        <p className="text-muted-foreground">Browse qualified therapists and book your session</p>
      </div>

      {/* Simplified Notion-like Search */}
      <div className="mb-6 space-y-4">
        {/* Main Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search therapists, locations, specializations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 text-base"
          />
        </div>

        {/* Active Filters as Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Filters:</span>
            {selectedRole !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {getRoleDisplayName(selectedRole)}
                <button
                  onClick={() => setSelectedRole('all')}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {selectedLocation !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {selectedLocation}
                <button
                  onClick={() => setSelectedLocation('all')}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {priceRange !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {priceRange === '0-50' ? '£0-£50' :
                  priceRange === '50-80' ? '£50-£80' :
                    priceRange === '80-120' ? '£80-£120' :
                      priceRange === '120' ? '£120+' : priceRange}
                <button
                  onClick={() => setPriceRange('all')}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {serviceOffered !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {serviceOffered}
                <button
                  onClick={() => setServiceOffered('all')}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {liabilityInsured !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Liability Insured
                <button
                  onClick={() => setLiabilityInsured('all')}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {selectedPractitionerType !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {selectedPractitionerType === 'clinic_based' ? 'Clinic-based' : selectedPractitionerType === 'mobile' ? 'Travels to you' : 'Clinic + Mobile'}
                <button
                  onClick={() => setSelectedPractitionerType('all')}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {geoSearchActive && geoSearchLocation?.address && (
              <Badge variant="secondary" className="gap-1">
                Near {geoSearchLocation.address}
                <button
                  onClick={() => {
                    setGeoSearchActive(false);
                    setGeoSearchLocation(null);
                  }}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {distanceKm !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                ≤ {distanceKm} km
                <button
                  onClick={() => setDistanceKm('all')}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Simple Filter Toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant={searchMode === 'smart' ? 'default' : 'outline'}
            size="lg"
            onClick={() => setSearchMode(searchMode === 'traditional' ? 'smart' : 'traditional')}
            className="gap-2 h-12 px-6 text-base font-medium"
          >
            {searchMode === 'smart' ? (
              <>
                <Filter className="h-5 w-5" />
                Show Filters
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Unsure who to choose?
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            {filteredPractitioners.length} therapist{filteredPractitioners.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {/* Smart Search or Traditional Filters */}
      {searchMode === 'smart' ? (
        <>
          <SmartSearch
          onPractitionerSelect={async (practitioner) => {
            const id = practitioner?.id ?? practitioner?.user_id;
            if (!id) {
              toast.error('Booking not available', { description: 'Practitioner information is missing.' });
              return;
            }
            let fullPractitioner: Practitioner | null = practitioners.find(
              (p) => p.id === id || p.user_id === id
            ) ?? null;
            if (!fullPractitioner) {
              const { data: fetched } = await supabase
                .from('users')
                .select(`
                  id,
                  first_name,
                  last_name,
                  location,
                  clinic_address,
                  address_city,
                  clinic_latitude,
                  clinic_longitude,
                  therapist_type,
                  base_address,
                  base_latitude,
                  base_longitude,
                  mobile_service_radius_km,
                  profile_photo_url,
                  user_role,
                  specializations,
                  bio,
                  experience_years,
                  profile_completed,
                  onboarding_status,
                  products:practitioner_products(*)
                `)
                .eq('id', id)
                .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
                .eq('is_active', true)
                .eq('profile_completed', true)
                .eq('onboarding_status', 'completed')
                .single();
              if (fetched) {
                fullPractitioner = {
                  ...fetched,
                  user_id: fetched.id,
                  specializations: Array.isArray(fetched.specializations) ? fetched.specializations : [],
                  clinic_image_url: null
                } as Practitioner;
              }
            }
            const p = fullPractitioner ?? practitioner;
            setSelectedPractitioner(p);
            const hasClinic = canBookClinic(p);
            const hasMobile = canRequestMobile(p);

            if (hasClinic && hasMobile) {
              setShowBookingFlow(false);
              setShowMobileRequestFlow(false);
              return;
            }
            if (hasClinic) {
              setShowBookingFlow(true);
              return;
            }
            if (hasMobile) {
              setShowMobileRequestFlow(true);
              return;
            }
            toast.error('Booking not available for this practitioner.', {
              description: 'No active clinic or mobile services are configured yet.',
            });
          }}
          />
          {selectedPractitioner &&
            canBookClinic(selectedPractitioner) &&
            canRequestMobile(selectedPractitioner) &&
            !showBookingFlow &&
            !showMobileRequestFlow && (
              <Card className="mt-6">
                <CardContent className="pt-6">
                  <h3 className="text-base font-semibold mb-2">Choose booking type</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedPractitioner.first_name} {selectedPractitioner.last_name} offers both clinic and mobile sessions.
                  </p>
                  <HybridBookingChooser
                    fullWidth={true}
                    buttonSize="default"
                    practitionerName={`${selectedPractitioner.first_name} ${selectedPractitioner.last_name}`.trim()}
                    onBookClinic={() => {
                      setShowMobileRequestFlow(false);
                      setShowBookingFlow(true);
                    }}
                    onRequestMobile={() => {
                      setShowBookingFlow(false);
                      setShowMobileRequestFlow(true);
                    }}
                  />
                </CardContent>
              </Card>
            )}
        </>
      ) : (
        <>
          {/* Collapsible Advanced Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Role Filter */}
                <div>
                  <Label className="text-sm">Profession</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Professions</SelectItem>
                      <SelectItem value="sports_therapist">Sports Therapist</SelectItem>
                      <SelectItem value="massage_therapist">Massage Therapist</SelectItem>
                      <SelectItem value="osteopath">Osteopath</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Location Filter */}
                <div>
                  <Label className="text-sm">Location</Label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {uniqueLocations.slice(0, 10).map(location => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range Filter */}
                <div>
                  <Label className="text-sm">Price</Label>
                  <Select value={priceRange} onValueChange={setPriceRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="0-50">£0 - £50</SelectItem>
                      <SelectItem value="50-80">£50 - £80</SelectItem>
                      <SelectItem value="80-120">£80 - £120</SelectItem>
                      <SelectItem value="120">£120+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Services Offered */}
                <div>
                  <Label className="text-sm">Service</Label>
                  <Select value={serviceOffered} onValueChange={setServiceOffered}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Service</SelectItem>
                      <SelectItem value="massage">Massage</SelectItem>
                      <SelectItem value="cupping">Cupping</SelectItem>
                      <SelectItem value="acupuncture">Acupuncture</SelectItem>
                      <SelectItem value="manipulations">Manipulations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Liability Insurance Filter */}
                <div>
                  <Label className="text-sm">Liability Insurance</Label>
                  <Select value={liabilityInsured} onValueChange={setLiabilityInsured}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="insured">Insured Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Practitioner type: Clinic / Mobile / Hybrid */}
                <div>
                  <Label className="text-sm">Practitioner type</Label>
                  <Select value={selectedPractitionerType} onValueChange={(v) => setSelectedPractitionerType(v as 'all' | 'clinic_based' | 'mobile' | 'hybrid')}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="clinic_based">Clinic-based</SelectItem>
                      <SelectItem value="mobile">Travels to you</SelectItem>
                      <SelectItem value="hybrid">Clinic + Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Geo Search - Collapsed by default */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Search by location</Label>
                </div>
                <p className="text-xs text-muted-foreground mt-1 mb-2">
                  Optional. Search by location to see nearby therapists and distance estimates.
                </p>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter address or city..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleLocationSearch(e.currentTarget.value);
                        }
                      }}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleUseCurrentLocation}
                    disabled={loadingGeoSearch}
                    title="Use current location"
                  >
                    📍
                  </Button>
                </div>
                {geoSearchLocation?.address && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Searching near: {geoSearchLocation.address}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Results */}

      {/* Practitioners Grid */}
      {filteredPractitioners.length === 0 ? (
        <EmptyPractitioners
          onClearFilters={() => {
            setSearchTerm('');
            setSelectedRole('all');
            setSelectedLocation('all');
            setSelectedPractitionerType('all');
            setSelectedSpecialization('all');
            setPriceRange('all');
            setServiceOffered('all');
            setLiabilityInsured('all');
            setDistanceKm('all');
            setAvailability('any');
            setGeoSearchActive(false);
            setGeoSearchLocation(null);
          }}
          onSearch={() => {
            setSearchTerm('');
            setSelectedRole('all');
            setSelectedLocation('all');
            setSelectedSpecialization('all');
            setPriceRange('all');
            setServiceOffered('all');
            setLiabilityInsured('all');
            setDistanceKm('all');
            setAvailability('any');
            setGeoSearchActive(false);
            setGeoSearchLocation(null);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPractitioners.map((practitioner) => {
            const isMobileOnly = practitioner.therapist_type === 'mobile';
            // Mobile-only practitioners have no clinic: show radius visual, not a clinic/location photo
            const clinicImageUrl = isMobileOnly ? null : practitioner.clinic_image_url;
            const locationImageUrl = !clinicImageUrl && !isMobileOnly
              ? getBestLocationImageUrl(
              practitioner.clinic_latitude,
              practitioner.clinic_longitude,
              practitioner.clinic_address || practitioner.location,
              600,
              240
                )
              : null;
            const displayImageUrl = clinicImageUrl || locationImageUrl;
            const imageAlt = clinicImageUrl
              ? `Clinic: ${practitioner.clinic_address || practitioner.location}`
              : `Location: ${practitioner.clinic_address || practitioner.location}`;

            const minPrice = practitioner.products?.filter(p => p.is_active).length > 0
              ? Math.min(...practitioner.products.filter(p => p.is_active).map(p => p.price_amount / 100))
              : null;
            const safePublicLocation = getPublicLocationDisplay({
              therapist_type: practitioner.therapist_type ?? null,
              clinic_address: practitioner.clinic_address ?? null,
              address_city: practitioner.address_city ?? null,
              location: practitioner.location ?? null,
              base_address: practitioner.base_address ?? null,
              mobile_service_radius_km: practitioner.mobile_service_radius_km ?? null,
            });
            const mobileAreaLabel = safePublicLocation.summary?.split(' • ')[0] || 'Local area';

            return (
              <Card 
                key={practitioner.id} 
                className="group relative h-full overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-[border-color,background-color] duration-200 ease-out"
                tabIndex={0}
              >
                {/* Card hero: clinic/location image, or for mobile-only a radius visual (no clinic) */}
                {isMobileOnly && practitioner.mobile_service_radius_km != null ? (
                  <MobileServiceAreaBlock
                    radiusKm={practitioner.mobile_service_radius_km}
                    baseLatitude={practitioner.base_latitude}
                    baseLongitude={practitioner.base_longitude}
                    areaLabel={mobileAreaLabel}
                  />
                ) : displayImageUrl ? (
                  <div className="relative w-full h-40 overflow-hidden bg-gray-100 rounded-t-xl">
                    <img
                      src={displayImageUrl}
                      alt={imageAlt}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : null}

                <CardHeader className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border border-gray-200 flex-shrink-0">
                      <AvatarImage src={practitioner.profile_photo_url || undefined} />
                      <AvatarFallback className="bg-gray-100 text-gray-700 font-medium text-sm">
                        {practitioner.first_name?.[0] || ''}{practitioner.last_name?.[0] || ''}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div>
                        <CardTitle className="text-base font-semibold text-gray-900 leading-tight mb-1">
                        {practitioner.first_name || ''} {practitioner.last_name || ''}
                      </CardTitle>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(practitioner.user_role)}`}>
                            {getRoleDisplayName(practitioner.user_role)}
                          </span>
                          {(() => {
                            const typeBadge = getPractitionerTypeBadge(practitioner.therapist_type);
                            const Icon = typeBadge.icon;
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${typeBadge.className}`}>
                                <Icon className="h-3 w-3 shrink-0" aria-hidden />
                                {typeBadge.label}
                              </span>
                            );
                          })()}
                          {/* KAN-37: Prominent star ratings near name; click opens profile (reviews); no-ratings badge */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReviewsModalPractitioner({
                                id: practitioner.id,
                                first_name: practitioner.first_name,
                                last_name: practitioner.last_name,
                                average_rating: practitioner.average_rating,
                                total_reviews: practitioner.total_reviews,
                              });
                              setReviewsModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 -m-1 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            aria-label={
                              practitioner.average_rating != null && practitioner.average_rating > 0
                                ? `Rating ${practitioner.average_rating.toFixed(1)} out of 5${practitioner.total_reviews ? `, ${practitioner.total_reviews} reviews` : ''}. Click to view reviews.`
                                : 'No ratings yet. Click to view reviews.'
                            }
                          >
                            <span className="flex items-center gap-0.5" aria-hidden>
                              {renderStars(practitioner.average_rating ?? 0)}
                            </span>
                            {practitioner.average_rating != null && practitioner.average_rating > 0 ? (
                              <>
                                <span className="text-sm font-semibold text-gray-900">
                                  {practitioner.average_rating.toFixed(1)}
                                </span>
                                {(practitioner.total_reviews ?? 0) > 0 && (
                                  <span className="text-xs text-gray-500">
                                    ({practitioner.total_reviews} review{practitioner.total_reviews !== 1 ? 's' : ''})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs font-medium text-gray-500">New practitioner</span>
                            )}
                          </button>
                        </div>
                      </div>

                      <CardDescription className="flex items-start gap-1.5 text-xs text-gray-600">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                        {(() => {
                          const loc = getLocationDisplay(practitioner);
                          if (loc.link) {
                            return (
                              <a
                                href={loc.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-gray-600 hover:text-primary hover:underline transition-colors group/link line-clamp-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span>{loc.text}</span>
                                <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                              </a>
                            );
                          }
                          return <span className="text-xs text-gray-600">{loc.text}</span>;
                        })()}
                        {geoSearchActive && practitioner.distance_km !== undefined && (
                          <span className="text-xs font-medium text-primary ml-1">
                            • {practitioner.distance_km.toFixed(1)} km away
                          </span>
                        )}
                      </CardDescription>
                        </div>
                </div>
              </CardHeader>

                <CardContent className="px-4 pb-4 space-y-3 flex flex-1 flex-col">
                  {/* Services */}
                  {(practitioner.products && practitioner.products.filter(p => p.is_active).length > 0) || 
                   (practitioner.services_offered && practitioner.services_offered.length > 0) ? (
                      <div className="flex flex-wrap gap-1.5">
                      {(practitioner.products?.filter(p => p.is_active) || []).length > 0 ? (
                        <>
                        {practitioner.products
                          .filter(p => p.is_active)
                            .slice(0, 3)
                          .map((product) => (
                              <span
                                key={product.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200"
                              >
                              {product.name}
                              {product.duration_minutes && (
                                  <span className="ml-1 text-gray-500">
                                    {product.duration_minutes}min
                                </span>
                              )}
                              </span>
                          ))}
                          {practitioner.products.filter(p => p.is_active).length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-gray-500 border border-gray-200 bg-transparent">
                              +{practitioner.products.filter(p => p.is_active).length - 3}
                            </span>
                        )}
                        </>
                      ) : (
                        <>
                          {practitioner.services_offered?.map((service) => (
                            <span
                              key={service}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200"
                            >
                            {getServiceLabel(service)}
                            </span>
                        ))}
                        </>
                    )}
                  </div>
                  ) : null}

                  {/* Bio */}
                  {practitioner.bio && (
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {practitioner.bio}
                      </p>
                  )}

                  {/* Stats & Price Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium text-gray-900">{practitioner.experience_years} years</span>
                      <span className="text-gray-500">experience</span>
                    </div>
                    
                    {minPrice !== null && (
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          From £{minPrice.toFixed(2)}
                      </div>
                    </div>
                    )}
                  </div>

                  {/* Next available slot - KAN-36 */}
                  <NextAvailableSlot therapistId={practitioner.user_id} className="pt-2" />

                  {/* Action Buttons - KAN-35: Prominent "Book Session" (44x44px min, primary, calendar, ARIA) */}
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                      {(() => {
                        const hasClinicServices = canBookClinic(practitioner);
                        const hasMobileServices = canRequestMobile(practitioner);
                        const practitionerName = `${practitioner.first_name} ${practitioner.last_name}`.trim() || 'therapist';
                        const bookSessionAriaLabel = `Book session with ${practitionerName}`;

                        const openBookSession = () => {
                          setSelectedPractitioner(practitioner);
                          if (hasClinicServices) {
                            setShowBookingFlow(true);
                            return;
                          }
                          if (hasMobileServices) {
                            setShowMobileRequestFlow(true);
                            return;
                          }

                          // Never fail silently: explain why no booking flow can open.
                          const hasAnyActiveProducts = !!practitioner.products?.some(p => p.is_active);
                          if (!hasAnyActiveProducts) {
                            toast.error('Booking is not available yet for this practitioner.', {
                              description: 'No active services are configured yet. Please try another practitioner.',
                            });
                            return;
                          }

                          if (practitioner.therapist_type === 'mobile' || practitioner.therapist_type === 'hybrid') {
                            toast.error('Mobile booking is not fully configured for this practitioner.', {
                              description: 'A mobile service product or location setup is missing.',
                            });
                            return;
                          }

                          toast.error('Unable to open booking for this practitioner right now.');
                        };

                        return (
                          <>
                            {/* For hybrid therapists: Show both options clearly */}
                            {hasClinicServices && hasMobileServices ? (
                              <HybridBookingChooser
                                onBookClinic={openBookSession}
                                onRequestMobile={() => {
                                  setSelectedPractitioner(practitioner);
                                  setShowBookingFlow(false);
                                  setShowMobileRequestFlow(true);
                                }}
                                practitionerName={practitionerName}
                              />
                            ) : (
                              /* Single option: Show appropriate button */
                              <Button
                                onClick={openBookSession}
                                aria-label={bookSessionAriaLabel}
                                className="min-h-[44px] min-w-[44px] flex-1 sm:flex-initial px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary focus:ring-offset-2"
                              >
                                <Calendar className="h-4 w-4 mr-2 shrink-0" aria-hidden />
                                {hasMobileServices ? 'Request' : 'Book'}
                              </Button>
                            )}
                          </>
                        );
                      })()}
                      <Button
                        variant="outline"
                        onClick={() => handleMessagePractitioner(practitioner)}
                        aria-label={`Message ${practitioner.first_name} ${practitioner.last_name}`}
                        className="min-h-[44px] h-auto py-2.5 text-xs font-medium focus:ring-2 focus:ring-primary/20"
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                        Message
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedProfileId(practitioner.id);
                          setProfileModalOpen(true);
                        }}
                        aria-label={`View profile of ${practitioner.first_name} ${practitioner.last_name}`}
                        className="min-h-[44px] h-auto py-2.5 text-xs font-medium focus:ring-2 focus:ring-primary/20"
                      >
                        <UserIcon className="h-3.5 w-3.5 mr-1.5" />
                        Profile
                      </Button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Booking Flow Modal */}
      {showBookingFlow && selectedPractitioner && (
        <>
          {user ? (
            <BookingFlow
              open={showBookingFlow}
              onOpenChange={setShowBookingFlow}
              practitioner={selectedPractitioner}
              onRedirectToMobile={() => {
                setShowBookingFlow(false);
                setShowMobileRequestFlow(true);
              }}
            />
          ) : (
            <GuestBookingFlow
              open={showBookingFlow}
              onOpenChange={setShowBookingFlow}
              practitioner={selectedPractitioner}
              onRedirectToMobile={() => {
                setShowBookingFlow(false);
                setShowMobileRequestFlow(true);
              }}
            />
          )}
        </>
      )}

      {/* Mobile Booking Request Flow Modal (available for both clients and guests) */}
      {showMobileRequestFlow && selectedPractitioner && (
        <MobileBookingRequestFlow
          open={showMobileRequestFlow}
          onOpenChange={setShowMobileRequestFlow}
          practitioner={selectedPractitioner}
          clientLocation={geoSearchLocation}
        />
      )}

      {/* Reviews-only modal (rating button) */}
      <ReviewsModal
        open={reviewsModalOpen}
        onOpenChange={(open) => {
          setReviewsModalOpen(open);
          if (!open) setReviewsModalPractitioner(null);
        }}
        practitioner={reviewsModalPractitioner}
      />

      {/* Public Profile Modal (Profile button) */}
      <PublicProfileModal
        therapistId={selectedProfileId}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        hideBookButton={true}
      />
    </main>
      {!user && <FooterClean />}
    </>
  );
};

export default Marketplace;


