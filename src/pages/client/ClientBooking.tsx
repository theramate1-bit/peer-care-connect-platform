import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Star, Clock, Calendar, User, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BookingFlow } from '@/components/marketplace/BookingFlow';

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
}

const ClientBooking = () => {
  const { user, userProfile } = useAuth();
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

  useEffect(() => {
    loadPractitioners();
  }, []);

  useEffect(() => {
    filterPractitioners();
  }, [practitioners, searchTerm, selectedRole, selectedLocation, selectedSpecialization, priceRange]);

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
          email
        `)
        .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
        .eq('is_active', true)
        .not('hourly_rate', 'is', null);

      if (error) throw error;

      // Get ratings for each practitioner
      const practitionersWithRatings = await Promise.all(
        (data || []).map(async (practitioner) => {
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
            ? ratings.reduce((sum, r) => sum + r.overall_rating, 0) / ratings.length 
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
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
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

                  {/* Price */}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-lg font-semibold">£{practitioner.hourly_rate}</span>
                      <span className="text-sm text-muted-foreground">/hour</span>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedPractitioner(practitioner);
                        setShowBookingFlow(true);
                      }}
                      size="sm"
                    >
                      Book Session
                    </Button>
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

export default ClientBooking;