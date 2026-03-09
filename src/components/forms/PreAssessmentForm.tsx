import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BodyMap, type BodyMapMarker } from './BodyMap';
import { SmartLocationPicker } from '@/components/ui/SmartLocationPicker';
import { PreAssessmentService, type PreAssessmentFormData } from '@/lib/pre-assessment-service';
import { useAuth } from '@/contexts/AuthContext';
import { handleApiError } from '@/lib/error-handling';

interface PreAssessmentFormProps {
  sessionId: string;
  clientId?: string; // null for guests
  clientEmail: string;
  clientName: string;
  isGuest: boolean;
  isInitialSession: boolean;
  onComplete: (formId: string) => void;
  onSkip?: () => void; // Only for non-initial sessions
  canSkip?: boolean; // Only true for subsequent sessions
  onBack?: () => void;
}

type FormStep = 'background' | 'session' | 'bodyMap' | 'review';

const STEPS: FormStep[] = ['background', 'session', 'bodyMap', 'review'];
const STEP_NAMES: Record<FormStep, string> = {
  background: 'Background Information',
  session: 'Session Details',
  bodyMap: 'Body Map',
  review: 'Review & Submit'
};

export const PreAssessmentForm: React.FC<PreAssessmentFormProps> = ({
  sessionId,
  clientId,
  clientEmail,
  clientName,
  isGuest,
  isInitialSession,
  onComplete,
  onSkip,
  canSkip = false,
  onBack
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<FormStep>('background');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<PreAssessmentFormData>({
    body_map_markers: []
  });

  // Load existing form data
  useEffect(() => {
    const loadForm = async () => {
      const existing = await PreAssessmentService.getForm(sessionId);
      if (existing) {
        setFormData({
          name: existing.name,
          date_of_birth: existing.date_of_birth,
          contact_email: existing.contact_email,
          contact_phone: existing.contact_phone,
          gp_name: existing.gp_name,
          gp_address: existing.gp_address,
          current_medical_conditions: existing.current_medical_conditions,
          past_medical_history: existing.past_medical_history,
          area_of_body: existing.area_of_body,
          time_scale: existing.time_scale,
          how_issue_began: existing.how_issue_began,
          activities_affected: existing.activities_affected,
          body_map_markers: existing.body_map_markers
        });
      } else {
        // Auto-populate from profile or session
        if (clientId) {
          const autoData = await PreAssessmentService.autoPopulateFromProfile(clientId);
          setFormData(prev => ({ ...prev, ...autoData }));
        } else {
          const autoData = await PreAssessmentService.autoPopulateFromSession(sessionId);
          setFormData(prev => ({ ...prev, ...autoData }));
        }
      }
    };

    loadForm();
  }, [sessionId, clientId]);

  const updateField = (field: keyof PreAssessmentFormData, value: string | string[] | BodyMapMarker[] | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: FormStep): boolean => {
    const newErrors: Record<string, string> = {};
    const isRequired = !canSkip;

    if (step === 'background') {
      if (!formData.name || formData.name.trim() === '') {
        newErrors.name = 'Name is required';
      }
      if (isRequired) {
        if (!formData.gp_name || formData.gp_name.trim() === '') {
          newErrors.gp_name = 'GP Name is required for first-time clients';
        }
        if (!formData.gp_address || formData.gp_address.trim() === '') {
          newErrors.gp_address = 'GP Address is required for first-time clients';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };


  const handleSubmit = async () => {
    if (!canSkip && !validateStep('background')) {
      toast.error('Please complete all required fields (including GP details) before submitting');
      setCurrentStep('background');
      return;
    }
    if (!validateStep('review')) {
      toast.error('Please fix errors before submitting');
      return;
    }

    setLoading(true);
    try {
      const form = await PreAssessmentService.submitForm(sessionId, formData, clientId);
      toast.success('Pre-assessment form submitted successfully');
      onComplete(form.id);
    } catch (error) {
      handleApiError(error, 'submitting pre-assessment form');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg sm:text-2xl">Pre-Assessment Form</CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              {canSkip
                ? 'Please provide information to help your practitioner prepare for your session'
                : 'This form is required for first-time clients so we can support you safely.'}
            </CardDescription>
          </div>
          {canSkip && onSkip && (
            <Button
              type="button"
              variant="ghost"
              onClick={onSkip}
              disabled={loading}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
            >
              Skip for now
            </Button>
          )}
        </div>
        <div className="mt-4 sm:mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2">
            <span className="text-sm sm:text-base font-medium">
              {loading ? 'Processing...' : STEP_NAMES[currentStep]}
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {loading ? 'Processing...' : `Step ${currentStepIndex + 1} of ${STEPS.length}`}
            </span>
          </div>
          <Progress value={progress} className="h-2 sm:h-2.5" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        {/* Step 1: Background Information */}
        {currentStep === 'background' && (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">Background Information</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                This information helps your practitioner understand your medical background.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Enter your full name"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth || ''}
                  onChange={(e) => updateField('date_of_birth', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email || ''}
                  onChange={(e) => updateField('contact_email', e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Phone Number</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact_phone || ''}
                  onChange={(e) => updateField('contact_phone', e.target.value)}
                  placeholder="+44 7xxx xxxxxx"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="gp_name">
                  GP Name {!canSkip && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="gp_name"
                  value={formData.gp_name || ''}
                  onChange={(e) => updateField('gp_name', e.target.value)}
                  placeholder="Your GP's name"
                  className={errors.gp_name ? 'border-red-500' : ''}
                />
                {errors.gp_name && (
                  <p className="text-sm text-red-500">{errors.gp_name}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="gp_address">
                  GP Address {!canSkip && <span className="text-red-500">*</span>}
                </Label>
                <SmartLocationPicker
                  id="gp_address"
                  value={formData.gp_address || ''}
                  onChange={(value) => updateField('gp_address', value)}
                  placeholder="Start typing GP address..."
                  error={errors.gp_address}
                />
                {errors.gp_address && (
                  <p className="text-sm text-red-500">{errors.gp_address}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="current_medical_conditions">Current Medical Conditions</Label>
                <Textarea
                  id="current_medical_conditions"
                  value={formData.current_medical_conditions || ''}
                  onChange={(e) => updateField('current_medical_conditions', e.target.value)}
                  placeholder="List any current medical conditions, medications, or health concerns"
                  rows={4}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="past_medical_history">Past Medical History</Label>
                <Textarea
                  id="past_medical_history"
                  value={formData.past_medical_history || ''}
                  onChange={(e) => updateField('past_medical_history', e.target.value)}
                  placeholder="Any relevant past medical history, surgeries, or injuries"
                  rows={4}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Session Details */}
        {currentStep === 'session' && (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">Session Details</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                Tell us about the issue you're seeking treatment for.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="area_of_body">Area of Body Needing Attention</Label>
                <Input
                  id="area_of_body"
                  value={formData.area_of_body || ''}
                  onChange={(e) => updateField('area_of_body', e.target.value)}
                  placeholder="e.g., Lower back, Right knee, Left shoulder"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time_scale">How Long Has This Been an Issue?</Label>
                <Select
                  value={formData.time_scale || ''}
                  onValueChange={(value) => updateField('time_scale', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time scale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="less_than_week">Less than a week</SelectItem>
                    <SelectItem value="1-2_weeks">1-2 weeks</SelectItem>
                    <SelectItem value="3-4_weeks">3-4 weeks</SelectItem>
                    <SelectItem value="1-3_months">1-3 months</SelectItem>
                    <SelectItem value="3-6_months">3-6 months</SelectItem>
                    <SelectItem value="6-12_months">6-12 months</SelectItem>
                    <SelectItem value="over_year">Over a year</SelectItem>
                    <SelectItem value="chronic">Chronic/long-term</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="how_issue_began">How Did This Issue Begin?</Label>
                <Textarea
                  id="how_issue_began"
                  value={formData.how_issue_began || ''}
                  onChange={(e) => updateField('how_issue_began', e.target.value)}
                  placeholder="Describe how this issue started - was it an injury, gradual onset, related to an activity, etc.?"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="activities_affected">Activities Affected</Label>
                <Textarea
                  id="activities_affected"
                  value={formData.activities_affected || ''}
                  onChange={(e) => updateField('activities_affected', e.target.value)}
                  placeholder="What activities, movements, or daily tasks are affected by this issue?"
                  rows={4}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Body Map */}
        {currentStep === 'bodyMap' && (
          <div className="space-y-4 sm:space-y-6">
            <BodyMap
              markers={formData.body_map_markers || []}
              onMarkersChange={(markers) => updateField('body_map_markers', markers)}
              maxMarkers={5}
              disabled={loading}
            />
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 'review' && (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">Review Your Information</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                Please review your information before submitting. You can go back to make changes.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {/* Background Information Summary */}
              <div className="border rounded-lg p-4 space-y-2">
                <h4 className="font-medium">Background Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    <span>{formData.name || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date of Birth:</span>{' '}
                    <span>{formData.date_of_birth || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{' '}
                    <span>{formData.contact_email || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{' '}
                    <span>{formData.contact_phone || 'Not provided'}</span>
                  </div>
                  {formData.gp_name && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">GP:</span>{' '}
                      <span>{formData.gp_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Session Details Summary */}
              <div className="border rounded-lg p-4 space-y-2">
                <h4 className="font-medium">Session Details</h4>
                <div className="space-y-1 text-sm">
                  {formData.area_of_body && (
                    <div>
                      <span className="text-muted-foreground">Area:</span>{' '}
                      <span>{formData.area_of_body}</span>
                    </div>
                  )}
                  {formData.time_scale && (
                    <div>
                      <span className="text-muted-foreground">Time Scale:</span>{' '}
                      <span>{formData.time_scale.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Body Map Summary – side-by-side front and back (read-only) */}
              <div className="border rounded-lg p-4 space-y-2">
                <h4 className="font-medium">Body Map</h4>
                <BodyMap
                  markers={formData.body_map_markers || []}
                  onMarkersChange={() => {}}
                  disabled
                  sideBySide
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Once submitted, this form will be available to your practitioner before the session.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        {/* Navigation Buttons - Mobile responsive */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 pt-4 sm:pt-6 border-t">
          <div className="flex items-center gap-2 order-2 sm:order-1">
            {onBack && (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={loading}
                className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0"
                aria-label="Go back to previous step"
              >
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                Back
              </Button>
            )}
            {currentStepIndex > 0 && !onBack && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={loading}
                className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0"
                aria-label="Go to previous step"
              >
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                Previous
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 order-1 sm:order-2 w-full sm:w-auto">
            {currentStepIndex < STEPS.length - 1 && (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
            )}
            {currentStepIndex === STEPS.length - 1 && (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full sm:w-auto min-w-[120px] min-h-[44px] sm:min-h-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Booking
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
