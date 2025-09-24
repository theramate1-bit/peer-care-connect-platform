import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ReviewForm from '@/components/reviews/ReviewForm';
import { SimpleProtectedRoute } from '@/components/auth/SimpleProtectedRoute';

interface Session {
  id: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  price: number;
  status: string;
  therapist_id: string;
  client_id: string;
  therapist_name?: string;
}

const SubmitReview: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails();
      checkExistingReview();
    }
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('client_sessions')
        .select(`
          *,
          therapist:users!client_sessions_therapist_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      if (data) {
        setSession({
          ...data,
          therapist_name: data.therapist ? `${data.therapist.first_name} ${data.therapist.last_name}` : 'Unknown Therapist'
        });
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      toast({
        title: "Error",
        description: "Failed to load session details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkExistingReview = async () => {
    if (!sessionId || !user) return;

    try {
      const { data, error } = await supabase
        .from('practitioner_ratings')
        .select('id')
        .eq('session_id', sessionId)
        .eq('client_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setHasExistingReview(!!data);
    } catch (error) {
      console.error('Error checking existing review:', error);
    }
  };

  const handleReviewSubmitted = () => {
    toast({
      title: "Review Submitted",
      description: "Thank you for your feedback! Your review will be visible shortly.",
      variant: "default"
    });
    
    // Navigate back to the sessions page or dashboard
    navigate('/dashboard');
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Not Found</h2>
            <p className="text-gray-600 mb-4">The session you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasExistingReview) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Review Already Submitted</h2>
            <p className="text-gray-600 mb-4">You have already submitted a review for this session.</p>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.status !== 'completed') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Not Completed</h2>
            <p className="text-gray-600 mb-4">You can only submit reviews for completed sessions.</p>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.client_id !== user?.id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You can only submit reviews for your own sessions.</p>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  return (
    <SimpleProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit Session Review</h1>
            <p className="text-gray-600">
              Share your experience to help other clients and improve our services.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Session Details */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Session Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">{session.therapist_name}</p>
                      <p className="text-sm text-gray-600">Therapist</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">{formatDate(session.session_date)}</p>
                      <p className="text-sm text-gray-600">Date</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatTime(session.start_time)} ({session.duration_minutes} min)
                      </p>
                      <p className="text-sm text-gray-600">Time & Duration</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Badge variant="secondary" className="text-sm">
                      {session.session_type}
                    </Badge>
                  </div>

                  {session.price && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-sm text-gray-600">Session Cost</p>
                      <p className="text-lg font-semibold text-gray-900">
                        £{session.price.toFixed(2)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Review Form */}
            <div className="lg:col-span-2">
              <ReviewForm
                sessionId={session.id}
                therapistId={session.therapist_id}
                clientId={session.client_id}
                onReviewSubmitted={handleReviewSubmitted}
                onCancel={handleCancel}
              />
            </div>
          </div>
        </div>
      </div>
    </SimpleProtectedRoute>
  );
};

export default SubmitReview;
