import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MapPin, Star, Clock, Filter, Heart, Calendar, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Therapist {
  id: string;
  user_id: string;
  bio: string;
  location: string;
  hourly_rate: number;
  experience_years: number;
  specializations: string[];
  qualifications: string[];
  is_active: boolean;
  users?: {
    first_name: string;
    last_name: string;
    user_role: string;
  };
}

const FindTherapists = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [radiusRange, setRadiusRange] = useState([25]);
  const [showFilters, setShowFilters] = useState(false);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTherapists();
  }, []);

  const fetchTherapists = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_profiles (
            first_name,
            last_name,
            user_role
          )
        `)
        .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
        .eq('is_active', true)
        .neq('id', user?.id); // Exclude current user

      if (error) throw error;
      setTherapists(data || []);
    } catch (error) {
      console.error('Error fetching therapists:', error);
    } finally {
      setLoading(false);
    }
  };

  // User-friendly specialty mapping
  const specialtyMapping = {
    "All Specialties": "All Specialties",
    "deep_tissue": "Deep Tissue Massage",
    "swedish": "Swedish Massage", 
    "sports_therapy": "Sports Therapy",
    "trigger_point": "Trigger Point Therapy",
    "myofascial_release": "Myofascial Release",
    "hot_stone": "Hot Stone Massage",
    "prenatal": "Prenatal Massage",
    "injury_rehabilitation": "Injury Rehabilitation",
    "performance_training": "Performance Training",
    "osteopathy": "Osteopathy",
    "massage_therapy": "Massage Therapy"
  };

  const specialties = Object.keys(specialtyMapping);

  const filteredTherapists = therapists.filter(therapist => {
    const matchesSearch = searchQuery === "" || 
      `${therapist.users?.first_name} ${therapist.users?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      therapist.specializations?.some(spec => spec.toLowerCase().includes(searchQuery.toLowerCase())) ||
      therapist.location?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSpecialty = selectedSpecialty === "" || selectedSpecialty === "All Specialties" ||
      therapist.specializations?.includes(selectedSpecialty);

    return matchesSearch && matchesSpecialty;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader 
          title="Find Therapists"
          description="Discover licensed massage therapists in your area for professional exchanges"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Exchange", href: "/find-therapists" },
            { label: "Find Therapists" }
          ]}
          backTo="/dashboard"
        />
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-center h-40">
            Loading therapists...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Find Therapists"
        description="Discover licensed massage therapists in your area for professional exchanges"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Exchange", href: "/find-therapists" },
          { label: "Find Therapists" }
        ]}
        backTo="/dashboard"
        actions={
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        }
      />

      <div className="container mx-auto px-6 py-6">
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, specialty, or location..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Specialty" />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialtyMapping[specialty as keyof typeof specialtyMapping]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Search Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Distance</label>
                    <div className="px-3">
                      <Slider
                        value={radiusRange}
                        onValueChange={setRadiusRange}
                        max={50}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>1 mile</span>
                        <span>{radiusRange[0]} miles</span>
                        <span>50 miles</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Availability</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Any time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="tomorrow">Tomorrow</SelectItem>
                        <SelectItem value="week">This week</SelectItem>
                        <SelectItem value="any">Any time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rating</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Any rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 stars only</SelectItem>
                        <SelectItem value="4">4+ stars</SelectItem>
                        <SelectItem value="3">3+ stars</SelectItem>
                        <SelectItem value="any">Any rating</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            Found {filteredTherapists.length} therapists available for exchange
          </p>
          <Select defaultValue="experience">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="experience">Sort by experience</SelectItem>
              <SelectItem value="rating">Sort by rating</SelectItem>
              <SelectItem value="location">Sort by location</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Therapist Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTherapists.length > 0 ? (
            filteredTherapists.map((therapist) => (
              <Card key={therapist.id} className="overflow-hidden transition-[border-color,background-color] duration-200 ease-out">
                <CardContent className="p-6">
                  <div className="flex space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback>
                        {therapist.users?.first_name?.[0]}{therapist.users?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-lg">
                              {therapist.users?.first_name} {therapist.users?.last_name}
                            </h3>
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              Verified
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {therapist.users?.user_role?.replace('_', ' ').toUpperCase()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">4.8</span>
                            <span className="text-sm text-muted-foreground">(0)</span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-2">
                        {therapist.bio || "Professional therapist available for exchanges"}
                      </p>
                      
                      <div className="flex flex-wrap gap-1 mt-3">
                        {therapist.specializations?.map((specialty) => (
                          <Badge key={specialty} variant="outline" className="text-xs">
                            {specialty.replace('_', ' ')}
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
                            <Clock className="h-3 w-3" />
                            <span>{therapist.experience_years || 0} years experience</span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center space-x-1 text-primary font-medium">
                            <CreditCard className="h-4 w-4" />
                            <span className="text-sm text-muted-foreground">Pricing available in booking</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 mt-4">
                        <Button className="flex-1">
                          <Calendar className="h-4 w-4 mr-2" />
                          Request Exchange
                        </Button>
                        <Button variant="outline">
                          <Heart className="h-4 w-4" />
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
              }}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindTherapists;