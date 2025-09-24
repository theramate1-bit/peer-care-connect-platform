import React from 'react';
import { CheckCircle, Circle, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JourneyStep {
  id: string;
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'upcoming';
  icon?: React.ReactNode;
}

interface ProgressIndicatorProps {
  steps: JourneyStep[];
  currentStep: string;
  onStepClick?: (stepId: string) => void;
  className?: string;
  variant?: 'horizontal' | 'vertical' | 'compact';
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  onStepClick,
  className = '',
  variant = 'horizontal'
}) => {
  const getStepIcon = (step: JourneyStep) => {
    if (step.status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (step.status === 'current') {
      return <Clock className="h-5 w-5 text-blue-600" />;
    }
    return step.icon || <Circle className="h-5 w-5 text-gray-400" />;
  };

  const getStepClasses = (step: JourneyStep) => {
    const baseClasses = "flex items-center space-x-3 p-3 rounded-lg transition-all duration-200";
    
    if (step.status === 'completed') {
      return cn(baseClasses, "bg-green-50 text-green-900 cursor-pointer hover:bg-green-100");
    }
    if (step.status === 'current') {
      return cn(baseClasses, "bg-blue-50 text-blue-900 border-2 border-blue-200");
    }
    return cn(baseClasses, "bg-gray-50 text-gray-600 cursor-not-allowed");
  };

  if (variant === 'vertical') {
    return (
      <div className={cn("space-y-2", className)}>
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start space-x-4">
            <div className="flex flex-col items-center">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200",
                step.status === 'completed' && "bg-green-600 border-green-600 text-white",
                step.status === 'current' && "bg-blue-600 border-blue-600 text-white",
                step.status === 'upcoming' && "bg-white border-gray-300 text-gray-400"
              )}>
                {getStepIcon(step)}
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-0.5 h-8 mt-2",
                  step.status === 'completed' ? "bg-green-600" : "bg-gray-300"
                )} />
              )}
            </div>
            <div className="flex-1 pb-4">
              <h4 className={cn(
                "font-medium",
                step.status === 'completed' && "text-green-900",
                step.status === 'current' && "text-blue-900",
                step.status === 'upcoming' && "text-gray-500"
              )}>
                {step.title}
              </h4>
              {step.description && (
                <p className={cn(
                  "text-sm mt-1",
                  step.status === 'completed' && "text-green-700",
                  step.status === 'current' && "text-blue-700",
                  step.status === 'upcoming' && "text-gray-400"
                )}>
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className={cn(
              "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
              step.status === 'completed' && "bg-green-100 text-green-800",
              step.status === 'current' && "bg-blue-100 text-blue-800",
              step.status === 'upcoming' && "bg-gray-100 text-gray-600"
            )}>
              {getStepIcon(step)}
              <span>{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="h-4 w-4 text-gray-400" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Horizontal variant (default)
  return (
    <div className={cn("space-y-2", className)}>
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={getStepClasses(step)}
          onClick={() => step.status !== 'upcoming' && onStepClick?.(step.id)}
        >
          <div className="flex-shrink-0">
            {getStepIcon(step)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{step.title}</h4>
            {step.description && (
              <p className="text-sm text-gray-600 truncate">{step.description}</p>
            )}
          </div>
          {step.status === 'current' && (
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Predefined journey steps for common user flows
export const CLIENT_JOURNEY_STEPS: JourneyStep[] = [
  {
    id: 'register',
    title: 'Create Account',
    description: 'Sign up and verify your email',
    status: 'upcoming'
  },
  {
    id: 'profile',
    title: 'Complete Profile',
    description: 'Tell us about your health needs',
    status: 'upcoming'
  },
  {
    id: 'browse',
    title: 'Browse Therapists',
    description: 'Find the right healthcare professional',
    status: 'upcoming'
  },
  {
    id: 'select',
    title: 'Choose Therapist',
    description: 'Review profiles and make selection',
    status: 'upcoming'
  },
  {
    id: 'book',
    title: 'Book Session',
    description: 'Schedule your appointment',
    status: 'upcoming'
  },
  {
    id: 'pay',
    title: 'Complete Payment',
    description: 'Secure payment processing',
    status: 'upcoming'
  },
  {
    id: 'session',
    title: 'Attend Session',
    description: 'Receive professional care',
    status: 'upcoming'
  },
  {
    id: 'review',
    title: 'Leave Review',
    description: 'Share your experience',
    status: 'upcoming'
  }
];

export const THERAPIST_JOURNEY_STEPS: JourneyStep[] = [
  {
    id: 'register',
    title: 'Create Account',
    description: 'Sign up as a healthcare professional',
    status: 'upcoming'
  },
  {
    id: 'verify',
    title: 'Get Verified',
    description: 'Submit credentials for verification',
    status: 'upcoming'
  },
  {
    id: 'profile',
    title: 'Complete Profile',
    description: 'Add your specialties and availability',
    status: 'upcoming'
  },
  {
    id: 'go-live',
    title: 'Go Live',
    description: 'Start accepting bookings',
    status: 'upcoming'
  },
  {
    id: 'earn',
    title: 'Earn Credits',
    description: 'Provide services and earn credits',
    status: 'upcoming'
  },
  {
    id: 'grow',
    title: 'Grow Practice',
    description: 'Build your client base',
    status: 'upcoming'
  }
];

export default ProgressIndicator;
