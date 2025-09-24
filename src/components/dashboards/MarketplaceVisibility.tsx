import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Settings,
  ExternalLink,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useRealtimeSubscription } from '@/hooks/use-realtime';

interface VisibilityStatus {
  isVisible: boolean;
  profileScore: number;
  completionStatus: string;
  verificationStatus: string;
  missingFields: string[];
  lastActive: string;
  profileViews: number;
}

export const MarketplaceVisibility: React.FC = () => {
  const { user } = useAuth();
  const [visibilityStatus, setVisibilityStatus] = useState<VisibilityStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchVisibilityStatus();
    }
  }, [user]);

  // Real-time subscription for profile updates
  useRealtimeSubscription(
    'users',
    `id=eq.${user?.id}`,
    (payload) => {
      console.log('🔄 Real-time marketplace visibility update:', payload);
      if (payload.eventType === 'UPDATE') {
        // Recalculate visibility status when profile is updated
        fetchVisibilityStatus();
      }
    }
  );

  const fetchVisibilityStatus = async () => {
    try {
      setLoading(true);
      
      // Fetch therapist profile
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      console.log('🔍 MarketplaceVisibility - Fetched profile:', profile);
      console.log('🔍 MarketplaceVisibility - Error:', error);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!profile) {
        setVisibilityStatus({
          isVisible: false,
          profileScore: 0,
          completionStatus: 'incomplete',
          verificationStatus: 'not_submitted',
          missingFields: ['Complete your profile setup'],
          lastActive: 'Never',
          profileViews: 0
        });
        return;
      }

      // Calculate missing fields
      const requiredFields = [
        { key: 'bio', label: 'Bio', check: (p: any) => p.bio && p.bio.length > 50 },
        { key: 'specializations', label: 'Specializations', check: (p: any) => p.specializations && p.specializations.length > 0 },
        { key: 'qualification_type', label: 'Qualifications', check: (p: any) => p.qualification_type && p.qualification_type.trim() !== '' },
        { key: 'hourly_rate', label: 'Hourly Rate', check: (p: any) => p.hourly_rate && p.hourly_rate > 0 },
        { key: 'location', label: 'Location', check: (p: any) => p.location && p.location.trim() !== '' },
        { key: 'professional_body', label: 'Professional Body', check: (p: any) => p.professional_body && p.professional_body.trim() !== '' },
        { key: 'registration_number', label: 'Registration Number', check: (p: any) => p.registration_number && p.registration_number.trim() !== '' }
      ];

      const missingFields = requiredFields
        .filter(field => !field.check(profile))
        .map(field => field.label);

      console.log('🔍 MarketplaceVisibility - Missing fields:', missingFields);
      console.log('🔍 MarketplaceVisibility - Profile data:', {
        bio: profile.bio,
        specializations: profile.specializations,
        qualification_type: profile.qualification_type,
        qualification_file_url: profile.qualification_file_url,
        hourly_rate: profile.hourly_rate,
        location: profile.location,
        professional_body: profile.professional_body,
        registration_number: profile.registration_number,
        is_active: profile.is_active
      });

      const isVisible = profile.is_active && missingFields.length === 0;
      
      // Calculate completion percentage
      const totalFields = requiredFields.length;
      const completedFields = totalFields - missingFields.length;
      const completionPercentage = Math.round((completedFields / totalFields) * 100);

      setVisibilityStatus({
        isVisible,
        profileScore: completionPercentage,
        completionStatus: completionPercentage === 100 ? 'complete' : 'incomplete',
        verificationStatus: profile.verification_status || 'pending',
        missingFields,
        lastActive: profile.last_active ? new Date(profile.last_active).toLocaleDateString() : 'Never',
        profileViews: profile.profile_views || 0
      });

    } catch (error) {
      console.error('Error fetching visibility status:', error);
      toast.error('Failed to load visibility status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!visibilityStatus) return <AlertCircle className="h-5 w-5" />;
    
    if (visibilityStatus.isVisible) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (visibilityStatus.missingFields.length === 0) {
      return <Clock className="h-5 w-5 text-yellow-600" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusText = () => {
    if (!visibilityStatus) return 'Loading...';
    
    if (visibilityStatus.isVisible) {
      return 'Visible on Marketplace';
    } else if (visibilityStatus.missingFields.length === 0) {
      return 'Pending Verification';
    } else {
      return 'Profile Incomplete';
    }
  };

  const getStatusColor = () => {
    if (!visibilityStatus) return 'bg-gray-100 text-gray-800';
    
    if (visibilityStatus.isVisible) {
      return 'bg-green-100 text-green-800';
    } else if (visibilityStatus.missingFields.length === 0) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-red-100 text-red-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Marketplace Visibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-muted-foreground">Loading visibility status...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Marketplace Visibility
            <div className="flex items-center gap-1 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live
            </div>
          </CardTitle>
          <CardDescription>
            Your profile visibility status on the marketplace. Updates in real-time.
          </CardDescription>
        </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">{getStatusText()}</span>
          </div>
          <Badge className={getStatusColor()}>
            {visibilityStatus?.completionStatus || 'incomplete'}
          </Badge>
        </div>

        {/* Profile Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Profile Completeness</span>
            <span>{visibilityStatus?.profileScore || 0}%</span>
          </div>
          <Progress value={visibilityStatus?.profileScore || 0} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span>{visibilityStatus?.profileViews || 0} views</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Active {visibilityStatus?.lastActive}</span>
          </div>
        </div>

        {/* Missing Fields */}
        {visibilityStatus?.missingFields && visibilityStatus.missingFields.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-600">Missing Required Fields:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {visibilityStatus.missingFields.map((field, index) => (
                <li key={index} className="flex items-center gap-2">
                  <AlertCircle className="h-3 w-3 text-red-500" />
                  {field}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link to="/profile">
              <Settings className="h-4 w-4 mr-2" />
              Update Profile
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link to="/marketplace">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Marketplace
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
