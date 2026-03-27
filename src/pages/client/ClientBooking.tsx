import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Star, Clock, Filter } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BookingFlow from "@/components/booking/BookingFlow";

interface Practitioner {
  id: string;
  first_name: string;
  last_name: string;
  user_role: "sports_therapist" | "massage_therapist" | "osteopath";
  location: string;
  bio: string;
  hourly_rate: number;
  specializations: string[];
  average_rating: number;
  total_reviews: number;
}

const ClientBooking: React.FC = () => {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [filteredPractitioners, setFilteredPractitioners] = useState<
    Practitioner[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedPractitioner, setSelectedPractitioner] =
    useState<Practitioner | null>(null);

  useEffect(() => {
    fetchPractitioners();
  }, []);

  useEffect(() => {
    filterPractitioners();
  }, [practitioners, searchTerm, selectedType, selectedLocation]);

  // Deep-link support for "Book" CTA from discovery:
  // /client/ClientBooking?therapistId=<id>
  useEffect(() => {
    if (typeof window === "undefined") return;
    const therapistId = new URLSearchParams(window.location.search).get(
      "therapistId",
    );
    if (!therapistId) return;
    const match = practitioners.find((p) => p.id === therapistId);
    if (match) setSelectedPractitioner(match);
  }, [practitioners]);

  const fetchPractitioners = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          `
          id,
          first_name,
          last_name,
          user_role,
          location,
          bio,
          hourly_rate,
          specializations,
          average_rating,
          total_reviews
        `,
        )
        .in("user_role", ["sports_therapist", "massage_therapist", "osteopath"])
        .eq("is_active", true);

      if (error) throw error;
      setPractitioners(data || []);
    } catch (error) {
      console.error("Error fetching practitioners:", error);
      toast.error("Failed to load practitioners");
    } finally {
      setLoading(false);
    }
  };

  const filterPractitioners = () => {
    let filtered = practitioners;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          `${p.first_name} ${p.last_name}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          p.bio.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.specializations.some((spec) =>
            spec.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
      );
    }

    // Type filter
    if (selectedType !== "all") {
      filtered = filtered.filter((p) => p.user_role === selectedType);
    }

    // Location filter
    if (selectedLocation !== "all") {
      filtered = filtered.filter((p) =>
        p.location?.toLowerCase().includes(selectedLocation.toLowerCase()),
      );
    }

    setFilteredPractitioners(filtered);
  };

  const getRoleDisplayName = (role: string) => {
    return role.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "sports_therapist":
        return "bg-blue-100 text-blue-800";
      case "massage_therapist":
        return "bg-green-100 text-green-800";
      case "osteopath":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderPractitionerCard = (practitioner: Practitioner) => (
    <Card key={practitioner.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {practitioner.first_name} {practitioner.last_name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getRoleColor(practitioner.user_role)}>
                {getRoleDisplayName(practitioner.user_role)}
              </Badge>
              {practitioner.location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {practitioner.location}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">
              £{practitioner.hourly_rate}/hour
            </div>
            {practitioner.average_rating > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{practitioner.average_rating.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  ({practitioner.total_reviews} reviews)
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {practitioner.bio ||
            "Professional therapist ready to help you achieve your health goals."}
        </p>

        {practitioner.specializations.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
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
        )}

        <Button
          onClick={() => setSelectedPractitioner(practitioner)}
          className="w-full"
        >
          Book Session
        </Button>
      </CardContent>
    </Card>
  );

  if (selectedPractitioner) {
    return (
      <BookingFlow
        practitionerId={selectedPractitioner.id}
        practitionerName={`${selectedPractitioner.first_name} ${selectedPractitioner.last_name}`}
        practitionerType={selectedPractitioner.user_role}
        onBookingComplete={(sessionId) => {
          toast.success("Booking created successfully!");
          setSelectedPractitioner(null);
        }}
        onCancel={() => setSelectedPractitioner(null)}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Find Your Perfect Therapist</h1>
        <p className="text-muted-foreground">
          Browse qualified practitioners and book your next session
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, specialization, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sports_therapist">
                  Sports Therapist
                </SelectItem>
                <SelectItem value="massage_therapist">
                  Massage Therapist
                </SelectItem>
                <SelectItem value="osteopath">Osteopath</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedLocation}
              onValueChange={setSelectedLocation}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="london">London</SelectItem>
                <SelectItem value="manchester">Manchester</SelectItem>
                <SelectItem value="birmingham">Birmingham</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPractitioners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPractitioners.map(renderPractitionerCard)}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                No practitioners found
              </h3>
              <p>Try adjusting your search criteria or filters</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      {!loading && filteredPractitioners.length > 0 && (
        <div className="mt-8 text-center text-muted-foreground">
          Showing {filteredPractitioners.length} of {practitioners.length}{" "}
          practitioners
        </div>
      )}
    </div>
  );
};

export default ClientBooking;
