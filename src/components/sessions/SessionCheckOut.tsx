import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { 
  Star, 
  MessageSquare, 
  Calendar, 
  CheckCircle, 
  ArrowLeft,
  Heart,
  Activity,
  Bone,
  Target,
  Download,
  Share,
  Clock,
  User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SessionFeedbackService, NotificationsService } from '@/lib/database';
import { ScheduleNextSessionModal } from './ScheduleNextSessionModal';

interface SessionCheckOutProps {
  sessionId: string;
  onBack?: () => void;
  onCheckOutComplete?: () => void;
  className?: string;
}

export const SessionCheckOut: React.FC<SessionCheckOutProps> = ({
  sessionId,
  onBack,
  onCheckOutComplete,
  className
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
  // Feedback form state
  const [rating, setRating] = useState(5);
  const [painLevel, setPainLevel] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [whatWentWell, setWhatWentWell] = useState('');
  const [areasForImprovement, setAreasForImprovement] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState('yes');
  const [nextSessionInterest, setNextSessionInterest] = useState('yes');

  useEffect(() => {
    fetchSessionInfo();
  }, [sessionId]);

  const fetchSessionInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('client_sessions')
        .select(`
          *,
          therapist:therapist_id (
            first_name,
            last_name,
            user_role,
            phone,
            email
          )
        `)
        .eq('id', sessionId)
        .eq('client_id', user?.id)
        .single();

      if (error) throw error;
      setSessionInfo(data);
    } catch (error) {
      console.error('Error fetching session info:', error);
    }
  };

  const handleSubmitFeedback = async () => {
    try {
      setLoading(true);

      // Submit session feedback using the service
      await SessionFeedbackService.createFeedback({
        session_id: sessionId,
        client_id: user?.id || '',
        therapist_id: sessionInfo?.therapist_id || '',
        rating: rating,
        pain_level_before: painLevel,
        pain_level_after: painLevel, // This would be different in real implementation
        feedback_text: feedback,
        what_went_well: whatWentWell,
        areas_for_improvement: areasForImprovement,
        would_recommend: wouldRecommend === 'yes',
        next_session_interest: nextSessionInterest === 'yes'
      });

      // Update session status
      const { error: sessionError } = await supabase
        .from('client_sessions')
        .update({ 
          status: 'completed',
          check_out_time: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      // Send notification to therapist
      await NotificationsService.createNotification({
        user_id: sessionInfo?.therapist_id || '',
        type: 'session_feedback',
        title: 'Session Feedback Received',
        message: `${user?.user_metadata?.first_name || 'Your client'} has submitted feedback for their session`,
        data: {
          session_id: sessionId,
          client_id: user?.id,
          rating: rating
        }
      });

      setSubmitted(true);
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! Your session has been completed."
      });

    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleNext = () => {
    setShowScheduleModal(true);
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

  if (submitted) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
          <p className="text-muted-foreground mb-6">
            Thank you for your feedback. Your session has been completed successfully.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium mb-2">What's Next?</h3>
              <ul className="text-sm text-left space-y-1">
                <li>• Your receipt has been emailed to you</li>
                <li>• You can view your session notes in your dashboard</li>
                <li>• Schedule your next session when you're ready</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download Receipt
              </Button>
              <Button variant="outline" className="flex-1">
                <Share className="h-4 w-4 mr-2" />
                Share Feedback
              </Button>
            </div>

            {nextSessionInterest === 'yes' && (
              <Button onClick={handleScheduleNext} className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Next Session
              </Button>
            )}

            {onCheckOutComplete && (
              <Button variant="outline" onClick={onCheckOutComplete} className="w-full">
                Return to Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold">Session Feedback</h1>
          <p className="text-muted-foreground">
            Help us improve by sharing your experience
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feedback Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Rate Your Session
              </CardTitle>
              <CardDescription>
                How would you rate your overall experience?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Rating:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`transition-colors ${
                        star <= rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      <Star className="h-6 w-6 fill-current" />
                    </button>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {rating} out of 5 stars
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Pain Level Assessment
              </CardTitle>
              <CardDescription>
                How would you rate your current pain level?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pain Level: {painLevel}/10</Label>
                <Slider
                  value={[painLevel]}
                  onValueChange={(value) => setPainLevel(value[0])}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>No Pain</span>
                  <span>Severe Pain</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Detailed Feedback
              </CardTitle>
              <CardDescription>
                Tell us about your session experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="what-went-well">What went well?</Label>
                <Textarea
                  id="what-went-well"
                  value={whatWentWell}
                  onChange={(e) => setWhatWentWell(e.target.value)}
                  placeholder="What aspects of the session did you find helpful?"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="areas-improvement">Areas for improvement</Label>
                <Textarea
                  id="areas-improvement"
                  value={areasForImprovement}
                  onChange={(e) => setAreasForImprovement(e.target.value)}
                  placeholder="What could be improved for future sessions?"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="general-feedback">Additional comments</Label>
                <Textarea
                  id="general-feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Any other thoughts or comments about your session?"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium">Would you recommend this therapist to others?</Label>
                <RadioGroup
                  value={wouldRecommend}
                  onValueChange={setWouldRecommend}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="recommend-yes" />
                    <Label htmlFor="recommend-yes">Yes, definitely</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="maybe" id="recommend-maybe" />
                    <Label htmlFor="recommend-maybe">Maybe</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="recommend-no" />
                    <Label htmlFor="recommend-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-base font-medium">Are you interested in scheduling another session?</Label>
                <RadioGroup
                  value={nextSessionInterest}
                  onValueChange={setNextSessionInterest}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="next-yes" />
                    <Label htmlFor="next-yes">Yes, I'd like to schedule another session</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="maybe" id="next-maybe" />
                    <Label htmlFor="next-maybe">Maybe, I'll think about it</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="next-no" />
                    <Label htmlFor="next-no">No, not at this time</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleSubmitFeedback} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Submitting Feedback...' : 'Submit Feedback & Complete Session'}
          </Button>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Session Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Session Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessionInfo && (
                <>
                  <div className="flex items-center gap-3">
                    {getRoleIcon(sessionInfo.therapist?.user_role)}
                    <div>
                      <div className="font-medium">
                        {sessionInfo.therapist?.first_name} {sessionInfo.therapist?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {sessionInfo.therapist?.user_role?.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Session Time</div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(sessionInfo.session_time)} ({sessionInfo.duration} minutes)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Session Type</div>
                      <div className="text-sm text-muted-foreground">
                        {sessionInfo.session_type}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Focus Area</div>
                      <div className="text-sm text-muted-foreground">
                        {sessionInfo.focus_area}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Therapist
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Next Session
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Download Receipt
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Schedule Next Session Modal */}
      {sessionInfo && (
        <ScheduleNextSessionModal
          therapistId={sessionInfo.therapist_id}
          therapistName={`${sessionInfo.therapist?.first_name} ${sessionInfo.therapist?.last_name}`}
          currentSessionType={sessionInfo.session_type}
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onScheduleSuccess={() => {
            toast({
              title: "Session Scheduled",
              description: "Your next session has been booked successfully!"
            });
          }}
        />
      )}
    </div>
  );
};
