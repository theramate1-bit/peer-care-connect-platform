import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  CreditCard, 
  User, 
  MapPin, 
  Phone, 
  CheckCircle,
  AlertCircle,
  Star,
  Timer
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PaymentIntegration } from '@/lib/payment-integration';
import { useAuth } from '@/contexts/AuthContext';

interface Practitioner {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  location: string;
  hourly_rate: number;
  specializations: string[];
  bio: string;
  experience_years: number;
  user_role: string;
  average_rating: number;
  total_sessions: number;
}

interface PractitionerService {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price_minor: number;
  active: boolean;
}

interface BookingFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practitioner: Practitioner;
}

export const BookingFlow: React.FC<BookingFlowProps> = ({
  open,
  onOpenChange,
  practitioner
}) => {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    session_date: '',
    start_time: '',
    duration_minutes: 60,
    session_type: '',
    notes: '',
    location: '',
    payment_method: 'card'
  });

  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [services, setServices] = useState<PractitionerService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  useEffect(() => {
    if (open && bookingData.session_date) {
      fetchAvailableTimeSlots();
    }
  }, [open, bookingData.session_date]);

  useEffect(() => {
    const loadServices = async () => {
      const { data } = await supabase
        .from('practitioner_services')
        .select('*')
        .eq('practitioner_id', practitioner.user_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setServices(data || []);
    };
    if (open) loadServices();
  }, [open, practitioner.user_id]);

  const fetchAvailableTimeSlots = async () => {
    if (!bookingData.session_date) return;

    try {
      // Get existing bookings for the selected date
      const { data: existingBookings, error } = await supabase
        .from('client_sessions')
        .select('start_time, duration_minutes')
        .eq('therapist_id', practitioner.user_id)
        .eq('session_date', bookingData.session_date)
        .eq('status', 'scheduled');

      if (error) throw error;

      // Generate time slots (9 AM to 6 PM, 1-hour intervals)
      const timeSlots = [];
      for (let hour = 9; hour < 18; hour++) {
        const timeString = `${hour.toString().padStart(2, '0')}:00`;
        
        // Check if this time slot is available
        const isBooked = existingBookings?.some(booking => {
          const bookingStart = parseInt(booking.start_time.split(':')[0]);
          const bookingEnd = bookingStart + (booking.duration_minutes / 60);
          return hour >= bookingStart && hour < bookingEnd;
        });

        if (!isBooked) {
          timeSlots.push(timeString);
        }
      }

      setAvailableTimeSlots(timeSlots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast.error('Failed to load available time slots');
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!bookingData.session_date || !bookingData.start_time || (!bookingData.session_type && !selectedServiceId)) {
        toast.error('Please fill in all required fields');
        return;
      }
      if (selectedServiceId) {
        const svc = services.find(s => s.id === selectedServiceId);
        if (svc) {
          setBookingData(prev => ({ ...prev, duration_minutes: svc.duration_minutes, session_type: svc.name }));
        }
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleBooking = async () => {
    if (!user || !userProfile) {
      toast.error('Please sign in to book a session');
      return;
    }

    try {
      setLoading(true);

      // Calculate price from selected service or hourly_rate fallback
      const svc = selectedServiceId ? services.find(s => s.id === selectedServiceId) : undefined;
      const priceMinor = svc ? svc.price_minor : Math.round((bookingData.duration_minutes / 60) * practitioner.hourly_rate * 100);
      const price = Math.round(priceMinor) / 100;

      // Create the booking
      const { data, error } = await supabase
        .from('client_sessions')
        .insert({
          client_id: user.id,
          client_name: `${userProfile.first_name} ${userProfile.last_name}`,
          client_email: user.email,
          client_phone: userProfile.phone,
          therapist_id: practitioner.user_id,
          session_date: bookingData.session_date,
          start_time: bookingData.start_time,
          duration_minutes: bookingData.duration_minutes,
          session_type: bookingData.session_type,
          price: price,
          status: 'scheduled',
          payment_status: 'pending',
          notes: bookingData.notes,
          location: bookingData.location || practitioner.location
        })
        .select()
        .single();

      if (error) throw error;

      // Create Stripe PaymentIntent via shared wrapper (dynamic amount)
      const amountMinorUnits = priceMinor;
      try {
        const payment = await PaymentIntegration.createSessionPayment({
          sessionId: data.id,
          practitionerId: practitioner.user_id,
          clientId: user.id,
          amount: amountMinorUnits,
          currency: 'gbp',
          description: `${bookingData.session_type || 'Session'} on ${bookingData.session_date} at ${bookingData.start_time}`
        });

        if (payment.success && payment.paymentIntentId) {
          await supabase
            .from('client_sessions')
            .update({
              stripe_payment_intent_id: payment.paymentIntentId,
              payment_status: 'pending'
            })
            .eq('id', data.id);
        } else if (!payment.success) {
          throw new Error(payment.error || 'Failed to create payment');
        }
      } catch (piError) {
        console.error('Payment intent error:', piError);
        // keep booking but flag pending payment
        toast.info('Booking created. Payment will be handled by your practitioner.');
      }

      // Create notification for the practitioner
      await supabase
        .from('notifications')
        .insert({
          user_id: practitioner.user_id,
          type: 'new_booking',
          title: 'New Booking Received',
          message: `${userProfile.first_name} ${userProfile.last_name} has booked a ${bookingData.session_type} session`,
          data: {
            session_id: data.id,
            client_name: `${userProfile.first_name} ${userProfile.last_name}`,
            session_date: bookingData.session_date,
            start_time: bookingData.start_time
          }
        });

      toast.success('Session booked successfully!');
      onOpenChange(false);
      
      // Reset form
      setStep(1);
      setBookingData({
        session_date: '',
        start_time: '',
        duration_minutes: 60,
        session_type: '',
        notes: '',
        location: '',
        payment_method: 'card'
      });
    } catch (error) {
      console.error('Error booking session:', error);
      toast.error('Failed to book session');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const calculatePrice = () => {
    const svc = selectedServiceId ? services.find(s => s.id === selectedServiceId) : undefined;
    if (svc) return Math.round(svc.price_minor) / 100;
    return Math.round((bookingData.duration_minutes / 60) * practitioner.hourly_rate * 100) / 100;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Book Session with {practitioner.first_name} {practitioner.last_name}
          </DialogTitle>
          <DialogDescription>
            Complete your booking in a few simple steps
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          {[1, 2, 3].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNumber
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {stepNumber}
              </div>
              {stepNumber < 3 && (
                <div
                  className={`w-12 h-0.5 mx-2 ${
                    step > stepNumber ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Session Details */}
        {step === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Session Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="session-date">Session Date *</Label>
                    <Input
                      id="session-date"
                      type="date"
                      value={bookingData.session_date}
                      onChange={(e) => setBookingData(prev => ({ ...prev, session_date: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="start-time">Start Time *</Label>
                    <Select
                      value={bookingData.start_time}
                      onValueChange={(value) => setBookingData(prev => ({ ...prev, start_time: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {formatTime(time)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Select
                      value={bookingData.duration_minutes.toString()}
                      onValueChange={(value) => setBookingData(prev => ({ ...prev, duration_minutes: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="90">90 minutes</SelectItem>
                        <SelectItem value="120">120 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Service *</Label>
                    <Select
                      value={selectedServiceId}
                      onValueChange={(value) => setSelectedServiceId(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(svc => (
                          <SelectItem key={svc.id} value={svc.id}>
                            {svc.name} • {svc.duration_minutes}m • £{(svc.price_minor/100).toFixed(2)}
                          </SelectItem>
                        ))}
                        {services.length === 0 && (
                          <SelectItem value="">No custom services • use hourly pricing</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={bookingData.location}
                    onChange={(e) => setBookingData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder={practitioner.location || "Enter location"}
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={bookingData.notes}
                    onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any specific requirements or notes for your session..."
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Review & Pricing */}
        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review Your Booking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Session Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(bookingData.session_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatTime(bookingData.start_time)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-muted-foreground" />
                        <span>{bookingData.duration_minutes} minutes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{bookingData.session_type}</span>
                      </div>
                      {bookingData.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{bookingData.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium">Practitioner</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{practitioner.first_name} {practitioner.last_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>{practitioner.average_rating ? practitioner.average_rating.toFixed(1) : 'No rating'} ({practitioner.total_sessions || 0} sessions)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{practitioner.location}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {practitioner.specializations.map((spec) => (
                          <Badge key={spec} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {bookingData.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {bookingData.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Hourly Rate</span>
                    <span>£{practitioner.hourly_rate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration</span>
                    <span>{bookingData.duration_minutes} minutes</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg border-t pt-3">
                    <span>Total</span>
                    <span>£{calculatePrice()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Payment Processing</h3>
                  <p className="text-muted-foreground mb-4">
                    Payment will be processed after your session is completed.
                  </p>
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Amount</span>
                      <span className="text-lg font-bold">£{calculatePrice()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={step === 1 ? () => onOpenChange(false) : handleBack}
            disabled={loading}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          <Button
            onClick={step === 3 ? handleBooking : handleNext}
            disabled={loading}
            className="min-w-[100px]"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : step === 3 ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Book Session
              </>
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};