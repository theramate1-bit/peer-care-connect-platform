import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Star, 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  Globe, 
  Award, 
  GraduationCap, 
  FileText, 
  Video,
  Image,
  Shield,
  Heart,
  Calendar,
  MessageCircle,
  ExternalLink,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BookingFlow } from '@/components/marketplace/BookingFlow';
import { Analytics } from '@/lib/analytics';
import { ProfessionSpecificProfile } from '@/components/practitioner/ProfessionSpecificProfile';
import { PractitionerRatings } from '@/components/practitioner/PractitionerRatings';
import { CPDCourses } from '@/components/practitioner/CPDCourses';
import { useNavigate } from 'react-router-dom';

interface EnhancedTherapistProfile {
  id: string;
  user_id: string;
  bio: string;
  location: string;
  specializations: string[];
  qualifications: string[];
  experience_years: number;
  hourly_rate: number;
  is_active: boolean;
  profile_completion_status: string;
  verification_status: string;
  profile_score: number;
  response_time_hours: number;
  total_sessions: number;
  average_rating: number;
  total_reviews: number;
  profile_views: number;
  last_active: string;
  languages: string[];
  insurance_info: any;
  emergency_contact: any;
  profile_photo_url: string;
  cover_photo_url: string;
  portfolio_photos: string[];
  video_introduction_url: string;
  professional_statement: string;
  treatment_philosophy: string;
  continuing_education: any[];
  awards_certifications: any[];
  published_works: any[];
  media_appearances: any[];
  profile_verified_at: string;
  profile_verified_by: string;
  verification_notes: string;
  users?: {
    first_name: string;
    last_name: string;
    user_role: string;
    professional_body?: string;
    membership_number?: string;
    registration_number?: string;
    qualification_type?: string;
    qualification_expiry?: string;
    itmmif_status?: boolean;
    atmmif_status?: boolean;
    pitch_side_trauma?: boolean;
    goc_registration?: boolean;
    cnhc_registration?: boolean;
  };
}

interface ProfileViewerProps {
  therapistId: string;
}

