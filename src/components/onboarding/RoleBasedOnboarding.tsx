import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Heart, 
  Activity, 
  Bone, 
  Users,
  Calendar,
  Star,
  MessageSquare,
  Settings,
  Target,
  Award,
  Waves,
  Leaf,
  Sparkles,
  Shield,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
  isRequired: boolean;
}

interface RoleBasedOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
  className?: string;
}

export const RoleBasedOnboarding: React.FC<RoleBasedOnboardingProps> = ({
  onComplete,
  onSkip,
  className
}) => {
  const { userProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const getRoleSpecificSteps = (): OnboardingStep[] => {
    const baseSteps: OnboardingStep[] = [
      {
        id: 'welcome',
        title: 'Welcome to TheraMate!',
        description: 'Let\'s get you set up for success',
        icon: Heart,
        isRequired: true,
        content: (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Welcome to your personalized healthcare platform!
              </h3>
              <p className="text-muted-foreground">
                We'll guide you through setting up your profile and getting the most out of TheraMate.
              </p>
            </div>
          </div>
        )
      }
    ];

    switch (userProfile?.user_role) {
      case 'client':
        return [
          ...baseSteps,
          {
            id: 'profile-setup',
            title: 'Complete Your Profile',
            description: 'Help us understand your wellness needs',
            icon: Users,
            isRequired: true,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Tell us about yourself</h3>
                  <p className="text-muted-foreground">
                    A complete profile helps us match you with the right therapists
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Health Goals</div>
                      <div className="text-sm text-muted-foreground">What do you want to achieve?</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Preferred Therapy Types</div>
                      <div className="text-sm text-muted-foreground">Sports therapy, massage, osteopathy, etc.</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Location & Availability</div>
                      <div className="text-sm text-muted-foreground">When and where you'd like sessions</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          },
          {
            id: 'find-therapists',
            title: 'Discover Therapists',
            description: 'Learn how to find and book with qualified professionals',
            icon: Target,
            isRequired: true,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Find your perfect therapist</h3>
                  <p className="text-muted-foreground">
                    Browse our network of verified healthcare professionals
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Search className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">Search & Filter</div>
                    <div className="text-sm text-muted-foreground">Find therapists by specialty, location, availability</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Star className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">Read Reviews</div>
                    <div className="text-sm text-muted-foreground">See what other clients say about their experience</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">Book Sessions</div>
                    <div className="text-sm text-muted-foreground">Schedule appointments that fit your schedule</div>
                  </div>
                </div>
              </div>
            )
          },
          {
            id: 'wellness-tracking',
            title: 'Track Your Progress',
            description: 'Monitor your wellness journey and improvements',
            icon: Heart,
            isRequired: false,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Your wellness dashboard</h3>
                  <p className="text-muted-foreground">
                    Keep track of your therapy sessions and wellness improvements
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Session History</div>
                      <div className="text-sm text-muted-foreground">View all your past and upcoming sessions</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Heart className="h-5 w-5 text-pink-600" />
                    <div>
                      <div className="font-medium">Wellness Metrics</div>
                      <div className="text-sm text-muted-foreground">Track your health and wellness progress</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Star className="h-5 w-5 text-yellow-600" />
                    <div>
                      <div className="font-medium">Favorite Therapists</div>
                      <div className="text-sm text-muted-foreground">Bookmark your preferred healthcare professionals</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }
        ];

      case 'sports_therapist':
        return [
          ...baseSteps,
          {
            id: 'professional-setup',
            title: 'Professional Profile',
            description: 'Set up your sports therapy practice profile',
            icon: Activity,
            isRequired: true,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Build your professional presence</h3>
                  <p className="text-muted-foreground">
                    Create a compelling profile that attracts athletes and sports enthusiasts
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Credentials & Certifications</div>
                      <div className="text-sm text-muted-foreground">Upload your sports therapy qualifications</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Specialties & Services</div>
                      <div className="text-sm text-muted-foreground">Injury recovery, performance training, prevention</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Availability & Pricing</div>
                      <div className="text-sm text-muted-foreground">Set your schedule and session rates</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          },
          {
            id: 'athlete-management',
            title: 'Manage Athletes',
            description: 'Learn how to work with your athlete clients',
            icon: Users,
            isRequired: true,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Athlete client management</h3>
                  <p className="text-muted-foreground">
                    Tools and features to help you provide the best sports therapy care
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Target className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">Performance Tracking</div>
                    <div className="text-sm text-muted-foreground">Monitor athlete progress and improvements</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Activity className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">Injury Assessment</div>
                    <div className="text-sm text-muted-foreground">Document and track injury recovery</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Award className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">Training Programs</div>
                    <div className="text-sm text-muted-foreground">Create personalized training plans</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">Session Scheduling</div>
                    <div className="text-sm text-muted-foreground">Manage appointments and availability</div>
                  </div>
                </div>
              </div>
            )
          }
        ];

      case 'massage_therapist':
        return [
          ...baseSteps,
          {
            id: 'wellness-profile',
            title: 'Wellness Practice Profile',
            description: 'Set up your massage therapy practice',
            icon: Heart,
            isRequired: true,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Create your wellness practice</h3>
                  <p className="text-muted-foreground">
                    Build a profile that attracts clients seeking relaxation and wellness
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Massage Techniques</div>
                      <div className="text-sm text-muted-foreground">Swedish, deep tissue, hot stone, etc.</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Wellness Specialties</div>
                      <div className="text-sm text-muted-foreground">Stress relief, pain management, relaxation</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Treatment Environment</div>
                      <div className="text-sm text-muted-foreground">Studio setup, equipment, ambiance</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }
        ];

      case 'osteopath':
        return [
          ...baseSteps,
          {
            id: 'osteopathy-profile',
            title: 'Osteopathy Practice Profile',
            description: 'Set up your osteopathy practice',
            icon: Bone,
            isRequired: true,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Build your osteopathy practice</h3>
                  <p className="text-muted-foreground">
                    Create a profile that attracts patients seeking musculoskeletal care
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Osteopathic Techniques</div>
                      <div className="text-sm text-muted-foreground">Structural assessment, manipulation, treatment</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Treatment Areas</div>
                      <div className="text-sm text-muted-foreground">Back pain, joint issues, sports injuries</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Patient Care Philosophy</div>
                      <div className="text-sm text-muted-foreground">Holistic approach to musculoskeletal health</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }
        ];

      default:
        return baseSteps;
    }
  };

  const steps = getRoleSpecificSteps();
  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStepData.id]));
      setCurrentStep(prev => prev + 1);
    } else {
      setCompletedSteps(prev => new Set([...prev, currentStepData.id]));
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!currentStepData) return null;

  return (
    <div className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${className}`}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <currentStepData.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
                <CardDescription>{currentStepData.description}</CardDescription>
              </div>
            </div>
            <Badge variant="outline">
              Step {currentStep + 1} of {steps.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {currentStepData.content}
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <Button variant="ghost" onClick={handleSkip}>
                Skip for now
              </Button>
            </div>
            <Button onClick={handleNext}>
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
