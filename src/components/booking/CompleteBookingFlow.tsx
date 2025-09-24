import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, User, CreditCard, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BookingValidator } from '@/lib/booking-validation';
import { PaymentIntegration } from '@/lib/payment-integration';
import { NotificationSystem } from '@/lib/notification-system';
import BookingConfirmation from './BookingConfirmation';

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
    sessionType: 'consultation',
    notes: ''
  });

  // Available time slots
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);

  useEffect(() => {
    if (formData.date) {
      fetchAvailableSlots();
    }
  }, [formData.date, practitioner.user_id]);

  const fetchAvailableSlots = async () => {
    try {
      const dayOfWeek = new Date(formData.date).getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      
      // Get practitioner availability
      const { data: availability } = await supabase
        .from('practitioner_availability')
        .select('working_hours')
        .eq('user_id', practitioner.user_id)
        .single();

      if (!availability?.working_hours?.[dayName]?.enabled) {
        setAvailableSlots([]);
        return;
      }

      const dayConfig = availability.working_hours[dayName];
      const [startHour, startMinute] = dayConfig.start.split(':').map(Number);
      const [endHour, endMinute] = dayConfig.end.split(':').map(Number);

      // Generate time slots
      const slots = [];
      const slotDuration = 30;
      
      let currentHour = startHour;
      let currentMinute = startMinute;
      
      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        
        // Check for conflicts
        const { data: existingBookings } = await supabase
          .from('client_sessions')
          .select('start_time, duration_minutes')
          .eq('therapist_id', practitioner.user_id)
          .eq('session_date', formData.date)
          .in('status', ['scheduled', 'confirmed']);

        const hasConflict = existingBookings?.some(booking => {
          const bookingStart = new Date(`${formData.date}T${booking.start_time}`);
          const bookingEnd = new Date(bookingStart.getTime() + booking.duration_minutes * 60000);
          const slotStart = new Date(`${formData.date}T${timeString}`);
          const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);
          
          return slotStart < bookingEnd && slotEnd > bookingStart;
        }) || false;

        slots.push({
          time: timeString,
          available: !hasConflict
        });

        currentMinute += slotDuration;
        if (currentMinute >= 60) {
          currentMinute = 0;
          currentHour++;
        }
      }

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast.error('Failed to load available times');
    }
  };

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
      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('client_sessions')
        .insert({
          therapist_id: practitioner.user_id,
          client_id: user.id,
          client_name: `${user.user_metadata?.first_name || 'Client'} ${user.user_metadata?.last_name || ''}`,
          client_email: user.email,
          session_date: formData.date,
          start_time: formData.time,
          duration_minutes: formData.duration,
          session_type: formData.sessionType,
          price: (practitioner.hourly_rate * formData.duration) / 60,
          notes: formData.notes,
          status: 'scheduled',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create payment intent
      const paymentResult = await PaymentIntegration.createSessionPayment({
        sessionId: session.id,
        practitionerId: practitioner.user_id,
        clientId: user.id,
        amount: Math.round(((practitioner.hourly_rate * formData.duration) / 60) * 100), // Convert to pence
        currency: 'GBP',
        description: `${formData.sessionType} session with ${practitioner.first_name} ${practitioner.last_name}`
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error);
      }

      // Send booking confirmation notifications
      await NotificationSystem.sendBookingConfirmation(session.id);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateTotal = () => {
    return (practitioner.hourly_rate * formData.duration) / 60;
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
            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="date">Session Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Time Selection */}
            {formData.date && (
              <div className="space-y-2">
                <Label htmlFor="time">Session Time *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant={formData.time === slot.time ? "default" : "outline"}
                      size="sm"
                      disabled={!slot.available}
                      onClick={() => setFormData({...formData, time: slot.time})}
                      className="text-xs"
                    >
                      {formatTime(slot.time)}
                    </Button>
                  ))}
                </div>
                {availableSlots.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No available time slots for this date. Please select a different date.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Duration Selection */}
            <div className="space-y-2">
              <Label htmlFor="duration">Session Duration *</Label>
              <Select value={formData.duration.toString()} onValueChange={(value) => setFormData({...formData, duration: parseInt(value)})}>
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

            {/* Session Type */}
            <div className="space-y-2">
              <Label htmlFor="sessionType">Session Type *</Label>
              <Select value={formData.sessionType} onValueChange={(value) => setFormData({...formData, sessionType: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="treatment">Treatment</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
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
                  <span>Platform fee (3%)</span>
                  <span>£{(calculateTotal() * 0.03).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total</span>
                  <span>£{(calculateTotal() * 1.03).toFixed(2)}</span>
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
            type: formData.sessionType
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
