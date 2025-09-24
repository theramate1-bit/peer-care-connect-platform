import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle, 
  Send, 
  CheckCircle, 
  AlertCircle,
  Heart,
  Smile,
  Frown,
  Meh,
  Award,
  Target,
  TrendingUp,
  Users,
  BarChart3
} from 'lucide-react';

interface FeedbackQuestion {
  id: string;
  type: 'rating' | 'multiple-choice' | 'text' | 'nps' | 'satisfaction';
  question: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  scale?: {
    min: number;
    max: number;
    labels: string[];
  };
}

interface FeedbackSurvey {
  id: string;
  title: string;
  description: string;
  questions: FeedbackQuestion[];
  trigger: 'onboarding' | 'post-session' | 'monthly' | 'exit-intent' | 'custom';
  isActive: boolean;
  createdAt: Date;
}

interface FeedbackResponse {
  id: string;
  surveyId: string;
  userId: string;
  responses: Record<string, any>;
  completedAt: Date;
  sessionId?: string;
}

interface FeedbackSystemProps {
  survey: FeedbackSurvey;
  onComplete: (responses: FeedbackResponse) => void;
  onSkip: () => void;
  className?: string;
}

export const FeedbackSystem: React.FC<FeedbackSystemProps> = ({
  survey,
  onComplete,
  onSkip,
  className = ''
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  const progress = ((currentQuestion + 1) / survey.questions.length) * 100;

  const handleResponse = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleNext = () => {
    if (currentQuestion < survey.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const feedbackResponse: FeedbackResponse = {
        id: Date.now().toString(),
        surveyId: survey.id,
        userId: 'current-user', // Replace with actual user ID
        responses,
        completedAt: new Date()
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onComplete(feedbackResponse);
      setShowThankYou(true);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    const currentQ = survey.questions[currentQuestion];
    if (!currentQ.required) return true;
    return responses[currentQ.id] !== undefined && responses[currentQ.id] !== '';
  };

  const renderQuestion = (question: FeedbackQuestion) => {
    switch (question.type) {
      case 'rating':
        return (
          <div className="space-y-4">
            <div className="flex justify-center space-x-2">
              {Array.from({ length: question.scale?.max || 5 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => handleResponse(question.id, i + 1)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    responses[question.id] === i + 1
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  <Star className="h-6 w-6" />
                </button>
              ))}
            </div>
            {question.scale?.labels && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>{question.scale.labels[0]}</span>
                <span>{question.scale.labels[question.scale.labels.length - 1]}</span>
              </div>
            )}
          </div>
        );

      case 'nps':
        return (
          <div className="space-y-4">
            <div className="flex justify-center space-x-1">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => handleResponse(question.id, i)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    responses[question.id] === i
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Not at all likely</span>
              <span>Extremely likely</span>
            </div>
          </div>
        );

      case 'satisfaction':
        return (
          <div className="space-y-4">
            <div className="flex justify-center space-x-4">
              {[
                { value: 1, icon: Frown, label: 'Very Dissatisfied', color: 'text-red-500' },
                { value: 2, icon: Meh, label: 'Dissatisfied', color: 'text-orange-500' },
                { value: 3, icon: Smile, label: 'Neutral', color: 'text-yellow-500' },
                { value: 4, icon: Heart, label: 'Satisfied', color: 'text-green-500' },
                { value: 5, icon: Award, label: 'Very Satisfied', color: 'text-blue-500' }
              ].map(({ value, icon: Icon, label, color }) => (
                <button
                  key={value}
                  onClick={() => handleResponse(question.id, value)}
                  className={`flex flex-col items-center space-y-2 p-4 rounded-lg transition-colors ${
                    responses[question.id] === value
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-8 w-8 ${responses[question.id] === value ? color : 'text-gray-400'}`} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'multiple-choice':
        return (
          <RadioGroup
            value={responses[question.id] || ''}
            onValueChange={(value) => handleResponse(question.id, value)}
          >
            <div className="space-y-3">
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                  <Label htmlFor={`${question.id}-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <Textarea
              value={responses[question.id] || ''}
              onChange={(e) => handleResponse(question.id, e.target.value)}
              placeholder={question.placeholder}
              className="min-h-[100px]"
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (showThankYou) {
    return (
      <div className={`max-w-2xl mx-auto ${className}`}>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">Thank You!</h3>
            <p className="text-gray-600 mb-6">
              Your feedback is invaluable to us. We'll use it to improve your experience.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
              <ul className="text-sm text-blue-800 space-y-1 text-left">
                <li>• We'll review your feedback within 24 hours</li>
                <li>• You'll receive a personalized response if needed</li>
                <li>• Your suggestions will be considered for future updates</li>
                <li>• You'll be notified when improvements are implemented</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = survey.questions[currentQuestion];

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-xl">{survey.title}</CardTitle>
              <p className="text-gray-600 mt-1">{survey.description}</p>
            </div>
            <Badge variant="outline">
              {currentQuestion + 1} of {survey.questions.length}
            </Badge>
          </div>
          
          <Progress value={progress} className="w-full" />
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                {currentQ.question}
                {currentQ.required && <span className="text-red-500 ml-1">*</span>}
              </h3>
              {renderQuestion(currentQ)}
            </div>

            <div className="flex justify-between">
              <div>
                {currentQuestion > 0 && (
                  <Button variant="outline" onClick={handlePrevious}>
                    Previous
                  </Button>
                )}
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" onClick={onSkip}>
                  Skip Survey
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Submitting...
                    </>
                  ) : currentQuestion === survey.questions.length - 1 ? (
                    <>
                      Submit Feedback
                      <Send className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    'Next'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const FeedbackTrigger: React.FC<{
  trigger: string;
  onTrigger: () => void;
  className?: string;
}> = ({ trigger, onTrigger, className = '' }) => {
  const getTriggerIcon = () => {
    switch (trigger) {
      case 'onboarding': return <Target className="h-4 w-4" />;
      case 'post-session': return <Award className="h-4 w-4" />;
      case 'monthly': return <TrendingUp className="h-4 w-4" />;
      case 'exit-intent': return <AlertCircle className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getTriggerText = () => {
    switch (trigger) {
      case 'onboarding': return 'Help us improve your experience';
      case 'post-session': return 'How was your session?';
      case 'monthly': return 'Monthly feedback check-in';
      case 'exit-intent': return 'Wait! Help us improve';
      default: return 'Share your feedback';
    }
  };

  return (
    <Button
      onClick={onTrigger}
      variant="outline"
      className={`${className}`}
    >
      {getTriggerIcon()}
      <span className="ml-2">{getTriggerText()}</span>
    </Button>
  );
};

export default FeedbackSystem;
