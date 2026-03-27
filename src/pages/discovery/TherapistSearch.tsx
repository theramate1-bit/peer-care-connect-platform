import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Filter,
  MapPin,
  Star,
  Clock,
  DollarSign,
  Users,
  Award,
  Calendar,
  Phone,
  Mail,
  ExternalLink,
  Heart,
  MessageCircle,
} from "lucide-react";
import { formatCurrency } from "@/config/payments";

interface Therapist {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string;
  professional_statement?: string;
  specializations: string[];
  average_rating: number;
  total_reviews: number;
  hourly_rate: number;
  location: string;
  verification_status: string;
  profile_completion_score: number;
  therapy_types: string[];
  availability: string[];
  languages: string[];
  experience_years: number;
  qualifications: string[];
  certifications: string[];
}

interface SearchFilters {
  therapyType: string;
  location: string;
  priceRange: string;
  rating: string;
  availability: string;
  gender: string;
  experience: string;
  verifiedOnly: boolean;
}

const TherapistSearch: React.FC = () => {
  const { toast } = useToast();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    therapyType: "",
    location: "",
    priceRange: "",
    rating: "",
    availability: "",
    gender: "",
    experience: "",
    verifiedOnly: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    loadTherapists();
  }, [filters]);

  const loadTherapists = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("users")
        .select("*")
        .in("user_role", ["sports_therapist", "massage_therapist", "osteopath"])
        .eq("is_active", true);

      // Apply filters
      if (filters.therapyType) {
        query = query.contains("specializations", [filters.therapyType]);
      }
      if (filters.location) {
        query = query.ilike("location", `%${filters.location}%`);
      }
      if (filters.verifiedOnly) {
        query = query.eq("verification_status", "verified");
      }
      if (filters.experience) {
        const minExperience = parseInt(filters.experience);
        query = query.gte("experience_years", minExperience);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Apply price range filter and calculate ratings
      let filteredData = data || [];
      if (filters.priceRange) {
        const [min, max] = filters.priceRange.split("-").map(Number);
        filteredData = filteredData.filter((therapist) => {
          if (max) {
            return therapist.hourly_rate >= min && therapist.hourly_rate <= max;
          }
          return therapist.hourly_rate >= min;
        });
      }

      // Calculate average ratings for each therapist
      const therapistsWithRatings = await Promise.all(
        filteredData.map(async (therapist) => {
          const { data: reviews } = await supabase
            .from("reviews")
            .select("overall_rating")
            .eq("therapist_id", therapist.id)
            .eq("review_status", "published");

          const averageRating = reviews?.length
            ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) /
              reviews.length
            : 0;

          return {
            ...therapist,
            average_rating: averageRating,
            total_reviews: reviews?.length || 0,
          };
        }),
      );

      // Apply rating filter
      if (filters.rating) {
        const minRating = parseFloat(filters.rating);
        filteredData = therapistsWithRatings.filter(
          (therapist) => therapist.average_rating >= minRating,
        );
      } else {
        filteredData = therapistsWithRatings;
      }

      setTherapists(filteredData);
    } catch (error) {
      console.error("Error loading therapists:", error);
      toast({
        title: "Error",
        description: "Failed to load therapists. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      therapyType: "",
      location: "",
      priceRange: "",
      rating: "",
      availability: "",
      gender: "",
      experience: "",
      verifiedOnly: false,
    });
  };

  const toggleFavorite = (therapistId: string) => {
    setFavorites((prev) =>
      prev.includes(therapistId)
        ? prev.filter((id) => id !== therapistId)
        : [...prev, therapistId],
    );
  };

  const filteredTherapists = therapists.filter((therapist) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name =
        `${therapist.first_name} ${therapist.last_name}`.toLowerCase();
      const specializations = therapist.specializations.join(" ").toLowerCase();
      const location = therapist.location.toLowerCase();

      if (
        !name.includes(query) &&
        !specializations.includes(query) &&
        !location.includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? "fill-yellow-400 text-yellow-400"
            : "text-gray-300"
        }`}
      />
    ));
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-100 text-green-800">✓ Verified</Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">⏳ Pending</Badge>
        );
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">✗ Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Find Your Perfect Therapist
          </h1>
          <p className="text-gray-600">
            Discover qualified professionals who match your needs and
            preferences
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, specialization, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            <Button onClick={clearFilters} variant="ghost">
              Clear All
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Therapy Type</Label>
                <Select
                  value={filters.therapyType}
                  onValueChange={(value) =>
                    handleFilterChange("therapyType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    <SelectItem value="sports_therapy">
                      Sports Therapy
                    </SelectItem>
                    <SelectItem value="massage_therapy">
                      Massage Therapy
                    </SelectItem>
                    <SelectItem value="osteopathy">Osteopathy</SelectItem>
                    <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                    <SelectItem value="counselling">Counselling</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="City or area"
                  value={filters.location}
                  onChange={(e) =>
                    handleFilterChange("location", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Price Range</Label>
                <Select
                  value={filters.priceRange}
                  onValueChange={(value) =>
                    handleFilterChange("priceRange", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any price</SelectItem>
                    <SelectItem value="0-50">Under £50</SelectItem>
                    <SelectItem value="50-100">£50-100</SelectItem>
                    <SelectItem value="100-150">£100-150</SelectItem>
                    <SelectItem value="150-200">£150-200</SelectItem>
                    <SelectItem value="200-999">£200+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Minimum Rating</Label>
                <Select
                  value={filters.rating}
                  onValueChange={(value) => handleFilterChange("rating", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any rating</SelectItem>
                    <SelectItem value="4">4+ stars</SelectItem>
                    <SelectItem value="4.5">4.5+ stars</SelectItem>
                    <SelectItem value="5">5 stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Experience</Label>
                <Select
                  value={filters.experience}
                  onValueChange={(value) =>
                    handleFilterChange("experience", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any experience</SelectItem>
                    <SelectItem value="1">1+ years</SelectItem>
                    <SelectItem value="3">3+ years</SelectItem>
                    <SelectItem value="5">5+ years</SelectItem>
                    <SelectItem value="10">10+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Availability</Label>
                <Select
                  value={filters.availability}
                  onValueChange={(value) =>
                    handleFilterChange("availability", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any time</SelectItem>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                    <SelectItem value="weekend">Weekend</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={filters.gender}
                  onValueChange={(value) => handleFilterChange("gender", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any gender</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non_binary">Non-binary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="verifiedOnly"
                  checked={filters.verifiedOnly}
                  onCheckedChange={(checked) =>
                    handleFilterChange("verifiedOnly", checked)
                  }
                />
                <Label htmlFor="verifiedOnly">Verified therapists only</Label>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {loading
              ? "Loading..."
              : `Found ${filteredTherapists.length} therapist${filteredTherapists.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Therapists Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTherapists.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Users className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No therapists found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search criteria or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTherapists.map((therapist) => (
              <Card
                key={therapist.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        {therapist.profile_photo_url ? (
                          <img
                            src={therapist.profile_photo_url}
                            alt={`${therapist.first_name} ${therapist.last_name}`}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-500 text-lg font-medium">
                            {therapist.first_name[0]}
                            {therapist.last_name[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {therapist.first_name} {therapist.last_name}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          {getVerificationBadge(therapist.verification_status)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(therapist.id)}
                      className={`p-2 ${
                        favorites.includes(therapist.id)
                          ? "text-red-500"
                          : "text-gray-400"
                      }`}
                    >
                      <Heart
                        className={`h-4 w-4 ${favorites.includes(therapist.id) ? "fill-current" : ""}`}
                      />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Rating */}
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      {getRatingStars(therapist.average_rating)}
                    </div>
                    <span className="text-sm text-gray-600">
                      {therapist.average_rating.toFixed(1)} (
                      {therapist.total_reviews} reviews)
                    </span>
                  </div>

                  {/* Specializations */}
                  <div className="flex flex-wrap gap-1">
                    {therapist.specializations
                      .slice(0, 3)
                      .map((spec, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {spec}
                        </Badge>
                      ))}
                    {therapist.specializations.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{therapist.specializations.length - 3} more
                      </Badge>
                    )}
                  </div>

                  {/* Bio */}
                  {therapist.bio && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {therapist.bio}
                    </p>
                  )}

                  {/* Key Info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{therapist.location}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{therapist.experience_years} years</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <DollarSign className="h-4 w-4" />
                      <span>
                        {formatCurrency(therapist.hourly_rate * 100)}/hr
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Award className="h-4 w-4" />
                      <span>
                        {therapist.qualifications.length} qualifications
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    {(() => {
                      const therapyTypes = (therapist.therapy_types || []).map(
                        (t) => t.toLowerCase(),
                      );
                      // "Hybrid" practitioners are those that support BOTH modes:
                      // - clinic (in-person)
                      // - mobile (request)
                      const isHybrid =
                        therapyTypes.includes("clinic") &&
                        therapyTypes.includes("mobile");

                      if (isHybrid) {
                        return (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() =>
                                (window.location.href = `/client/ClientBooking?therapistId=${therapist.id}`)
                              }
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Book
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() =>
                                (window.location.href = `/messages?therapist=${therapist.id}`)
                              }
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Request
                            </Button>
                          </>
                        );
                      }

                      return (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() =>
                              (window.location.href = `/therapist/${therapist.id}`)
                            }
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Profile
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() =>
                              (window.location.href = `/messages?therapist=${therapist.id}`)
                            }
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Message
                          </Button>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TherapistSearch;
