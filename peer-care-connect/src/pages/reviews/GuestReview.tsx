import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, User as UserIcon, ArrowLeft, Star, StarOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ReviewSystem } from '@/lib/review-system';
import { toast as sonnerToast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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

const GuestReview: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const sessionId = searchParams.get('session_id');
  const emailParam = searchParams.get('email');
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const [clientEmail, setClientEmail] = useState(emailParam || '');
  const [emailVerified, setEmailVerified] = useState(!!emailParam);
  
  // Review form state
  const [overallRating, setOverallRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect logged-in users to the authenticated review flow
  useEffect(() => {
    if (user && sessionId) {
      navigate(`/reviews/submit/${sessionId}`, { replace: true });
      return;
    }
  }, [user, sessionId, navigate]);

  useEffect(() => {
    if (sessionId && emailParam && !user) {
      // Email provided in URL, verify and fetch session (guests only)
      verifyEmailAndFetchSession();
    } else if (sessionId && !user) {
      // Only session ID provided, need email input
      setLoading(false);
    } else if (!user) {
      setLoading(false);
    }
  }, [sessionId, emailParam, user]);

  const verifyEmailAndFetchSession = async () => {
    if (!sessionId || !emailParam) return;

    try {
      setLoading(true);
      
      // Use RPC function to get session (similar to BookingSuccess)
      const { data: sessionData, error: rpcError } = await supabase
        .rpc('get_session_by_email_and_id', {
          p_session_id: sessionId,
          p_email: emailParam
        });

      if (rpcError || !sessionData || (Array.isArray(sessionData) && sessionData.length === 0)) {
        toast({
          title: "Session Not Found",
          description: "No session found for this email. Please check you're using the same email you used when booking.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const sessionDataObj = Array.isArray(sessionData) ? sessionData[0] : sessionData;

      // Get practitioner details
      const { data: practitionerData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', sessionDataObj.therapist_id)
        .maybeSingle();

      setSession({
        ...sessionDataObj,
        therapist_name: practitionerData 
          ? `${practitionerData.first_name} ${practitionerData.last_name}`
          : 'Unknown Therapist'
      });

      // Check if review already exists
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle();

      setHasExistingReview(!!existingReview);
      setEmailVerified(true);
      setLoading(false);

    } catch (error) {
      console.error('Error fetching session:', error);
      toast({
        title: "Error",
        description: "Failed to load session details.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive"
      });
      return;
    }

    // Update URL with email and fetch session
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('email', clientEmail);
    window.history.replaceState({}, '', newUrl.toString());
    
    await verifyEmailAndFetchSession();
  };

  const handleSubmitReview = async () => {
    if (!session || !clientEmail) return;

    if (overallRating === 0) {
      toast({
        title: "Rating Required",
        description: "Please provide an overall rating.",
        variant: "destructive"
      });
      return;
    }

    if (reviewComment.trim().length < 10) {
      toast({
        title: "Review Required",
        description: "Please provide a review comment (at least 10 characters).",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await ReviewSystem.submitReview({
        sessionId: session.id,
        practitionerId: session.therapist_id,
        clientEmail: clientEmail,
        overallRating: overallRating,
        title: reviewTitle || `Review for ${session.session_type}`,
        comment: reviewComment,
        isAnonymous: isAnonymous
      });

      if (result.success) {
        sonnerToast.success('Review submitted successfully!');
        setHasExistingReview(true);
        // Show success message and option to close
      } else {
        toast({
          title: "Submission Failed",
          description: result.error || "Failed to submit review. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number, onRatingChange: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className="focus:outline-none"
            disabled={isSubmitting}
          >
            {star <= rating ? (
              <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
            ) : (
              <StarOff className="w-6 h-6 text-gray-300 hover:text-yellow-400" />
            )}
          </button>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  // Email verification step
  if (!emailVerified && sessionId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Verify Your Email</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="Enter the email used for booking"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Enter the email address you used when booking this session.
                  </p>
                </div>
                <Button type="submit" className="w-full">
                  Verify & Continue
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
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
            <Button onClick={() => navigate('/')}>
              Back to Home
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
            <Button onClick={() => navigate('/')}>
              Back to Home
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
            <p className="text-gray-600 mb-4">Thank you! You have already submitted a review for this session.</p>
            <Button onClick={() => navigate('/')}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Your Session</h1>
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
                  <UserIcon className="w-5 h-5 text-gray-500" />
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
                      {session.start_time} ({session.duration_minutes} min)
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
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Session Review</CardTitle>
                <p className="text-sm text-gray-600">
                  Share your experience to help other clients and improve our services.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overall Rating */}
                <div className="space-y-2">
                  <Label className="text-base font-medium">Overall Rating *</Label>
                  <div className="flex items-center gap-4">
                    {renderStars(overallRating, setOverallRating)}
                    <span className="text-sm text-gray-600">
                      {overallRating > 0 ? `${overallRating}/5` : 'Click to rate'}
                    </span>
                  </div>
                </div>

                {/* Review Title */}
                <div className="space-y-2">
                  <Label htmlFor="review-title" className="text-base font-medium">
                    Review Title (Optional)
                  </Label>
                  <Input
                    id="review-title"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    placeholder="Brief summary of your experience"
                    maxLength={100}
                  />
                </div>

                {/* Review Text */}
                <div className="space-y-2">
                  <Label htmlFor="review-comment" className="text-base font-medium">
                    Review Comment *
                  </Label>
                  <textarea
                    id="review-comment"
                    className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Share your experience with this session. What went well? What could be improved? (Minimum 10 characters)"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    maxLength={500}
                  />
                  <div className="text-xs text-gray-500 text-right">
                    {reviewComment.length}/500 characters
                  </div>
                </div>

                {/* Anonymous Option */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <Label htmlFor="anonymous" className="text-sm text-gray-700">
                    Submit anonymously
                  </Label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/')}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={isSubmitting || overallRating === 0 || reviewComment.trim().length < 10}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </div>

                {/* Help Text */}
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
                  <p className="font-medium mb-1">Review Guidelines:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Be honest and constructive in your feedback</li>
                    <li>Focus on the session experience and outcomes</li>
                    <li>Avoid personal attacks or inappropriate content</li>
                    <li>Your review helps other clients make informed decisions</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestReview;

