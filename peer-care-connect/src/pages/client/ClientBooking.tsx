import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Star, Clock, Calendar, User as UserIcon, Filter, Car } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BookingFlow } from '@/components/marketplace/BookingFlow';
import { MobileBookingRequestFlow } from '@/components/marketplace/MobileBookingRequestFlow';
import { NextAvailableSlot } from '@/components/marketplace/NextAvailableSlot';
import { HybridBookingChooser } from '@/components/booking/HybridBookingChooser';
import { canBookClinic, canRequestMobile } from '@/lib/booking-flow-type';

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
  average_rating?: number;
  total_sessions?: number;
  distance_km?: number;
  therapist_type?: 'clinic_based' | 'mobile' | 'hybrid' | null;
  base_latitude?: number | null;
  base_longitude?: number | null;
  mobile_service_radius_km?: number | null;
  stripe_connect_account_id?: string | null;
  clinic_latitude?: number | null;
  clinic_longitude?: number | null;
  products?: Array<{ id: string; name: string; description?: string; price_amount: number; currency: string; duration_minutes: number; service_type?: 'clinic' | 'mobile' | 'both'; is_active: boolean; stripe_price_id?: string }>;
}

type SortOption = 'price' | 'rating' | 'distance';

const ClientBooking = () => {
  const { user, userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [filteredPractitioners, setFilteredPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [showMobileRequestFlow, setShowMobileRequestFlow] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');

  // Sort (KAN-31)
  const [sortBy, setSortBy] = useState<SortOption>('rating');

  useEffect(() => {
    loadPractitioners();
  }, []);

  useEffect(() => {
    filterPractitioners();
  }, [practitioners, searchTerm, selectedRole, selectedLocation, selectedSpecialization, priceRange]);

  // Handle practitioner parameter from URL
  useEffect(() => {
    const practitionerId = searchParams.get('practitioner');
    const bookingMode = searchParams.get('mode');
    if (practitionerId && practitioners.length > 0) {
      const practitioner = practitioners.find(p => p.user_id === practitionerId);
      if (practitioner) {
        setSelectedPractitioner(practitioner);
        if (bookingMode === 'mobile') {
          setShowBookingFlow(false);
          setShowMobileRequestFlow(true);
        } else {
          setShowMobileRequestFlow(false);
          setShowBookingFlow(true);
        }
      }
    }
  }, [practitioners, searchParams]);

  const loadPractitioners = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
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
          email,
          therapist_type,
          base_latitude,
          base_longitude,
          mobile_service_radius_km,
          stripe_connect_account_id,
          clinic_latitude,
          clinic_longitude
        `)
        .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
        .eq('is_active', true)
        .not('hourly_rate', 'is', null);

      if (error) throw error;

      // Fetch active products for all practitioners (batch)
      const practitionerIds = (data || []).map((p: { id: string }) => p.id);
      const { data: productsData } = await supabase
        .from('practitioner_products')
        .select('id, name, description, price_amount, currency, duration_minutes, service_type, is_active, stripe_price_id, practitioner_id')
        .in('practitioner_id', practitionerIds)
        .eq('is_active', true);
      const productsByPractitioner = new Map<string, NonNullable<Practitioner['products']>>();
      (productsData || []).forEach((row: { practitioner_id: string } & Record<string, unknown>) => {
        const list = productsByPractitioner.get(row.practitioner_id) ?? [];
        list.push(row as NonNullable<Practitioner['products']>[number]);
        productsByPractitioner.set(row.practitioner_id, list);
      });

      // Get ratings for each practitioner
      const practitionersWithRatings = await Promise.all(
        (data || []).map(async (practitioner: { id: string; [key: string]: unknown }) => {
          const { data: ratings } = await supabase
            .from('reviews')
            .select('overall_rating')
            .eq('therapist_id', practitioner.id)
            .eq('review_status', 'published');

          const { data: sessions } = await supabase
            .from('client_sessions')
            .select('id')
            .eq('therapist_id', practitioner.id)
            .eq('status', 'completed');

          const averageRating = ratings?.length 
            ? ratings.reduce((sum: number, r: { overall_rating?: number }) => sum + (r.overall_rating ?? 0), 0) / ratings.length 
            : 0;

          const products = productsByPractitioner.get(practitioner.id) || [];

          return {
            ...practitioner,
            user_id: practitioner.id,
            average_rating: averageRating,
            total_sessions: sessions?.length || 0,
            products,
          };
        })
      );

      setPractitioners(practitionersWithRatings);
    } catch (error) {
      console.error('Error loading practitioners:', error);
      toast.error('Failed to load practitioners');
    } finally {
      setLoading(false);
    }
  };

  const filterPractitioners = () => {
    let filtered = [...practitioners];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.specializations.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
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

    // Specialization filter
    if (selectedSpecialization !== 'all') {
      filtered = filtered.filter(p => p.specializations.includes(selectedSpecialization));
    }

    // Price range filter
    if (priceRange !== 'all') {
      const [min, max] = priceRange.split('-').map(Number);
      filtered = filtered.filter(p => {
        if (max) {
          return p.hourly_rate >= min && p.hourly_rate <= max;
        } else {
          return p.hourly_rate >= min;
        }
      });
    }

    setFilteredPractitioners(filtered);
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
    switch (role) {
      case 'sports_therapist': return 'bg-blue-50 text-blue-700';
      case 'massage_therapist': return 'bg-green-50 text-green-700';
      case 'osteopath': return 'bg-purple-50 text-purple-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const uniqueLocations = [...new Set(
    practitioners
      .map(p => (p.location || '').trim())
      .filter(Boolean)
  )].sort();
  const uniqueSpecializations = [...new Set(practitioners.flatMap(p => p.specializations))];

  // Apply sort to filtered list (KAN-31: Price low→high, Rating high→low, Distance low→high)
  const sortedPractitioners = React.useMemo(() => {
    const list = [...filteredPractitioners];
    if (sortBy === 'price') {
      list.sort((a, b) => (a.hourly_rate ?? Infinity) - (b.hourly_rate ?? Infinity));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0));
    } else if (sortBy === 'distance') {
      list.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
    }
    return list;
  }, [filteredPractitioners, sortBy]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading therapists...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Book a Session</h1>
        <p className="text-muted-foreground">Find and book with qualified therapists</p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, location, or specialization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div>
              <Label>Profession</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="All Professions" />
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
              <Label>Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {uniqueLocations.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Range Filter */}
            <div>
              <Label>Price Range</Label>
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Prices" />
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
          </div>

          {/* Specialization Filter */}
          <div className="mt-4">
            <Label>Specializations</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button
                variant={selectedSpecialization === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSpecialization('all')}
              >
                All
              </Button>
              {uniqueSpecializations.map(specialization => (
                <Button
                  key={specialization}
                  variant={selectedSpecialization === specialization ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSpecialization(specialization)}
                >
                  {specialization}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results and Sort (KAN-31) */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-muted-foreground">
          {filteredPractitioners.length} therapist{filteredPractitioners.length !== 1 ? 's' : ''} found
        </p>
        {filteredPractitioners.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Price (Low to High)</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="distance">Distance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Practitioners Grid */}
      {filteredPractitioners.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No therapists found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or filters.
            </p>
            <Button onClick={() => {
              setSearchTerm('');
              setSelectedRole('all');
              setSelectedLocation('all');
              setSelectedSpecialization('all');
              setPriceRange('all');
            }}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPractitioners.map((practitioner) => (
            <Card key={practitioner.id} className="transition-[border-color,background-color] duration-200 ease-out">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserIcon className="h-5 w-5" />
                      {practitioner.first_name} {practitioner.last_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4" />
                      {practitioner.location}
                    </CardDescription>
                  </div>
                  <Badge className={getRoleBadgeColor(practitioner.user_role)}>
                    {getRoleDisplayName(practitioner.user_role)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Rating and Experience */}
                  <div className="flex items-center gap-4">
                    {practitioner.average_rating && practitioner.average_rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">
                          {practitioner.average_rating.toFixed(1)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({practitioner.total_sessions || 0} sessions)
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {practitioner.experience_years} years experience
                      </span>
                    </div>
                  </div>

                  {/* Specializations */}
                  <div>
                    <h4 className="font-medium text-sm mb-1">Specializations</h4>
                    <div className="flex flex-wrap gap-1">
                      {practitioner.specializations.slice(0, 3).map((spec) => (
                        <Badge key={spec} variant="outline" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                      {practitioner.specializations.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{practitioner.specializations.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {practitioner.bio && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">About</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {practitioner.bio}
                      </p>
                    </div>
                  )}

                  {/* Next available slot - KAN-31 */}
                  <NextAvailableSlot therapistId={practitioner.user_id} className="pt-1" />

                  {/* Price & Book */}
                  <div className="flex items-center justify-between pt-2 gap-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Pricing available in booking</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {canBookClinic(practitioner) && canRequestMobile(practitioner) ? (
                        <HybridBookingChooser
                          onBookClinic={() => {
                            setSelectedPractitioner(practitioner);
                            setShowMobileRequestFlow(false);
                            setShowBookingFlow(true);
                          }}
                          onRequestMobile={() => {
                            setSelectedPractitioner(practitioner);
                            setShowBookingFlow(false);
                            setShowMobileRequestFlow(true);
                          }}
                          practitionerName={`${practitioner.first_name} ${practitioner.last_name}`.trim()}
                          clinicLabel="Book at Clinic"
                          mobileLabel="Request Visit to My Location"
                        />
                      ) : canBookClinic(practitioner) ? (
                        <Button
                          onClick={() => {
                            setSelectedPractitioner(practitioner);
                            setShowMobileRequestFlow(false);
                            setShowBookingFlow(true);
                          }}
                          size="sm"
                        >
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          Book Session
                        </Button>
                      ) : null}
                      {!canBookClinic(practitioner) && canRequestMobile(practitioner) && (
                        <Button
                          onClick={() => {
                            setSelectedPractitioner(practitioner);
                            setShowBookingFlow(false);
                            setShowMobileRequestFlow(true);
                          }}
                          size="sm"
                        >
                          <Car className="h-3.5 w-3.5 mr-1" />
                          Request Mobile Session
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Booking Flow Modal */}
      {showBookingFlow && selectedPractitioner && (
        <BookingFlow
          open={showBookingFlow}
          onOpenChange={setShowBookingFlow}
          practitioner={selectedPractitioner}
          onRedirectToMobile={() => {
            setShowBookingFlow(false);
            setShowMobileRequestFlow(true);
          }}
        />
      )}
      {showMobileRequestFlow && selectedPractitioner && (
        <MobileBookingRequestFlow
          open={showMobileRequestFlow}
          onOpenChange={setShowMobileRequestFlow}
          practitioner={selectedPractitioner}
          clientLocation={null}
        />
      )}
    </div>
  );
};

export default ClientBooking;


