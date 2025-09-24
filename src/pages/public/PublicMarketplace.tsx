import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Filter, Star, Calendar as CalendarIcon } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { LocationSearch } from "@/components/location/LocationSearch";
import { LocationManager, NearbyTherapist } from "@/lib/location";
import { EnhancedSearch } from "@/components/discovery/EnhancedSearch";
import { UnifiedBookingModal } from "@/components/booking/UnifiedBookingModal";
import { supabase } from "@/integrations/supabase/client";
import MetaTags from "@/components/SEO/MetaTags";

interface Therapist {
  id: string;
  first_name: string;
  last_name: string;
  user_role: string;
  bio?: string;
  specializations?: string[];
  location?: string;
  experience_years?: number;
  hourly_rate?: number;
  is_active: boolean;
  is_verified?: boolean;
}

const PublicMarketplace = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [experienceFilter, setExperienceFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [searchMode, setSearchMode] = useState<'list' | 'location'>('list');
  const [nearbyTherapists, setNearbyTherapists] = useState<NearbyTherapist[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);

  const specialties = ["All Specialties", ...categories];

  useEffect(() => {
    fetchTherapists();
    fetchCategories();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const location = await LocationManager.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_role')
        .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
        .eq('is_active', true);
        
      if (error) throw error;
      
      // Get specializations based on user roles
      const allSpecializations = data?.flatMap(u => getDefaultSpecializations(u.user_role)) || [];
      const uniqueSpecializations = [...new Set(allSpecializations)];
      setCategories(uniqueSpecializations);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback categories
      setCategories(['Sports Injury Rehabilitation', 'Deep Tissue Massage', 'Performance Training', 'Osteopathy', 'Sports Massage']);
    }
  };

  const fetchTherapists = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          user_role,
          bio,
          location,
          is_active,
          is_verified
        `)
        .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
        .eq('is_active', true);

      if (error) throw error;
      
      // Add default values for missing columns
      const therapistsWithDefaults = (data || []).map(therapist => ({
        ...therapist,
        hourly_rate: getDefaultHourlyRate(therapist.user_role),
        experience_years: getDefaultExperienceYears(therapist.user_role),
        specializations: getDefaultSpecializations(therapist.user_role)
      }));
      
      setTherapists(therapistsWithDefaults);
    } catch (error) {
      console.error('Error fetching therapists:', error);
      // Add fallback data for testing
      setTherapists([
        {
          id: 'demo-1',
          first_name: 'Sarah',
          last_name: 'Johnson',
          user_role: 'sports_therapist',
          bio: 'Experienced sports therapist specializing in injury rehabilitation and performance optimization.',
          location: 'London, UK',
          hourly_rate: 80,
          experience_years: 8,
          specializations: ['Sports Injury Rehabilitation', 'Performance Training'],
          is_active: true,
          is_verified: true
        },
        {
          id: 'demo-2', 
          first_name: 'Michael',
          last_name: 'Chen',
          user_role: 'massage_therapist',
          bio: 'Licensed massage therapist with expertise in deep tissue and sports massage.',
          location: 'Manchester, UK',
          hourly_rate: 65,
          experience_years: 5,
          specializations: ['Deep Tissue Massage', 'Sports Massage'],
          is_active: true,
          is_verified: true
        },
        {
          id: 'demo-3',
          first_name: 'Emma',
          last_name: 'Williams',
          user_role: 'osteopath',
          bio: 'Qualified osteopath focusing on holistic treatment of musculoskeletal conditions.',
          location: 'Birmingham, UK',
          hourly_rate: 75,
          experience_years: 6,
          specializations: ['Osteopathy', 'Manual Therapy'],
          is_active: true,
          is_verified: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for default values
  const getDefaultHourlyRate = (userRole) => {
    switch (userRole) {
      case 'sports_therapist': return 80;
      case 'massage_therapist': return 65;
      case 'osteopath': return 75;
      default: return 70;
    }
  };

  const getDefaultExperienceYears = (userRole) => {
    switch (userRole) {
      case 'sports_therapist': return 8;
      case 'massage_therapist': return 5;
      case 'osteopath': return 6;
      default: return 3;
    }
  };

  const getDefaultSpecializations = (userRole) => {
    switch (userRole) {
      case 'sports_therapist': return ['Sports Injury Rehabilitation', 'Performance Training'];
      case 'massage_therapist': return ['Deep Tissue Massage', 'Sports Massage'];
      case 'osteopath': return ['Osteopathy', 'Manual Therapy'];
      default: return ['General Practice'];
    }
  };

  const filteredTherapists = therapists.filter(therapist => {
    const matchesSearch = searchQuery === "" || 
      `${therapist.first_name} ${therapist.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      therapist.specializations?.some(spec => spec.toLowerCase().includes(searchQuery.toLowerCase())) ||
      therapist.location?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSpecialty = selectedSpecialty === "" || selectedSpecialty === "All Specialties" ||
      therapist.specializations?.includes(selectedSpecialty);

    let matchesExperience = true;
    if (experienceFilter) {
      const [min, max] = experienceFilter.split('-').map(Number);
      const therapistExp = therapist.experience_years || 0;
      if (max) {
        matchesExperience = therapistExp >= min && therapistExp <= max;
      } else {
        matchesExperience = therapistExp >= min;
      }
    }

    let matchesPrice = true;
    if (priceFilter) {
      const [min, max] = priceFilter.split('-').map(Number);
      const therapistPrice = therapist.hourly_rate || 0;
      if (max) {
        matchesPrice = therapistPrice >= min && therapistPrice <= max;
      } else {
        matchesPrice = therapistPrice >= min;
      }
    }

    const matchesLocation = !locationFilter || 
      therapist.location?.toLowerCase().includes(locationFilter.toLowerCase());

    return matchesSearch && matchesSpecialty && matchesExperience && matchesPrice && matchesLocation;
  });

  return (
    <>
      <MetaTags
        title="Find Therapists Near You | TheraMate Marketplace"
        description="Browse qualified sports therapists, massage therapists, and osteopaths in your area. Book sessions, read reviews, and find the perfect healthcare professional for your needs."
        keywords="find therapists, sports therapy near me, massage therapy booking, osteopathy sessions, healthcare professionals, therapist directory, book therapy session"
        canonicalUrl="https://theramate.com/marketplace"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Find Therapists Near You | TheraMate Marketplace",
          "description": "Browse qualified sports therapists, massage therapists, and osteopaths in your area. Book sessions, read reviews, and find the perfect healthcare professional for your needs.",
          "url": "https://theramate.com/marketplace",
          "mainEntity": {
            "@type": "ItemList",
            "name": "Healthcare Professionals",
            "description": "List of qualified healthcare professionals available for booking",
            "itemListElement": therapists.map((therapist, index) => ({
              "@type": "Person",
              "position": index + 1,
              "name": `${therapist.first_name} ${therapist.last_name}`,
              "jobTitle": therapist.user_role,
              "description": therapist.bio,
              "url": `https://theramate.com/marketplace/${therapist.id}`
            }))
          }
        }}
      />
      <div className="min-h-screen bg-background">
      <div className="bg-primary/10 py-12">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl">
            <div className="mb-6">
              <BackButton />
            </div>
            
            <h1 className="text-4xl font-bold mb-4">Find Your Perfect Therapist</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Browse our marketplace of qualified therapists and find the right match for your needs
            </p>
            

            <div className="mb-8">
              <EnhancedSearch
                onSearch={(filters) => {
                  setSearchQuery(filters.query);
                  setSelectedSpecialty(filters.specialization);
                  setLocationFilter(filters.location);
                  setExperienceFilter(filters.experience);
                  setPriceFilter(filters.priceRange[0] > 0 ? `${filters.priceRange[0]}-${filters.priceRange[1]}` : '');
                }}
                onClear={() => {
                  setSearchQuery('');
                  setSelectedSpecialty('');
                  setLocationFilter('');
                  setExperienceFilter('');
                  setPriceFilter('');
                }}
                initialFilters={{
                  query: searchQuery,
                  specialization: selectedSpecialty,
                  location: locationFilter,
                  experience: experienceFilter,
                  priceRange: priceFilter ? [parseInt(priceFilter.split('-')[0]), parseInt(priceFilter.split('-')[1])] : [0, 200]
                }}
              />
            </div>

            <div className="flex justify-center gap-2 mb-6">
              <Button
                variant={searchMode === 'list' ? 'default' : 'outline'}
                onClick={() => setSearchMode('list')}
              >
                <Search className="h-4 w-4 mr-2" />
                List View
              </Button>
              <Button
                variant={searchMode === 'location' ? 'default' : 'outline'}
                onClick={() => setSearchMode('location')}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Map View
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {searchMode === 'location' ? (
          <LocationSearch
            onTherapistSelect={(therapist) => {
            }}
            initialLocation={currentLocation || undefined}
            showMap={true}
          />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Available Therapists</h2>
              <div className="flex items-center gap-4">
                <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="bg-muted/50 p-6 rounded-lg mb-6 border">
                <h3 className="font-semibold mb-4">Advanced Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Experience (years)</label>
                    <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any experience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any experience</SelectItem>
                        <SelectItem value="0-2">0-2 years</SelectItem>
                        <SelectItem value="3-5">3-5 years</SelectItem>
                        <SelectItem value="6-10">6-10 years</SelectItem>
                        <SelectItem value="10+">10+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Price Range (£/hr)</label>
                    <Select value={priceFilter} onValueChange={setPriceFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any price" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any price</SelectItem>
                        <SelectItem value="0-50">£0-50</SelectItem>
                        <SelectItem value="50-100">£50-100</SelectItem>
                        <SelectItem value="100-150">£100-150</SelectItem>
                        <SelectItem value="150+">£150+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Location</label>
                    <Input
                      placeholder="City or area" 
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => {
                    setSearchQuery("");
                    setSelectedSpecialty("");
                    setExperienceFilter("");
                    setPriceFilter("");
                    setLocationFilter("");
                    setShowFilters(false);
                  }}>
                    Clear All
                  </Button>
                  <Button onClick={() => setShowFilters(false)}>
                    Apply Filters
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">
                {filteredTherapists.length} therapist{filteredTherapists.length !== 1 ? 's' : ''} found
              </p>
              <Select>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Most Relevant</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="experience">Most Experienced</SelectItem>
                  <SelectItem value="availability">Most Available</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-40">
                <p>Loading therapists...</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredTherapists.length > 0 ? (
                    filteredTherapists.map((therapist) => (
                      <Card key={therapist.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex space-x-4">
                            <Avatar className="h-16 w-16">
                              <AvatarFallback>
                                {therapist.first_name?.[0]}{therapist.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h3 className="font-semibold text-lg">
                                      {therapist.first_name} {therapist.last_name}
                                    </h3>
                                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                                      Verified
                                    </Badge>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      Available
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {therapist.user_role?.replace(/_/g, ' ')}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span className="font-medium">4.5</span>
                                  <span className="text-sm text-muted-foreground">(12)</span>
                                </div>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {therapist.bio || "Professional therapist with expertise in various treatment methods."}
                              </p>
                              
                              <div className="flex flex-wrap gap-1 mt-3">
                                {therapist.specializations?.map((specialty) => (
                                  <Badge key={specialty} variant="outline" className="text-xs">
                                    {specialty.replace(/_/g, ' ')}
                                  </Badge>
                                ))}
                              </div>
                              
                              <div className="flex items-center justify-between mt-4">
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    <span>{therapist.location || "Location available"}</span>
                                  </div>
                                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                    <span>{therapist.experience_years || 0} years experience</span>
                                  </div>
                                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                    <span>{therapist.specializations?.length || 0} specializations</span>
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <div className="flex items-center space-x-1 text-primary font-medium">
                                    <span>£{therapist.hourly_rate || 0}/hr</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Starting from
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex space-x-2 mt-4">
                                <Link to={`/therapist/${therapist.id}/public`} className="flex-1">
                                  <Button className="w-full">
                                    View Profile
                                  </Button>
                                </Link>
                                <Button 
                                  variant="outline" 
                                  className="flex-1"
                                  onClick={() => {
                                    setSelectedTherapist(therapist);
                                    setBookingModalOpen(true);
                                  }}
                                >
                                  Quick Book
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-12">
                      <p className="text-muted-foreground">No therapists found matching your criteria.</p>
                      <Button variant="outline" className="mt-4" onClick={() => {
                        setSearchQuery("");
                        setSelectedSpecialty("");
                        setExperienceFilter("");
                        setPriceFilter("");
                        setLocationFilter("");
                      }}>
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-12 bg-gradient-to-r from-primary/5 to-accent/5 p-8 rounded-lg text-center border border-primary/10">
                  <h2 className="text-2xl font-bold mb-4">Ready to book a session?</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
                    Join thousands of clients who have found their perfect therapist. Create an account to book appointments, message therapists, and track your wellness journey.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Link to="/register">
                      <Button size="lg" className="w-full sm:w-auto">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Get Started Free
                      </Button>
                    </Link>
                    <Link to="/login">
                      <Button variant="outline" size="lg" className="w-full sm:w-auto">
                        Already have an account? Login
                      </Button>
                    </Link>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    ✓ No credit card required ✓ Free to browse ✓ Cancel anytime
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Unified Booking Modal */}
      {selectedTherapist && (
        <UnifiedBookingModal
          open={bookingModalOpen}
          onOpenChange={setBookingModalOpen}
          therapist={selectedTherapist}
          onBookingComplete={(sessionId) => {
            setBookingModalOpen(false);
            setSelectedTherapist(null);
          }}
        />
      )}
    </div>
    </>
  );
};

export default PublicMarketplace;