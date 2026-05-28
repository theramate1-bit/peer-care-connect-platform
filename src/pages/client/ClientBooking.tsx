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
import { Search, MapPin, Star, Filter } from "lucide-react";
import { toast } from "sonner";
import BookingFlow from "@/components/booking/BookingFlow";
import { HybridBookingChooser } from "@/components/marketplace/HybridBookingChooser";
import { MobileBookingRequestFlow } from "@/components/marketplace/MobileBookingRequestFlow";
import { canBookClinic, canRequestMobile } from "@/lib/booking-flow-type";
import {
  fetchMarketplacePractitioners,
  type MarketplacePractitioner,
} from "@/lib/marketplacePractitioners";

const ClientBooking: React.FC = () => {
  const [practitioners, setPractitioners] = useState<MarketplacePractitioner[]>(
    [],
  );
  const [filteredPractitioners, setFilteredPractitioners] = useState<
    MarketplacePractitioner[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedPractitioner, setSelectedPractitioner] =
    useState<MarketplacePractitioner | null>(null);
  const [isGuestMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("guest") === "1";
  });
  const [flowMode, setFlowMode] = useState<"clinic" | "mobile" | null>(() => {
    if (typeof window === "undefined") return null;
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (mode === "mobile") return "mobile";
    if (mode === "clinic") return "clinic";
    return null;
  });

  useEffect(() => {
    fetchPractitioners();
  }, []);

  useEffect(() => {
    filterPractitioners();
  }, [practitioners, searchTerm, selectedType, selectedLocation]);

  // Deep-link: /client/ClientBooking?therapistId=<id>&mode=mobile|clinic&guest=1
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const therapistId = params.get("therapistId");
    if (!therapistId) return;
    const match = practitioners.find((p) => p.id === therapistId);
    if (match) setSelectedPractitioner(match);
    const mode = params.get("mode");
    if (mode === "mobile" || mode === "clinic") setFlowMode(mode);
  }, [practitioners]);

  const fetchPractitioners = async () => {
    try {
      const { data, error } = await fetchMarketplacePractitioners();
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
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((p) => {
        const specs = p.specializations ?? [];
        const bio = (p.bio ?? "").toLowerCase();
        return (
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
          bio.includes(q) ||
          specs.some((spec) => spec.toLowerCase().includes(q))
        );
      });
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

  const priceLabel = (p: MarketplacePractitioner) => {
    if (p.from_price != null) return `From £${p.from_price.toFixed(0)}`;
    if (p.hourly_rate != null) return `£${p.hourly_rate}/hr`;
    return "—";
  };

  const renderPractitionerCard = (practitioner: MarketplacePractitioner) => (
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
              {priceLabel(practitioner)}
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
          {practitioner.bio?.trim() ||
            "Professional therapist ready to help you achieve your health goals."}
        </p>

        {(practitioner.specializations ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {(practitioner.specializations ?? []).slice(0, 3).map((spec) => (
              <Badge key={spec} variant="outline" className="text-xs">
                {spec}
              </Badge>
            ))}
            {(practitioner.specializations ?? []).length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{(practitioner.specializations ?? []).length - 3} more
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
    const practitionerName = `${selectedPractitioner.first_name} ${selectedPractitioner.last_name}`;
    const clinicOk = canBookClinic(selectedPractitioner);
    const mobileOk = canRequestMobile(selectedPractitioner);

    if (!clinicOk && !mobileOk) {
      return (
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <p className="text-muted-foreground">
                This practitioner is not available for online booking yet.
              </p>
              <Button onClick={() => setSelectedPractitioner(null)}>
                Back to list
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!flowMode && clinicOk && mobileOk) {
      return (
        <HybridBookingChooser
          practitionerName={practitionerName}
          onChooseClinic={() => setFlowMode("clinic")}
          onChooseMobile={() => setFlowMode("mobile")}
          onBack={() => {
            setSelectedPractitioner(null);
            setFlowMode(null);
          }}
        />
      );
    }

    const effectiveMode =
      flowMode ?? (mobileOk && !clinicOk ? "mobile" : "clinic");

    if (effectiveMode === "mobile") {
      if (!mobileOk) {
        return (
          <div className="container mx-auto px-4 py-8 max-w-lg">
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <p className="text-muted-foreground">
                  Mobile visits are not available for this practitioner.
                </p>
                {clinicOk ? (
                  <Button onClick={() => setFlowMode("clinic")}>
                    Book at clinic instead
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedPractitioner(null);
                    setFlowMode(null);
                  }}
                >
                  Back
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      }
      return (
        <MobileBookingRequestFlow
          embedded
          practitioner={{
            id: selectedPractitioner.id,
            first_name: selectedPractitioner.first_name,
            last_name: selectedPractitioner.last_name,
            therapist_type: selectedPractitioner.therapist_type,
            mobile_service_radius_km:
              selectedPractitioner.mobile_service_radius_km,
            base_latitude: selectedPractitioner.base_latitude,
            base_longitude: selectedPractitioner.base_longitude,
            products: selectedPractitioner.products,
          }}
          guestMode={isGuestMode}
          onCancel={() => {
            setSelectedPractitioner(null);
            setFlowMode(null);
          }}
        />
      );
    }

    if (!clinicOk) {
      return (
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <p className="text-muted-foreground">
                Clinic booking is not available. Try requesting a mobile visit
                from discovery.
              </p>
              <Button
                onClick={() => {
                  setFlowMode("mobile");
                }}
              >
                Request mobile visit
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSelectedPractitioner(null)}
              >
                Back
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <BookingFlow
        practitionerId={selectedPractitioner.id}
        practitionerName={practitionerName}
        practitionerType={
          selectedPractitioner.user_role as
            | "sports_therapist"
            | "massage_therapist"
            | "osteopath"
        }
        acceptInPersonPayment={selectedPractitioner.accept_in_person_payment}
        guestMode={isGuestMode}
        onBookingComplete={() => {
          toast.success("Booking created successfully!");
          setSelectedPractitioner(null);
          setFlowMode(null);
        }}
        onCancel={() => {
          setSelectedPractitioner(null);
          setFlowMode(null);
        }}
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
