import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { BookingValidator } from '@/lib/booking-validation';
import { PaymentIntegration } from '@/lib/payment-integration';
import { NotificationSystem } from '@/lib/notification-system';
import { SessionNotifications } from '@/lib/session-notifications';
import BookingConfirmation from './BookingConfirmation';
import { CalendarTimeSelector } from '@/components/booking/CalendarTimeSelector';

interface CompleteBookingFlowProps {
  practitioner: {
    user_id: string;
    first_name: string;
    last_name: string;
    hourly_rate: number;
    specializations: string[];
  };
  onBookingComplete?: (sessionId: string) => void;
  onClose?: () => void;
}

const CompleteBookingFlow: React.FC<CompleteBookingFlowProps> = ({
  practitioner,
  onBookingComplete,
  onClose
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<any>(null);

  // Booking form data
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    duration: 60,
    sessionType: 'initial_consultation',
    notes: ''
  });

  const handleNext = async () => {
    if (step === 1) {
      // Validate basic form data
      if (!formData.date || !formData.time || !formData.sessionType) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Validate booking
      setLoading(true);
      try {
        const validationResult = await BookingValidator.validateBooking(
          practitioner.user_id,
          formData.date,
          formData.time,
          formData.duration,
          user?.id
        );

        setValidation(validationResult);
        
        if (validationResult.isValid) {
          setStep(2);
        } else {
          toast.error('Booking validation failed');
        }
      } catch (error) {
        console.error('Validation error:', error);
        toast.error('Failed to validate booking');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBookingConfirm = async () => {
    if (!user || !validation?.isValid) return;

    setLoading(true);
    try {
      // Calculate price based on duration and hourly rate
      // Note: In a real scenario, this might come from a specific service price
      const price = (practitioner.hourly_rate / 60) * formData.duration;
      const priceMinor = Math.round(price * 100);

      // Generate idempotency key
      const idempotencyKey = `${user.id}-${practitioner.user_id}-${formData.date}-${formData.time}-${Date.now()}`;

      // Create session using RPC function with validation
      const { data: bookingResult, error: rpcError } = await supabase
        .rpc('create_booking_with_validation', {
          p_therapist_id: practitioner.user_id,
          p_client_id: user.id,
          p_client_name: `${user.user_metadata?.first_name || 'Client'} ${user.user_metadata?.last_name || ''}`,
          p_client_email: user.email,
          p_session_date: formData.date,
          p_start_time: formData.time,
          p_duration_minutes: formData.duration,
          p_session_type: formData.sessionType,
          p_price: price,
          p_client_phone: null,
          p_notes: formData.notes || null,
          p_payment_status: 'pending',
          p_status: 'scheduled',
          p_idempotency_key: idempotencyKey
        });

      if (rpcError) throw rpcError;

      // Check RPC response (RPC returns JSONB, need to type assert)
      const result = bookingResult as any;
      if (!result || !result.success) {
        const errorCode = result?.error_code || 'UNKNOWN_ERROR';
        const errorMessage = result?.error_message || 'Failed to create booking';
        
        if (errorCode === 'CONFLICT_BOOKING' || errorCode === 'CONFLICT_BLOCKED') {
          toast.error(errorMessage);
          setLoading(false);
          return;
        }
        
        throw new Error(errorMessage);
      }

      // Get the created session ID and fetch full data
      const sessionId = result.session_id;
      const { data: session, error: fetchError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchError) throw fetchError;

      // Create payment intent
      const paymentResult = await PaymentIntegration.createSessionPayment({
        sessionId: session.id,
        practitionerId: practitioner.user_id,
        clientId: user.id,
        amount: priceMinor, // Use calculated price in pence
        currency: 'GBP',
        description: `${formData.sessionType} session with ${practitioner.first_name} ${practitioner.last_name}`
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error);
      }

      // Send booking confirmation notifications
      await NotificationSystem.sendBookingConfirmation(session.id);
      
      // Send booking notification to practitioner
      await SessionNotifications.sendNotification({
        trigger: 'booking_created',
        sessionId: session.id,
        clientId: user.id,
        practitionerId: practitioner.user_id,
        sessionDate: formData.date,
        sessionTime: formData.time,
        sessionType: formData.sessionType,
        practitionerName: `${practitioner.first_name} ${practitioner.last_name}`
      });

      toast.success('Booking created successfully!');
      onBookingComplete?.(session.id);
      onClose?.();

    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return (practitioner.hourly_rate / 60) * formData.duration;
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Booking Details */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Book Session with {practitioner.first_name} {practitioner.last_name}
            </CardTitle>
            <CardDescription>
              Select your preferred date, time, and session details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Session Type & Duration Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sessionType">Session Type *</Label>
                <Select value={formData.sessionType} onValueChange={(value) => setFormData({...formData, sessionType: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial_consultation">Initial Consultation</SelectItem>
                    <SelectItem value="treatment">Treatment Session</SelectItem>
                    <SelectItem value="follow_up">Follow-up Session</SelectItem>
                    <SelectItem value="rehabilitation">Rehabilitation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration *</Label>
                <Select value={formData.duration.toString()} onValueChange={(value) => setFormData({...formData, duration: parseInt(value), time: ''})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Calendar & Time Selection */}
            <div className="space-y-2">
              <Label>Date & Time</Label>
              <CalendarTimeSelector
                therapistId={practitioner.user_id}
                duration={formData.duration}
                selectedDate={formData.date}
                selectedTime={formData.time}
                onDateTimeSelect={(date, time) => {
                  setFormData(prev => ({ ...prev, date, time }));
                }}
              />
              {formData.date && formData.time && (
                <div className="mt-2 bg-primary/10 border border-primary/20 p-2 rounded text-sm flex items-center justify-center gap-2 text-primary">
                  <Clock className="h-4 w-4" />
                  Selected: <strong>{new Date(formData.date).toLocaleDateString()} at {formData.time}</strong>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Input
                id="notes"
                placeholder="Any specific requirements or information..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            {/* Pricing Summary */}
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Session Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Session fee ({formData.duration} min)</span>
                  <span>£{calculateTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform fee (0.5%)</span>
                  <span>£{((calculateTotal() * 100 * 0.005) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total</span>
                  <span>£{(calculateTotal() * 1.005).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={loading || !formData.date || !formData.time}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating...
                  </div>
                ) : (
                  'Continue to Payment'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Confirmation */}
      {step === 2 && validation && (
        <BookingConfirmation
          practitioner={practitioner}
          sessionDetails={{
            date: formData.date,
            time: formData.time,
            duration: formData.duration,
            type: formData.sessionType,
            price: calculateTotal()
          }}
          validation={validation}
          onConfirm={handleBookingConfirm}
          onCancel={() => setStep(1)}
          loading={loading}
        />
      )}
    </div>
  );
};

export default CompleteBookingFlow;
