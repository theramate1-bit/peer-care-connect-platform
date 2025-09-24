import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Star, 
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  X,
  Heart,
  Activity,
  Bone,
  MessageSquare,
  Download,
  Share,
  Target
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { RescheduleModal } from './RescheduleModal';

interface Session {
  id: string;
  session_date: string;
  session_time: string;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  session_type: string;
  focus_area: string;
  preparation_notes?: string;
  what_to_bring?: string[];
  location?: string;
  therapist_id: string;
  therapist: {
    id: string;
    first_name: string;
    last_name: string;
    user_role: string;
    bio?: string;
    specialties?: string[];
    rating?: number;
    review_count?: number;
    phone?: string;
    email?: string;
    profile_image?: string;
  };
}

interface SessionDetailViewProps {
  sessionId: string;
  onBack?: () => void;
  className?: string;
}

export const SessionDetailView: React.FC<SessionDetailViewProps> = ({
  sessionId,
  onBack,
  className
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      
      const { data: sessionData, error } = await supabase
        .from('client_sessions')
        .select(`
          *,
          therapist:therapist_id (
            id,
            first_name,
            last_name,
            user_role,
            bio,
            specialties,
            rating,
            review_count,
            phone,
            email,
            profile_image
          )
        `)
        .eq('id', sessionId)
        .eq('client_id', user?.id)
        .single();

      if (error) throw error;
      setSession(sessionData);
    } catch (error) {
      console.error('Error fetching session details:', error);
      toast({
        title: "Error",
        description: "Failed to load session details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = () => {
    setShowRescheduleModal(true);
  };

  const handleRescheduleSuccess = () => {
    fetchSessionDetails(); // Refresh session data
  };

  const handleCancel = async () => {
    try {
      setActionLoading(true);
      
      const { error } = await supabase
        .from('client_sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Session Cancelled",
        description: "Your session has been cancelled"
      });
      
      // Refresh session data
      fetchSessionDetails();
    } catch (error) {
      console.error('Error cancelling session:', error);
      toast({
        title: "Error",
        description: "Failed to cancel session",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'sports_therapist':
        return <Activity className="h-5 w-5 text-blue-600" />;
      case 'massage_therapist':
        return <Heart className="h-5 w-5 text-pink-600" />;
      case 'osteopath':
        return <Bone className="h-5 w-5 text-orange-600" />;
      default:
        return <User className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'sports_therapist':
        return 'Sports Therapist';
      case 'massage_therapist':
        return 'Massage Therapist';
      case 'osteopath':
        return 'Osteopath';
      default:
        return 'Therapist';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">Session Not Found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            The session you're looking for doesn't exist or you don't have access to it.
          </p>
          {onBack && (
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">Session Details</h1>
            <p className="text-muted-foreground">
              {formatDate(session.session_date)} at {formatTime(session.session_time)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(session.status)}>
            {session.status.replace('-', ' ').toUpperCase()}
          </Badge>
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Session Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Session Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Date</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(session.session_date)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Time</div>
                    <div className="text-sm text-muted-foreground">
                      {formatTime(session.session_time)} ({session.duration} minutes)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Session Type</div>
                    <div className="text-sm text-muted-foreground">
                      {session.session_type}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Focus Area</div>
                    <div className="text-sm text-muted-foreground">
                      {session.focus_area}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preparation Instructions */}
          {session.preparation_notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Preparation Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {session.preparation_notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* What to Bring */}
          {session.what_to_bring && session.what_to_bring.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  What to Bring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {session.what_to_bring.map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Location */}
          {session.location && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3">{session.location}</p>
                <Button variant="outline" size="sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Therapist Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getRoleIcon(session.therapist.user_role)}
                Your Therapist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  {session.therapist.profile_image ? (
                    <img 
                      src={session.therapist.profile_image} 
                      alt={`${session.therapist.first_name} ${session.therapist.last_name}`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div>
                  <div className="font-medium">
                    {session.therapist.first_name} {session.therapist.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getRoleDisplayName(session.therapist.user_role)}
                  </div>
                </div>
              </div>

              {session.therapist.rating && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">
                    {session.therapist.rating}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({session.therapist.review_count} reviews)
                  </span>
                </div>
              )}

              {session.therapist.specialties && session.therapist.specialties.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Specialties</div>
                  <div className="flex flex-wrap gap-1">
                    {session.therapist.specialties.map((specialty, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                {session.therapist.phone && (
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Therapist
                  </Button>
                )}
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <User className="h-4 w-4 mr-2" />
                  View Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Session Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {session.status === 'scheduled' && (
                <>
                  <Button 
                    onClick={handleReschedule} 
                    disabled={actionLoading}
                    variant="outline" 
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reschedule
                  </Button>
                  <Button 
                    onClick={handleCancel} 
                    disabled={actionLoading}
                    variant="destructive" 
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel Session
                  </Button>
                </>
              )}
              
              {session.status === 'confirmed' && (
                <Button className="w-full">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Check In
                </Button>
              )}

              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reschedule Modal */}
      {session && (
        <RescheduleModal
          sessionId={session.id}
          currentDate={session.session_date}
          currentTime={session.session_time}
          isOpen={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          onRescheduleSuccess={handleRescheduleSuccess}
        />
      )}
    </div>
  );
};
