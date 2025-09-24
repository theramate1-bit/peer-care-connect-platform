import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Mail, 
  Phone,
  CreditCard,
  CheckCircle,
  Star,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface Therapist {
  id: string;
  user_id: string;
  bio?: string;
  location?: string;
  hourly_rate?: number;
  experience_years?: number;
  specializations?: string[];
  users?: {
    first_name: string;
    last_name: string;
    user_role: string;
  };
}

interface UnifiedBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  therapist: Therapist;
  onBookingComplete?: (sessionId: string) => void;
}

export const UnifiedBookingModal: React.FC<UnifiedBookingModalProps> = ({
  open,
  onOpenChange,
  therapist,
  onBookingComplete
}) => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  
  // Booking form state
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');
  
  // Client info (for non-authenticated users)
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Session types
  const sessionTypes = [
    'Individual Therapy',
    'Couples Therapy',
    'Group Session',
    'Assessment',
    'Follow-up',
    'Consultation'
  ];

  // Duration options
  const durationOptions = [
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
  ];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedDate(undefined);
      setSelectedTime('');
      setSessionType('');
      setDuration(60);
      setNotes('');
      
      // Pre-fill client info if user is authenticated
      if (user && userProfile) {
        setClientName(`${userProfile.first_name} ${userProfile.last_name}`);
        setClientEmail(user.email || '');
      } else {
        setClientName('');
        setClientEmail('');
        setClientPhone('');
      }
    }
  }, [open, user, userProfile]);

  // Fetch available time slots when date is selected
  useEffect(() => {
    if (selectedDate && therapist.user_id) {
      fetchAvailableSlots();
    }
  }, [selectedDate, therapist.user_id]);

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !therapist.user_id) return;
    
    setLoadingSlots(true);
    try {
      // REAL IMPLEMENTATION: Fetch actual available slots from database
      const { data: availability, error } = await supabase
        .from('practitioner_availability')
        .select('available_slots')
        .eq('practitioner_id', practitionerId)
        .eq('date', selectedDate)
        .single();
      
      if (error) {
        console.error('Error fetching availability:', error);
        setAvailableSlots([]);
        return;
      }
      
      const slots = availability?.available_slots || [];
      
      // Filter out already booked slots
      const { data: bookings } = await supabase
        .from('client_sessions')
        .select('start_time')
        .eq('therapist_id', therapist.user_id)
        .eq('session_date', selectedDate.toISOString().split('T')[0])
        .in('status', ['scheduled', 'confirmed']);
      
      const bookedSlots = bookings?.map(b => b.start_time) || [];
      const availableSlots = slots.filter(slot => !bookedSlots.includes(slot));
      
      setAvailableSlots(availableSlots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast({
        title: "Error",
        description: "Failed to load available times",
        variant: "destructive"
      });
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!selectedDate || !selectedTime || !sessionType) {
        toast({
          title: "Missing Information",
          description: "Please select a date, time, and session type",
          variant: "destructive"
        });
        return;
      }
    }
    
    if (step === 2) {
      if (!user && (!clientName || !clientEmail)) {
        toast({
          title: "Missing Information",
          description: "Please provide your name and email",
          variant: "destructive"
        });
        return;
      }
    }
    
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleBooking = async () => {
    if (!therapist || !selectedDate || !selectedTime || !sessionType) return;

    setLoading(true);
    try {
      const totalAmount = (therapist.hourly_rate || 0) * (duration / 60);
      
      const bookingData = {
        therapist_id: therapist.user_id,
        client_name: user ? `${userProfile?.first_name} ${userProfile?.last_name}` : clientName,
        client_email: user ? user.email : clientEmail,
        client_phone: user ? userProfile?.phone : clientPhone,
        session_date: selectedDate.toISOString().split('T')[0],
        start_time: selectedTime,
        duration_minutes: duration,
        session_type: sessionType,
        price: totalAmount,
        notes: notes,
        status: 'scheduled' as const,
        payment_status: 'pending' as const
      };

      const { data: sessionData, error: bookingError } = await supabase
        .from('client_sessions')
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) throw bookingError;

      toast({
        title: "Booking Created!",
        description: "Your session has been scheduled successfully",
      });

      onBookingComplete?.(sessionData.id);
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotalPrice = () => {
    return ((therapist.hourly_rate || 0) * (duration / 60)).toFixed(2);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Therapist Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {therapist.users?.first_name?.[0]}{therapist.users?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {therapist.users?.first_name} {therapist.users?.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {therapist.users?.user_role?.replace(/_/g, ' ')}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">4.8</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                        Verified
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">£{therapist.hourly_rate || 0}/hr</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Date Selection */}
            <div>
              <Label className="text-base font-medium">Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border mt-2"
              />
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div>
                <Label className="text-base font-medium">Select Time</Label>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2">Loading available times...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={selectedTime === slot ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTime(slot)}
                        className="justify-center"
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Session Type */}
            <div>
              <Label className="text-base font-medium">Session Type</Label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose session type" />
                </SelectTrigger>
                <SelectContent>
                  {sessionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div>
              <Label className="text-base font-medium">Duration</Label>
              <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Booking Summary */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Therapist:</span>
                    <span>{therapist.users?.first_name} {therapist.users?.last_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{selectedDate && format(selectedDate, 'PPP')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span>{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{duration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Session Type:</span>
                    <span>{sessionType}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>£{getTotalPrice()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Information */}
            {!user && (
              <div className="space-y-4">
                <h3 className="text-base font-medium">Your Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientName">Full Name *</Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientEmail">Email *</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="clientPhone">Phone (Optional)</Label>
                    <Input
                      id="clientPhone"
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific requests or information for your therapist..."
                rows={3}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Final Confirmation */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Ready to Book?</h3>
              <p className="text-muted-foreground">
                Review your booking details and confirm to schedule your session.
              </p>
            </div>

            {/* Final Summary */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Session with:</span>
                    <span className="font-medium">{therapist.users?.first_name} {therapist.users?.last_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">When:</span>
                    <span className="font-medium">
                      {selectedDate && format(selectedDate, 'PPP')} at {selectedTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{duration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">{sessionType}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Total Cost:</span>
                    <span>£{getTotalPrice()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Payment</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Payment will be processed after your session is confirmed by the therapist.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return "Select Date & Time";
      case 2: return "Review & Confirm";
      case 3: return "Final Confirmation";
      default: return "Book Session";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{getStepTitle()}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`flex-1 h-2 rounded-full ${
                  stepNumber <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={step === 1 ? () => onOpenChange(false) : handleBack}
              disabled={loading}
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            
            {step < 3 ? (
              <Button onClick={handleNext} disabled={loading}>
                Next
              </Button>
            ) : (
              <Button onClick={handleBooking} disabled={loading}>
                {loading ? 'Booking...' : 'Confirm Booking'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
