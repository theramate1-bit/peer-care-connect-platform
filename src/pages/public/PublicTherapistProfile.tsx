import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, MapPin, Calendar as CalendarIcon, Clock, GraduationCap, Award, CheckCircle } from "lucide-react";
import { UnifiedBookingModal } from "@/components/booking/UnifiedBookingModal";

interface Therapist {
  id: string;
  first_name: string;
  last_name: string;
  user_role: string;
  bio: string;
  location: string;
  hourly_rate: number;
  experience_years: number;
  specializations: string[];
  qualifications: string[];
  is_active: boolean;
}

const PublicTherapistProfile = () => {
  const { therapistId } = useParams<{ therapistId: string }>();
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    if (therapistId) {
      fetchTherapist(therapistId);
    }
  }, [therapistId]);

  const fetchTherapist = async (id: string) => {
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
          hourly_rate,
          experience_years,
          specializations,
          qualifications,
          is_active
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setTherapist(data);
    } catch (error) {
      console.error('Error fetching therapist:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading therapist profile...</p>
      </div>
    );
  }

  if (!therapist) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Therapist Not Found</h1>
          <p className="text-muted-foreground mb-6">The therapist profile you're looking for doesn't exist or has been removed.</p>
          <Link to="/marketplace">
            <Button>Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12">
        <Link to="/marketplace" className="inline-flex items-center text-sm mb-6 hover:underline">
          ← Back to Marketplace
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="text-2xl">
                      {therapist.first_name?.[0]}{therapist.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h1 className="text-2xl font-bold">
                          {therapist.first_name} {therapist.last_name}
                        </h1>
                        <p className="text-muted-foreground">
                          {therapist.user_role?.replace(/_/g, ' ')}
                        </p>
                      </div>

                      <div className="flex items-center">
                        <div className="flex items-center mr-4">
                          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 mr-1" />
                          <span className="font-medium">4.8</span>
                          <span className="text-sm text-muted-foreground ml-1">(0 reviews)</span>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          Verified
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      {therapist.specializations?.map((specialty) => (
                        <Badge key={specialty} variant="outline">
                          {specialty.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div className="flex items-center">
                        <MapPin className="h-5 w-5 text-muted-foreground mr-2" />
                        <span>{therapist.location || "Location available upon booking"}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-muted-foreground mr-2" />
                        <span>{therapist.experience_years || 0} years experience</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="about">
              <TabsList className="mb-6">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-4">About Me</h2>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {therapist.bio || "No bio information available."}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Specializations</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {therapist.specializations?.map((specialty) => (
                        <div key={specialty} className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                          <span>{specialty.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="qualifications">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Education & Qualifications</h2>
                    {therapist.qualifications && therapist.qualifications.length > 0 ? (
                      <div className="space-y-4">
                        {therapist.qualifications.map((qualification, index) => (
                          <div key={index} className="flex items-start">
                            <GraduationCap className="h-5 w-5 text-primary mr-2 mt-0.5" />
                            <div>
                              <p className="font-medium">{qualification}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No qualification information available.</p>
                    )}

                    <h2 className="text-xl font-semibold mt-8 mb-4">Certifications</h2>
                    <div className="flex items-center">
                      <Award className="h-5 w-5 text-primary mr-2" />
                      <span>Verified Professional</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews">
                <Card>
                  <CardContent className="p-6 text-center py-12">
                    <h2 className="text-xl font-semibold mb-2">No Reviews Yet</h2>
                    <p className="text-muted-foreground mb-6">
                      This therapist doesn't have any reviews yet.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Booking */}
          <div>
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Book a Session</h2>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-muted-foreground">Session Rate</span>
                  <span className="text-2xl font-bold">£{therapist.hourly_rate || 0}/hr</span>
                </div>

                <div className="space-y-4">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => setBookingModalOpen(true)}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Book Session
                  </Button>
                  
                  <div className="text-center">
                    <span className="text-sm text-muted-foreground">Already have an account?</span>
                    <Link to="/login" className="block mt-1">
                      <Button variant="outline" className="w-full">
                        Login to Book
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-medium mb-2">Why create an account?</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      Book sessions with verified therapists
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      Message therapists directly
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      Manage all your appointments in one place
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      Leave reviews after your sessions
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Unified Booking Modal */}
      {therapist && (
        <UnifiedBookingModal
          open={bookingModalOpen}
          onOpenChange={setBookingModalOpen}
          therapist={therapist}
          onBookingComplete={(sessionId) => {
            setBookingModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default PublicTherapistProfile;
