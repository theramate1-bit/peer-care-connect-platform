import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  MapPin, 
  Star, 
  Clock, 
  User, 
  Filter,
  Heart,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BookingFlow } from '@/components/marketplace/BookingFlow';
import { Analytics } from '@/lib/analytics';

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
  professional_statement?: string;
  treatment_philosophy?: string;
  services_offered?: string[];
}

const Marketplace = () => {
  const { userProfile } = useAuth();
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [filteredPractitioners, setFilteredPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);

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

  useEffect(() => {
    loadPractitioners();
  }, []);

  useEffect(() => {
    filterAndSortPractitioners();
  }, [practitioners, searchTerm, selectedRole, selectedLocation, selectedSpecialization, priceRange, sortBy, distanceKm, availability, serviceOffered]);

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
          services_offered,
          bio,
          experience_years,
          user_role,
          verification_status
        `)
        .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
        .eq('is_active', true)
        .eq('verification_status', 'verified')
        .not('hourly_rate', 'is', null);

      if (error) throw error;

      // Get ratings for each practitioner
      const practitionersWithRatings = await Promise.all(
        (data || []).map(async (practitioner) => {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('overall_rating')
            .eq('therapist_id', practitioner.id)
            .eq('review_status', 'published');

          const { data: sessions } = await supabase
            .from('client_sessions')
            .select('id')
            .eq('therapist_id', practitioner.id)
            .eq('status', 'completed');

          const averageRating = reviews?.length 
            ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length 
            : 0;

          return {
            ...practitioner,
            user_id: practitioner.id, // Add user_id for compatibility
            average_rating: averageRating,
            total_sessions: sessions?.length || 0
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

    // Specialization filter
    if (selectedSpecialization !== 'all') {
      filtered = filtered.filter(p => p.specializations.includes(selectedSpecialization));
    }

    // Services offered filter (broad modalities)
    if (serviceOffered !== 'all') {
      filtered = filtered.filter(p => (p.services_offered || []).includes(serviceOffered));
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

    // Distance filter (requires user location; fallback to location string match already applied)
    // If we had lat/lng for user and practitioners, we would compute Haversine here.
    // Placeholder: if distanceKm !== 'all' and selectedLocation is not 'all', keep current filter behavior.

    // Availability filter: basic example using experience as proxy if no availability slots in this view
    if (availability === 'today') {
      // Defer to booking flow for exact slots; here we leave as is
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.average_rating || 0) - (a.average_rating || 0);
        case 'price_low':
          return a.hourly_rate - b.hourly_rate;
        case 'price_high':
          return b.hourly_rate - a.hourly_rate;
        case 'experience':
          return b.experience_years - a.experience_years;
        case 'sessions':
          return (b.total_sessions || 0) - (a.total_sessions || 0);
        default:
          return 0;
      }
    });

    setFilteredPractitioners(filtered);

    // Track filter application
    Analytics.trackEvent('marketplace_filter_applied', {
      role: selectedRole,
      location: selectedLocation,
      specialization: selectedSpecialization,
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
    switch (role) {
      case 'sports_therapist': return 'bg-blue-50 text-blue-700';
      case 'massage_therapist': return 'bg-green-50 text-green-700';
      case 'osteopath': return 'bg-purple-50 text-purple-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const uniqueLocations = [...new Set(practitioners.map(p => p.location))];
  const uniqueSpecializations = [...new Set(practitioners.flatMap(p => p.specializations))];

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
        <h1 className="text-3xl font-bold mb-2">Find Your Therapist</h1>
        <p className="text-muted-foreground">Browse qualified therapists and book your session</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search therapists..."
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

            {/* Services Offered */}
            <div>
              <Label>Services Offered</Label>
              <Select value={serviceOffered} onValueChange={setServiceOffered}>
                <SelectTrigger>
                  <SelectValue placeholder="Any service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="massage">Massage</SelectItem>
                  <SelectItem value="cupping">Cupping Therapy</SelectItem>
                  <SelectItem value="acupuncture">Acupuncture</SelectItem>
                  <SelectItem value="manipulations">Manipulations</SelectItem>
                  <SelectItem value="mobilisation">Mobilisation</SelectItem>
                  <SelectItem value="stretching">Stretching</SelectItem>
                </SelectContent>
              </Select>
            </div>

          {/* Distance Filter */}
          <div>
            <Label>Distance</Label>
            <Select value={distanceKm} onValueChange={setDistanceKm}>
              <SelectTrigger>
                <SelectValue placeholder="Any distance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="5">≤ 5 km</SelectItem>
                <SelectItem value="10">≤ 10 km</SelectItem>
                <SelectItem value="25">≤ 25 km</SelectItem>
                <SelectItem value="50">≤ 50 km</SelectItem>
              </SelectContent>
            </Select>
          </div>

            {/* Sort */}
            <div>
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="experience">Experience</SelectItem>
                  <SelectItem value="sessions">Most Sessions</SelectItem>
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

          {/* Quick chips for Services Offered */}
          <div className="mt-4">
            <Label>Quick: Services Offered</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { label: 'Any', value: 'all' },
                { label: 'Massage', value: 'massage' },
                { label: 'Cupping', value: 'cupping' },
                { label: 'Acupuncture', value: 'acupuncture' },
                { label: 'Manipulations', value: 'manipulations' },
                { label: 'Mobilisation', value: 'mobilisation' },
                { label: 'Stretching', value: 'stretching' },
              ].map((svc) => (
                <Button
                  key={svc.value}
                  variant={serviceOffered === svc.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setServiceOffered(svc.value)}
                >
                  {svc.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="mb-4">
        <p className="text-muted-foreground">
          {filteredPractitioners.length} therapist{filteredPractitioners.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Practitioners Grid */}
      {filteredPractitioners.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
          {filteredPractitioners.map((practitioner) => (
            <Card key={practitioner.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {practitioner.first_name[0]}{practitioner.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {practitioner.first_name} {practitioner.last_name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4" />
                        {practitioner.location}
                      </CardDescription>
                    </div>
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
                    {userProfile?.user_role !== 'client' && practitioner.average_rating && practitioner.average_rating > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="flex">
                          {renderStars(Math.round(practitioner.average_rating))}
                        </div>
                        <span className="text-sm font-medium ml-1">
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

                  {/* Services Offered */}
                  {(practitioner.services_offered && practitioner.services_offered.length > 0) && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Services Offered</h4>
                      <div className="flex flex-wrap gap-1">
                        {practitioner.services_offered.slice(0, 4).map((svc) => (
                          <Badge key={svc} variant="secondary" className="text-xs">
                            {svc.charAt(0).toUpperCase() + svc.slice(1)}
                          </Badge>
                        ))}
                        {practitioner.services_offered.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{practitioner.services_offered.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  {practitioner.bio && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">About</h4>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {practitioner.bio}
                      </p>
                    </div>
                  )}

                  {/* Treatment Philosophy */}
                  {practitioner.treatment_philosophy && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Treatment Philosophy</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {practitioner.treatment_philosophy}
                      </p>
                    </div>
                  )}

                  {/* Price and Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-lg font-semibold">£{practitioner.hourly_rate}</span>
                      <span className="text-sm text-muted-foreground">/hour</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            // Create favorites table if it doesn't exist
                            const { error } = await supabase
                              .from('user_favorites')
                              .insert({
                                user_id: userProfile?.id,
                                therapist_id: practitioner.user_id,
                                created_at: new Date().toISOString()
                              });
                            
                            if (error) {
                              // If table doesn't exist, show info message
                              if (error.message.includes('relation "user_favorites" does not exist')) {
                                toast.info('Favorites feature coming soon!');
                                return;
                              }
                              throw error;
                            }
                            toast.success('Added to favorites!');
                          } catch (error) {
                            console.error('Error adding to favorites:', error);
                            toast.info('Favorites feature coming soon!');
                          }
                        }}
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedPractitioner(practitioner);
                          setShowBookingFlow(true);
                        }}
                        size="sm"
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Book Session
                      </Button>
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
        />
      )}
    </div>
  );
};

export default Marketplace;
