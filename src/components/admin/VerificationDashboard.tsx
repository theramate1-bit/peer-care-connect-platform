import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Eye, 
  User as UserIcon, 
  Star,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import VerificationBadge from '@/components/profiles/VerificationBadge';

interface TherapistProfile {
  id: string;
  user_id: string;
  bio: string;
  location: string;
  specializations: string[];
  qualifications: string[];
  experience_years: number;
  hourly_rate: number;
  profile_completion_status: string;
  verification_status: string;
  profile_score: number;
  profile_photo_url: string;
  professional_statement: string;
  treatment_philosophy: string;
  continuing_education: any[];
  awards_certifications: any[];
  published_works: any[];
  media_appearances: any[];
  insurance_info: any;
  emergency_contact: any;
  verification_notes: string;
  created_at: string;
  users?: {
    first_name: string;
    last_name: string;
    email: string;
    user_role: string;
  };
}

const VerificationDashboard = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<TherapistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<TherapistProfile | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfiles();
    }
  }, [user]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_profiles (
            first_name,
            last_name,
            email,
            user_role
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (profileId: string, status: 'verified' | 'rejected' | 'under_review') => {
    if (!verificationNotes.trim()) {
      toast.error('Please add verification notes');
      return;
    }

    try {
      setProcessing(true);
      
      const { error } = await supabase
        .from('users')
        .update({
          verification_status: status,
          verification_notes: verificationNotes,
          profile_verified_at: status === 'verified' ? new Date().toISOString() : null,
          profile_verified_by: user?.id
        })
        .eq('id', profileId);

      if (error) throw error;

      toast.success(`Profile ${status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : 'marked for review'}`);
      
      // Reload profiles and reset form
      await loadProfiles();
      setSelectedProfile(null);
      setVerificationNotes('');
    } catch (error) {
      console.error('Error updating verification status:', error);
      toast.error('Failed to update verification status');
    } finally {
      setProcessing(false);
    }
  };

  const getProfilesByStatus = (status: string) => {
    return profiles.filter(profile => profile.verification_status === status);
  };

  const getStatusCount = (status: string) => {
    return getProfilesByStatus(status).length;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderProfileCard = (profile: TherapistProfile) => (
    <Card key={profile.id} className="transition-[border-color,background-color] duration-200 ease-out">
      <CardContent className="pt-4">
        <div className="flex items-start space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.profile_photo_url} />
            <AvatarFallback className="text-lg">
              {profile.users?.first_name?.[0]}{profile.users?.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  {profile.users?.first_name} {profile.users?.last_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {profile.users?.email} • {profile.users?.user_role?.replace('_', ' ')}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <VerificationBadge status={profile.verification_status as any} />
                <Badge variant="outline">
                  {profile.profile_completion_status}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <MapPin className="h-3 w-3" />
                <span>{profile.location || 'No location'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3" />
                <span>{profile.profile_score || 0}% complete</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(profile.created_at)}</span>
              </div>
            </div>
            
            {profile.bio && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {profile.bio}
              </p>
            )}
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedProfile(profile)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Review
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderProfileDetail = () => {
    if (!selectedProfile) return null;

    return (
      <Card className="sticky top-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Review Profile</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedProfile(null)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            {selectedProfile.users?.first_name} {selectedProfile.users?.last_name}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verification_notes">Verification Notes</Label>
            <Textarea
              id="verification_notes"
              placeholder="Add notes about this profile verification..."
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              rows={4}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleVerification(selectedProfile.id, 'under_review')}
              disabled={processing}
              className="flex items-center space-x-2"
            >
              <Clock className="h-4 w-4" />
              <span>Review</span>
            </Button>
            
            <Button
              size="sm"
              variant="default"
              onClick={() => handleVerification(selectedProfile.id, 'verified')}
              disabled={processing}
              className="flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Verify</span>
            </Button>
            
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleVerification(selectedProfile.id, 'rejected')}
              disabled={processing}
              className="flex items-center space-x-2"
            >
              <XCircle className="h-4 w-4" />
              <span>Reject</span>
            </Button>
          </div>
          
          {selectedProfile.verification_notes && (
            <div className="space-y-2">
              <Label>Previous Notes</Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                {selectedProfile.verification_notes}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Profile Verification Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Review and verify practitioner profiles to maintain platform quality
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{getStatusCount('pending')}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{getStatusCount('under_review')}</p>
                  <p className="text-sm text-muted-foreground">Under Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{getStatusCount('verified')}</p>
                  <p className="text-sm text-muted-foreground">Verified</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{getStatusCount('rejected')}</p>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile List */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pending">
                  Pending ({getStatusCount('pending')})
                </TabsTrigger>
                <TabsTrigger value="under_review">
                  Review ({getStatusCount('under_review')})
                </TabsTrigger>
                <TabsTrigger value="verified">
                  Verified ({getStatusCount('verified')})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({getStatusCount('rejected')})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                {getProfilesByStatus('pending').map(renderProfileCard)}
                {getStatusCount('pending') === 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">No pending profiles</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="under_review" className="space-y-4">
                {getProfilesByStatus('under_review').map(renderProfileCard)}
                {getStatusCount('under_review') === 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">No profiles under review</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="verified" className="space-y-4">
                {getProfilesByStatus('verified').map(renderProfileCard)}
                {getStatusCount('verified') === 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">No verified profiles</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="rejected" className="space-y-4">
                {getProfilesByStatus('rejected').map(renderProfileCard)}
                {getStatusCount('rejected') === 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">No rejected profiles</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Profile Detail Sidebar */}
          <div className="lg:col-span-1">
            {renderProfileDetail()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationDashboard;



