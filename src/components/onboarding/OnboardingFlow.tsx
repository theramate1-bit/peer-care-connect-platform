import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Heart, Star, ArrowRight, ArrowLeft, Circle, Shield } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to TheraMate',
      description: 'Your trusted healthcare marketplace',
      icon: <Heart className="h-8 w-8 text-red-500" />,
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Your Health Journey</h3>
            <p className="text-gray-600 mb-6">
              We're here to connect you with verified healthcare professionals who can help you achieve your wellness goals.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <h4 className="font-semibold text-blue-900">Verified Professionals</h4>
              <p className="text-sm text-blue-700">All therapists are licensed and verified</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Star className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold text-green-900">Quality Care</h4>
              <p className="text-sm text-green-700">Rated and reviewed by real patients</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Heart className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <h4 className="font-semibold text-purple-900">Personalized</h4>
              <p className="text-sm text-purple-700">Matched to your specific needs</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'how-it-works',
      title: 'How It Works',
      description: 'Simple steps to better health',
      icon: <ArrowRight className="h-8 w-8 text-blue-500" />,
      content: (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Journey to Better Health</h3>
            <p className="text-gray-600">Four simple steps to connect with the right healthcare professional</p>
          </div>
          <div className="space-y-4">
            {[
              {
                step: 1,
                title: 'Browse & Discover',
                description: 'Search through verified healthcare professionals in your area',
                icon: '🔍'
              },
              {
                step: 2,
                title: 'Choose Your Therapist',
                description: 'Review profiles, read reviews, and select the perfect match',
                icon: '👨‍⚕️'
              },
              {
                step: 3,
                title: 'Book Your Session',
                description: 'Schedule at your convenience with flexible payment options',
                icon: '📅'
              },
              {
                step: 4,
                title: 'Start Your Journey',
                description: 'Begin your path to better health with professional care',
                icon: '🚀'
              }
            ].map((item, index) => (
              <div 
                key={index} 
                className={`flex items-start space-x-4 p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                  index === currentStep - 1 ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => handleStepClick(index + 1)}
              >
                <div className={`flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center font-bold ${
                  index < currentStep - 1 ? 'bg-green-500' : index === currentStep - 1 ? 'bg-blue-600' : 'bg-gray-400'
                }`}>
                  {index < currentStep - 1 ? <CheckCircle className="h-5 w-5" /> : item.step}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{item.title}</h4>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
                <div className="text-2xl">{item.icon}</div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'get-started',
      title: 'Ready to Begin?',
      description: 'Let\'s set up your profile',
      icon: <Star className="h-8 w-8 text-yellow-500" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">You're All Set!</h3>
            <p className="text-gray-600 mb-6">
              Now let's create your profile so we can match you with the perfect healthcare professional.
            </p>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">What happens next?</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Complete your health profile (2 minutes)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Browse verified healthcare professionals</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Book your first session with confidence</span>
              </li>
            </ul>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">
              Don't worry - you can always update your preferences later
            </p>
          </div>
        </div>
      )
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps([...completedSteps, steps[currentStep].id]);
      setCurrentStep(currentStep + 1);
    } else {
      setCompletedSteps([...completedSteps, steps[currentStep].id]);
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const currentStepData = steps[currentStep];

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" style={{ pointerEvents: 'auto' }}>
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" style={{ pointerEvents: 'auto' }}>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            {currentStepData.icon}
          </div>
          <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
          <p className="text-gray-600">{currentStepData.description}</p>
          
          {/* Step Selector */}
          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <p className="text-center text-sm text-gray-600 mb-4">Click any step to navigate:</p>
            <div className="flex justify-center space-x-3 mb-4">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStepClick(index);
                  }}
                  className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 ${
                    index === currentStep
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg ring-2 ring-blue-300'
                      : completedSteps.includes(step.id)
                      ? 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  title={`Click to go to: ${step.title}`}
                >
                  {completedSteps.includes(step.id) ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <span className="text-lg font-bold">{index + 1}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex justify-center space-x-6 text-sm text-gray-600">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStepClick(index);
                  }}
                  className={`text-center max-w-24 cursor-pointer hover:text-blue-600 transition-colors underline-offset-4 hover:underline ${
                    index === currentStep ? 'text-blue-600 font-semibold' : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-500 mt-2">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {currentStepData.content}
          <div className="flex justify-between mt-8">
            <div>
              {currentStep > 0 && (
                <Button variant="outline" onClick={handlePrevious}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tour
              </Button>
              {completedSteps.length === steps.length ? (
                <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Setup
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingFlow;
