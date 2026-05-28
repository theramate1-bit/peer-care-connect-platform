import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CalendarIcon, Clock, MapPin, User as UserIcon, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getBlocksForDate, isTimeSlotBlocked } from '@/lib/block-time-utils';
import { cn } from '@/lib/utils';
import StripePaymentForm from '@/components/payments/StripePaymentForm';
import { PaymentIntegration } from '@/lib/payment-integration';

interface TherapistProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  specializations: string[];
  hourly_rate: number;
  location: string;
  profile_verified: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
  booked: boolean;
  duration: number;
}

interface BookingCalendarProps {
  therapist: TherapistProfile;
  onBookingComplete?: (bookingId: string) => void;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  therapist,
  onBookingComplete
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [sessionType, setSessionType] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const DURATION_OPTIONS = [30, 45, 60, 90, 120];
  const SESSION_TYPES = [
    'Initial Consultation',
    'Treatment Session',
    'Follow-up Session',
    'Rehabilitation',
    'Maintenance Care',
    'Sports Therapy',
    'Massage Therapy',
    'Osteopathy',
    'Other'
  ];

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedDuration, therapist]);

  // Real-time subscription for availability changes
  useEffect(() => {
    if (!therapist?.user_id || !selectedDate) return;

    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const channel = supabase
      .channel(`availability-calendar-${therapist.user_id}-${selectedDateStr}`)
      // Listen to postgres_changes for calendar_events (blocked time)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `user_id=eq.${therapist.user_id}`
        },
        (payload: any) => {
          const newEventType = payload.new?.event_type;
          const oldEventType = payload.old?.event_type;
          if (newEventType === 'block' || newEventType === 'unavailable' || 
              oldEventType === 'block' || oldEventType === 'unavailable') {
            const eventDate = payload.new?.start_time || payload.old?.start_time;
            if (eventDate && typeof eventDate === 'string' && eventDate.startsWith(selectedDateStr)) {
              fetchAvailableSlots();
            }
          }
        }
      )
      // Listen to postgres_changes for client_sessions (bookings)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_sessions',
          filter: `therapist_id=eq.${therapist.user_id}`
        },
        (payload: any) => {
          const sessionDate = payload.new?.session_date || payload.old?.session_date;
          if (sessionDate === selectedDateStr) {
            fetchAvailableSlots();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [therapist?.user_id, selectedDate]);

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !therapist) return;

    setLoading(true);
    try {
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      const serviceDurationHours = selectedDuration / 60;

      // 1. Fetch practitioner availability (working hours)
      const { data: availability, error: availabilityError } = await supabase
        .from('practitioner_availability')
        .select('working_hours, timezone')
        .eq('user_id', therapist.user_id)
        .maybeSingle();

      if (availabilityError) throw availabilityError;

      // 2. Fetch existing bookings for this date
      const { data: existingBookings, error: bookingsError } = await supabase
        .from('client_sessions')
        .select('start_time, duration_minutes, status, expires_at')
        .eq('therapist_id', therapist.user_id)
        .eq('session_date', selectedDateStr)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment']);

      if (bookingsError) throw bookingsError;

      // 3. Get blocked/unavailable time for this date
      const blocks = await getBlocksForDate(therapist.user_id, selectedDateStr);

      // 4. Generate time slots based on availability
      const slots: TimeSlot[] = [];
      const nowIso = new Date().toISOString();

      if (availability && availability.working_hours) {
        const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const daySchedule = availability.working_hours[dayOfWeek];

        if (daySchedule && daySchedule.enabled && daySchedule.hours && daySchedule.hours.length > 0) {
          daySchedule.hours.forEach((timeBlock: any) => {
            const startHour = parseInt(timeBlock.start.split(':')[0]);
            const endHour = parseInt(timeBlock.end.split(':')[0]);
            
            for (let hour = startHour; hour < endHour; hour++) {
              // Check if slot can fit the service duration
              const slotEndHour = hour + serviceDurationHours;
              if (slotEndHour > endHour) {
                continue;
              }
              
              const timeString = `${hour.toString().padStart(2, '0')}:00`;
              
              // Check for booking conflicts
              const isBooked = existingBookings?.some(booking => {
                // Skip expired pending_payment sessions
                if (booking.status === 'pending_payment' && booking.expires_at && booking.expires_at < nowIso) {
                  return false;
                }
                const bookingStart = parseInt(booking.start_time.split(':')[0]);
                const bookingEnd = bookingStart + Math.ceil(booking.duration_minutes / 60);
                return bookingStart < slotEndHour && bookingEnd > hour;
              }) || false;

              // Check if this time slot is blocked
              const isBlocked = isTimeSlotBlocked(timeString, selectedDuration, blocks, selectedDateStr);

              // Only add slot if it's available (filter out blocked/booked slots)
              if (!isBooked && !isBlocked) {
                slots.push({
                  time: timeString,
                  available: true,
                  booked: false,
                  duration: selectedDuration
                });
              }
            }
          });
        }
      }

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast({
        title: "Error",
        description: "Failed to load available time slots",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime('');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !user || !sessionType) {
      toast({
        title: "Missing Information",
        description: "Please select a date, time, and session type",
        variant: "destructive"
      });
      return;
    }

    setBooking(true);
    try {
      // Calculate price
      // Note: In a real app this should come from the selected service
      // For now we'll estimate based on hourly rate if available or default
      const estimatedPrice = (therapist.hourly_rate / 60) * selectedDuration;
      const totalAmount = estimatedPrice > 0 ? estimatedPrice : 50; // Fallback default
      
      // Create the booking
      const { data: sessionData, error: bookingError } = await supabase
        .from('client_sessions')
        .insert({
          therapist_id: therapist.user_id,
          client_name: `${user.user_metadata?.first_name || 'Client'} ${user.user_metadata?.last_name || ''}`,
          client_email: user.email,
          session_date: selectedDate.toISOString().split('T')[0],
          start_time: selectedTime,
          duration_minutes: selectedDuration,
          session_type: sessionType,
          price: totalAmount,
          notes: notes,
          status: 'scheduled',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create payment intent via shared wrapper
      const payment = await PaymentIntegration.createSessionPayment({
        sessionId: sessionData.id,
        practitionerId: therapist.user_id,
        clientId: user.id,
        amount: Math.round(totalAmount * 100),
        currency: 'gbp',
        description: `${sessionType} on ${selectedDate.toISOString().split('T')[0]} at ${selectedTime}`
      });

      if (!payment.success || !payment.paymentIntentId) {
        throw new Error(payment.error || 'Failed to create payment');
      }

      toast({
        title: "Booking Created!",
        description: "Please complete payment to confirm your session.",
      });

      // Store payment intent for embedded payment form
      setPaymentIntentId(payment.paymentIntentId);
      setShowPaymentForm(true);

      if (onBookingComplete) {
        onBookingComplete(sessionData.id);
      }

      // Reset form
      setSelectedTime('');
      setSessionType('');
      setNotes('');

    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setBooking(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const getDateModifiers = (date: Date) => {
    const modifiers: any = {};
    
    // Check if therapist works on this day (simple check based on available slots)
    // In a real app we'd want to check availability for the whole month efficiently
    // For now we just show availability for the selected day in the slots area
    
    return modifiers;
  };

  const formatTime = (time: string) => {
    // Validate time string
    if (!time || typeof time !== 'string' || !time.includes(':')) {
      return 'Not selected';
    }
    
    // Strip seconds if present (HH:MM:SS -> HH:MM)
    const timeWithoutSeconds = time.split(':').length === 3
      ? time.substring(0, 5)
      : time;
    
    const [hours, minutes] = timeWithoutSeconds.split(':');
    
    // Validate that we have both hours and minutes
    if (!hours || !minutes || hours === '' || minutes === '') {
      return 'Not selected';
    }
    
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    
    // Validate parsed values
    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return 'Invalid time';
    }
    
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;
  };

  const calculatePrice = () => {
    // Estimate based on hourly rate
    return (therapist.hourly_rate / 60) * selectedDuration;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Book with {therapist.first_name} {therapist.last_name}</h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {therapist.location}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">Pricing in booking</span>
            </div>
            {therapist.profile_verified && (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Verified
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Select Time
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Duration:</span>
              <Select value={selectedDuration.toString()} onValueChange={(value) => setSelectedDuration(parseInt(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(duration => (
                    <SelectItem key={duration} value={duration.toString()}>
                      {duration} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map((slot, index) => (
                  <Button
                    key={index}
                    variant={slot.booked ? "secondary" : slot.time === selectedTime ? "default" : "outline"}
                    disabled={slot.booked}
                    onClick={() => handleTimeSelect(slot.time)}
                    className="h-12"
                  >
                    {formatTime(slot.time)}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p>No available slots for this date</p>
                <p className="text-sm">Try selecting a different date or duration</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Form */}
      {selectedDate && selectedTime && (
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Session Type</label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select session type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Session Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any specific requirements or notes..."
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                />
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Session Summary</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDate?.toLocaleDateString()} at {formatTime(selectedTime)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Duration: {selectedDuration} minutes
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">£{calculatePrice().toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    Estimated Price
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleBooking} 
              disabled={booking || !sessionType}
              className="w-full"
            >
              {booking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Booking...
                </>
              ) : (
                `Book Session - £${calculatePrice().toFixed(2)}`
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">How to book:</h4>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>• Select a date from the calendar (green dates have availability)</li>
                <li>• Choose your preferred session duration</li>
                <li>• Pick an available time slot</li>
                <li>• Select session type and add any notes</li>
                <li>• Complete your booking and payment</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form Modal */}
      {showPaymentForm && paymentIntentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Complete Payment</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowPaymentForm(false)}
              >
                ×
              </Button>
            </div>
            
            <StripePaymentForm
              amount={Math.round(calculatePrice() * 100)}
              currency="gbp"
              description={`Session with ${therapist.first_name} ${therapist.last_name}`}
              onSuccess={(paymentIntent) => {
                toast({
                  title: "Payment Successful!",
                  description: "Your booking is confirmed.",
                });
                setShowPaymentForm(false);
                setPaymentIntentId(null);
                // Reset form
                setSelectedTime('');
                setSessionType('');
                setNotes('');
                if (onBookingComplete) {
                  onBookingComplete(paymentIntent.id);
                }
              }}
              onError={(error) => {
                toast({
                  title: "Payment Failed",
                  description: error.message || "Please try again.",
                  variant: "destructive"
                });
              }}
              metadata={{
                session_id: paymentIntentId,
                therapist_id: therapist.user_id,
                session_type: sessionType,
                duration: selectedDuration
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
