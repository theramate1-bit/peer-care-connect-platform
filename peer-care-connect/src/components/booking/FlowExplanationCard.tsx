import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowStep {
  number: number;
  title: string;
  description: string;
  explanation: string;
  icon: React.ReactNode;
}

interface FlowExplanationCardProps {
  currentStep: number;
  totalSteps: number;
  isClient?: boolean;
  className?: string;
}

export const FlowExplanationCard: React.FC<FlowExplanationCardProps> = ({
  currentStep,
  totalSteps,
  isClient = false,
  className
}) => {
  const steps: FlowStep[] = [
    {
      number: 1,
      title: 'Service & Time',
      description: 'Select your service and preferred date/time',
      explanation: 'We ask you to select the service first because different services have different durations. This ensures we only show you time slots that can accommodate your chosen service. It also helps the practitioner prepare appropriately for your session.',
      icon: <Clock className="h-4 w-4" />
    },
    {
      number: 2,
      title: 'Review',
      description: 'Review your booking details and cancellation policy',
      explanation: 'Before payment, we give you a chance to review all details. This prevents mistakes and ensures you understand the cancellation policy. You can see exactly what you\'re booking, when, and with whom.',
      icon: <FileText className="h-4 w-4" />
    },
    ...(isClient ? [] : [{
      number: 3,
      title: 'Intake Form',
      description: 'Complete intake form to help practitioner prepare',
      explanation: 'For first-time clients or specific services, we collect intake information. This helps the practitioner understand your needs, medical history, and goals before your session. This preparation leads to more effective treatment.',
      icon: <FileText className="h-4 w-4" />
    }]),
    {
      number: isClient ? 3 : 4,
      title: 'Payment',
      description: 'Secure payment processing',
      explanation: 'We use Stripe for secure payment processing. Your payment is held securely and only processed after your session is confirmed. This protects both you and the practitioner, ensuring fair transactions.',
      icon: <CreditCard className="h-4 w-4" />
    }
  ];

  const currentStepData = steps.find(s => s.number === currentStep);

  return (
    <Card className={cn("border-blue-200 bg-blue-50/50", className)}>
      <CardContent className="pt-6">
        <div className="space-y-3">
          {/* Current Step Info */}
          {currentStepData && (
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {currentStepData.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">Step {currentStepData.number}: {currentStepData.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {currentStep} of {totalSteps}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentStepData.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