const ProfileViewer = ({ therapistId }: ProfileViewerProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<EnhancedTherapistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [ratings, setRatings] = useState<any[]>([]);
  const [cpdCourses, setCpdCourses] = useState<any[]>([]);
  const [cpdEnrollments, setCpdEnrollments] = useState<any[]>([]);

  useEffect(() => {
    if (therapistId) {
      loadProfile();
      checkFavoriteStatus();
      loadRatings();
      loadCpdData();
    }
  }, [therapistId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_profiles (
            first_name,
            last_name,
            user_role,
            professional_body,
            membership_number,
            registration_number,
            qualification_type,
            qualification_expiry,
            itmmif_status,
            atmmif_status,
            pitch_side_trauma,
            goc_registration,
            cnhc_registration
          )
        `)
        .eq('user_id', therapistId)
        .single();

      if (error) throw error;
      // Track profile view
      await Analytics.trackEvent('profile_view', { practitionerId: therapistId });
      
      setProfile(data);
      
      // Increment profile views
      if (data) {
        await supabase
          .from('users')
          .update({ profile_views: (data.profile_views || 0) + 1 })
          .eq('id', therapistId);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('practitioner_ratings')
        .select('*')
        .eq('practitioner_id', therapistId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRatings(data || []);
    } catch (error) {
      console.error('Error loading ratings:', error);
    }
  };

  const loadCpdData = async () => {
    try {
      // Load CPD courses
      const { data: courses, error: coursesError } = await supabase
        .from('cpd_courses')
        .select('*')
        .eq('status', 'published')
        .order('start_date', { ascending: true });
      
      if (coursesError) throw coursesError;
      setCpdCourses(courses || []);

      // Load CPD enrollments for this practitioner
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('cpd_enrollments')
        .select('*')
        .eq('practitioner_id', therapistId);
      
      if (enrollmentsError) throw enrollmentsError;
      setCpdEnrollments(enrollments || []);
    } catch (error) {
      console.error('Error loading CPD data:', error);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('client_favorites')
        .select('*')
        .eq('client_id', user.id)
        .eq('practitioner_id', therapistId)
        .single();
      
      setIsFavorite(!!data);
    } catch (error) {
      // Not a favorite
    }
  };

  const toggleFavorite = async () => {
    if (!user) return;
    
    try {
      if (isFavorite) {
        await supabase
          .from('client_favorites')
          .delete()
          .eq('client_id', user.id)
          .eq('practitioner_id', therapistId);
      } else {
        await supabase
          .from('client_favorites')
          .insert({
            client_id: user.id,
            practitioner_id: therapistId
          });
      }
      
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const getVerificationBadge = () => {
    if (!profile) return null;
    
    switch (profile.verification_status) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case 'under_review':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Under Review
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Verification Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending Verification
          </Badge>
        );
    }
  };

  const getProfileCompletionBadge = () => {
    if (!profile) return null;
    
    switch (profile.profile_completion_status) {
      case 'complete':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Complete Profile
          </Badge>
        );
      case 'basic':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Basic Profile
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            Incomplete Profile
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return '1 day ago';
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-6 max-w-6xl">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Profile not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const practitioner = {
    user_id: profile.user_id,
    hourly_rate: profile.hourly_rate,
    specializations: profile.specializations,
    experience_years: profile.experience_years
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Cover Photo */}
        {profile.cover_photo_url && (
          <div className="relative h-48 md:h-64 rounded-lg overflow-hidden mb-6">
            <img
              src={profile.cover_photo_url}
              alt="Cover"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20"></div>
          </div>
        )}

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.profile_photo_url} />
                <AvatarFallback className="text-2xl">
                  {profile.users?.first_name?.[0]}{profile.users?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-bold">
                    {profile.users?.first_name} {profile.users?.last_name}
                  </h1>
                  {getVerificationBadge()}
                  {getProfileCompletionBadge()}
                </div>
                
                <p className="text-xl text-muted-foreground">
                  {profile.users?.user_role?.replace('_', ' ').toUpperCase()}
                </p>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.location || 'Location not specified'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{profile.experience_years || 0} years experience</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{profile.average_rating?.toFixed(1) || 'No ratings'}</span>
                    <span>({profile.total_reviews || 0} reviews)</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    £{profile.hourly_rate || 0}/hr
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {profile.response_time_hours ? `Responds within ${profile.response_time_hours}h` : 'Response time not specified'}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button onClick={() => { Analytics.trackEvent('profile_book_click', { practitionerId: therapistId }); setShowBookingFlow(true); }}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Session
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const url = `${window.location.origin}/profiles/view?practitioner=${profile.user_id}`;
                      navigator.clipboard.writeText(url);
                      Analytics.trackEvent('profile_share', { practitionerId: therapistId });
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Share Profile
                  </Button>
                  <Button
                    variant={isFavorite ? "default" : "outline"}
                    onClick={toggleFavorite}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/messages?user=${profile.user_id}`)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="credentials">Credentials</TabsTrigger>
                <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Professional Statement */}
                {profile.professional_statement && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Professional Statement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {profile.professional_statement}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Treatment Philosophy */}
                {profile.treatment_philosophy && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Treatment Philosophy</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {profile.treatment_philosophy}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Bio */}
                {profile.bio && (
                  <Card>
                    <CardHeader>
                      <CardTitle>About</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {profile.bio}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Specializations */}
                {profile.specializations && profile.specializations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Specializations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {profile.specializations.map((spec, index) => (
                          <Badge key={index} variant="secondary">
                            {spec.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Languages */}
                {profile.languages && profile.languages.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Languages Spoken</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {profile.languages.map((lang, index) => (
                          <Badge key={index} variant="outline">
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="credentials" className="space-y-6">
                {/* Continuing Education */}
                {profile.continuing_education && profile.continuing_education.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <GraduationCap className="h-5 w-5" />
                        <span>Continuing Education</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {profile.continuing_education.map((course, index) => (
                          <div key={index} className="border-l-4 border-primary pl-4">
                            <h4 className="font-semibold">{course.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {course.institution} • {formatDate(course.date)} • {course.hours} hours
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Awards & Certifications */}
                {profile.awards_certifications && profile.awards_certifications.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Award className="h-5 w-5" />
                        <span>Awards & Certifications</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {profile.awards_certifications.map((award, index) => (
                          <div key={index} className="border-l-4 border-yellow-500 pl-4">
                            <h4 className="font-semibold">{award.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {award.issuing_organization} • {formatDate(award.date)}
                            </p>
                            {award.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {award.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Published Works */}
                {profile.published_works && profile.published_works.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="h-5 w-5" />
                        <span>Published Works</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {profile.published_works.map((work, index) => (
                          <div key={index} className="border-l-4 border-blue-500 pl-4">
                            <h4 className="font-semibold">{work.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {work.publication} • {formatDate(work.date)}
                            </p>
                            {work.url && (
                              <Button variant="link" size="sm" className="p-0 h-auto">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View Publication
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Media Appearances */}
                {profile.media_appearances && profile.media_appearances.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Video className="h-5 w-5" />
                        <span>Media Appearances</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {profile.media_appearances.map((appearance, index) => (
                          <div key={index} className="border-l-4 border-purple-500 pl-4">
                            <h4 className="font-semibold">{appearance.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {appearance.platform} • {formatDate(appearance.date)}
                            </p>
                            {appearance.url && (
                              <Button variant="link" size="sm" className="p-0 h-auto">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Watch
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="portfolio" className="space-y-6">
                {/* Video Introduction */}
                {profile.video_introduction_url && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Video className="h-5 w-5" />
                        <span>Video Introduction</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                        <Button variant="outline" size="lg">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Watch Video
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Portfolio Photos */}
                {profile.portfolio_photos && profile.portfolio_photos.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Image className="h-5 w-5" />
                        <span>Portfolio</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {profile.portfolio_photos.map((photo, index) => (
                          <div key={index} className="aspect-square rounded-lg overflow-hidden">
                            <img
                              src={photo}
                              alt={`Portfolio ${index + 1}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="reviews" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Reviews</CardTitle>
                    <CardDescription>
                      {profile.total_reviews || 0} reviews • Average rating: {profile.average_rating?.toFixed(1) || 'No ratings'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>No reviews yet</p>
                      <p className="text-sm">Be the first to leave a review after your session</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Profile Completion</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={profile.profile_score || 0} className="w-20" />
                    <span className="text-sm font-medium">{profile.profile_score || 0}%</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Sessions Completed</span>
                  <span className="font-medium">{profile.total_sessions || 0}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Profile Views</span>
                  <span className="font-medium">{profile.profile_views || 0}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Last Active</span>
                  <span className="text-sm">{formatTimeAgo(profile.last_active)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.phone}</span>
                  </div>
                )}
                
                {profile.website && (
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Button variant="link" size="sm" className="p-0 h-auto">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Visit Website
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Insurance & Safety */}
            {profile.insurance_info && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Insurance & Safety</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Professional Insurance</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Emergency Contact</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Profession-Specific Profile */}
            {profile.users && (
              <ProfessionSpecificProfile practitioner={profile.users} />
            )}

            {/* Practitioner Ratings */}
            <PractitionerRatings
              practitionerId={therapistId}
              ratings={ratings}
              averageRating={profile.average_rating || 0}
              totalRatings={profile.total_reviews || 0}
            />

            {/* CPD Courses */}
            <CPDCourses
              courses={cpdCourses}
              enrollments={cpdEnrollments}
            />
          </div>
        </div>

        {/* Booking Flow Modal */}
        {showBookingFlow && (
          <BookingFlow
            open={showBookingFlow}
            onOpenChange={setShowBookingFlow}
            practitioner={practitioner}
          />
        )}
      </div>
    </div>
  );
};

export default ProfileViewer;
