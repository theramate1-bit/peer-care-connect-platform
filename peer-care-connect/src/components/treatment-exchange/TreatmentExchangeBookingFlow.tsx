import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Coins, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TreatmentExchangeService } from '@/lib/treatment-exchange';
import { CalendarTimeSelector } from '@/components/booking/CalendarTimeSelector';

interface Practitioner {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  average_rating?: number;
  treatment_exchange_enabled: boolean;
}

interface TreatmentExchangeBookingFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practitioner: Practitioner;
  onSuccess?: () => void;
}

export const TreatmentExchangeBookingFlow: React.FC<TreatmentExchangeBookingFlowProps> = ({
  open,
  onOpenChange,
  practitioner,
  onSuccess
}) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Service, 2: Date/Time, 3: Review
  const [creditBalance, setCreditBalance] = useState(0);
  const [services, setServices] = useState<PractitionerProduct[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceCreditCosts, setServiceCreditCosts] = useState<Record<string, number>>({});
  
  const [bookingData, setBookingData] = useState({
    session_date: '',
    start_time: '',
    duration_minutes: 60,
    session_type: 'Treatment Exchange'
  });

  interface PractitionerProduct {
    id: string;
    stripe_product_id?: string;
    stripe_price_id?: string;
    name: string;
    description?: string;
    price_amount: number; // in pence
    duration_minutes?: number;
    is_active: boolean;
    practitioner_id: string;
    currency: string;
  }

  // Calculate credit cost: duration_minutes (1 credit per minute)
  const calculateCreditCost = (durationMinutes: number): number => {
    if (!durationMinutes || durationMinutes <= 0) {
      return 1; // Minimum 1 credit
    }
    
    // 1 credit per minute
    return durationMinutes;
  };

  // Get accurate credit cost from backend RPC
  const getPractitionerCreditCost = async (durationMinutes: number, productId?: string | null): Promise<number> => {
    const practitionerId = practitioner.user_id || practitioner.id;
    if (!practitionerId) {
      return calculateCreditCost(durationMinutes);
    }

    try {
      const { data, error } = await supabase.rpc('get_practitioner_credit_cost', {
        p_practitioner_id: practitionerId,
        p_duration_minutes: durationMinutes,
        p_product_id: productId || null
      });

      if (error) {
        console.warn('Error fetching credit cost from RPC:', error);
        return calculateCreditCost(durationMinutes);
      }

      return data || calculateCreditCost(durationMinutes);
    } catch (error) {
      console.warn('Exception fetching credit cost:', error);
      return calculateCreditCost(durationMinutes);
    }
  };

  // Validate practitioner prop
  useEffect(() => {
    const practitionerId = practitioner.user_id || practitioner.id;
    if (open && (!practitionerId || practitionerId.trim() === '')) {
      console.error('Invalid practitioner prop:', practitioner);
      toast.error('Invalid practitioner information. Please try again.');
      onOpenChange(false);
    }
  }, [open, practitioner, onOpenChange]);

  // Load credit balance and services
  useEffect(() => {
    if (open && userProfile?.id) {
      const practitionerId = practitioner.user_id || practitioner.id;
      if (practitionerId && practitionerId.trim() !== '') {
        loadCreditBalance();
        loadServices();
      }
    }
  }, [open, userProfile?.id, practitioner.user_id || practitioner.id]);

  const loadServices = async () => {
    setLoadingServices(true);
    try {
      // Get the correct practitioner ID with fallback
      const practitionerId = practitioner.user_id || practitioner.id;
      
      if (!practitionerId) {
        console.error('Error loading services: No practitioner ID provided', { practitioner });
        toast.error('Invalid practitioner information');
        setServices([]);
        return;
      }

      console.log('Loading services for practitioner:', {
        practitionerId,
        practitioner: {
          id: practitioner.id,
          user_id: practitioner.user_id,
          name: `${practitioner.first_name} ${practitioner.last_name}`
        }
      });

      // Load practitioner's products/services
      const { data: productsData, error } = await supabase
        .from('practitioner_products')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading services:', {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          practitionerId,
          query: 'practitioner_products.select(*).eq(practitioner_id, ...).eq(is_active, true)'
        });
        toast.error(`Failed to load services: ${error.message || 'Unknown error'}`);
        setServices([]);
        return;
      }

      console.log('Loaded services:', {
        count: productsData?.length || 0,
        services: productsData?.map(p => ({ id: p.id, name: p.name, duration: p.duration_minutes }))
      });

      setServices(productsData || []);

      // Load credit costs for all services (1 credit per minute)
      if (productsData && productsData.length > 0) {
        const costs: Record<string, number> = {};
        for (const service of productsData) {
          const duration = service.duration_minutes || 60;
          // Credit cost = duration_minutes (1 credit per minute)
          costs[service.id] = duration;
        }
        setServiceCreditCosts(costs);

        // Auto-select first service if available
        const firstService = productsData[0];
        setSelectedServiceId(firstService.id);
        setBookingData(prev => ({
          ...prev,
          duration_minutes: firstService.duration_minutes || 60,
          session_type: firstService.name
        }));
      } else {
        setSelectedServiceId('');
        console.warn('No active services found for practitioner:', practitionerId);
        toast.warning('This practitioner has no active services available for treatment exchange');
      }
    } catch (error: any) {
      console.error('Error loading services (catch block):', {
        error,
        errorMessage: error?.message,
        errorStack: error?.stack,
        practitioner: {
          id: practitioner.id,
          user_id: practitioner.user_id
        }
      });
      toast.error(`Failed to load services: ${error?.message || 'Unexpected error'}`);
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const loadCreditBalance = async () => {
    try {
      const creditCheck = await TreatmentExchangeService.checkCreditBalance(userProfile?.id!);
      setCreditBalance(creditCheck.currentBalance);
    } catch (error) {
      console.error('Error loading credit balance:', error);
      setCreditBalance(0);
    }
  };

  // Update duration when service changes
  useEffect(() => {
    if (selectedServiceId && services.length > 0) {
      const selectedService = services.find(s => s.id === selectedServiceId);
      if (selectedService) {
        setBookingData(prev => ({
          ...prev,
          duration_minutes: selectedService.duration_minutes || 60,
          session_type: selectedService.name
        }));
      }
    }
  }, [selectedServiceId, services]);


  const handleNext = () => {
    if (step === 1) {
      // Validate service selected
      if (!selectedServiceId || services.length === 0) {
        toast.error('Please select a service');
        return;
      }
      if (!bookingData.duration_minutes) {
        toast.error('Please select a service with a valid duration');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate date and time
      if (!bookingData.session_date) {
        toast.error('Please select a date');
        return;
      }
      if (!bookingData.start_time) {
        toast.error('Please select a time');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!userProfile?.id) {
      toast.error('Please sign in to send a request');
      return;
    }

    // Validate booking data before proceeding
    if (!bookingData.session_date) {
      toast.error('Please select a session date');
      return;
    }

    if (!bookingData.start_time || !bookingData.start_time.includes(':')) {
      toast.error('Please select a valid start time');
      return;
    }

    if (!bookingData.duration_minutes || isNaN(bookingData.duration_minutes) || bookingData.duration_minutes <= 0) {
      toast.error('Please select a service with a valid duration');
      return;
    }

    // Get credit cost from selected service (1 credit per minute)
    // serviceCreditCosts already contains duration_minutes for each service
    const selectedService = services.find(s => s.id === selectedServiceId);
    const requiredCredits = selectedService?.duration_minutes 
      ? selectedService.duration_minutes 
      : bookingData.duration_minutes;
    
    if (creditBalance < requiredCredits) {
      toast.error(`Insufficient credits. You need ${requiredCredits} credits but only have ${creditBalance}.`);
      return;
    }

    try {
      setLoading(true);

      // Calculate end time with validation
      const timeParts = bookingData.start_time.split(':');
      if (timeParts.length !== 2) {
        throw new Error('Invalid start time format');
      }

      const startHour = parseInt(timeParts[0], 10);
      const startMinute = parseInt(timeParts[1], 10);

      if (isNaN(startHour) || isNaN(startMinute) || startHour < 0 || startHour > 23 || startMinute < 0 || startMinute > 59) {
        throw new Error('Invalid start time values');
      }

      const durationMinutes = parseInt(String(bookingData.duration_minutes), 10);
      if (isNaN(durationMinutes) || durationMinutes <= 0) {
        throw new Error('Invalid duration');
      }

      const totalMinutes = startHour * 60 + startMinute + durationMinutes;
      const endHour = Math.floor(totalMinutes / 60) % 24; // Handle overflow past midnight
      const endMinute = totalMinutes % 60;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

      // Get the correct practitioner ID with fallback
      const practitionerId = practitioner.user_id || practitioner.id;
      
      // Validate practitioner ID is a non-empty string (UUID format)
      if (!practitionerId || typeof practitionerId !== 'string' || practitionerId.trim() === '') {
        console.error('Invalid practitioner ID:', { 
          practitioner, 
          user_id: practitioner.user_id, 
          id: practitioner.id,
          practitionerId 
        });
        toast.error('Invalid practitioner information. Please try again.');
        return;
      }
      
      // Basic UUID format validation (36 characters with hyphens)
      if (practitionerId.length < 30) {
        console.error('Practitioner ID appears to be invalid UUID:', practitionerId);
        toast.error('Invalid practitioner ID format. Please try again.');
        return;
      }

      // Send exchange request with selected service/product info
      // Credit cost will be calculated from duration_minutes (1 credit per minute)
      await TreatmentExchangeService.sendExchangeRequest(
        userProfile.id,
        practitionerId,
        {
          session_date: bookingData.session_date,
          start_time: bookingData.start_time,
          end_time: endTime,
          duration_minutes: bookingData.duration_minutes,
          session_type: bookingData.session_type, // This matches practitioner_products.name
          notes: ''
        }
      );

      toast.success('Treatment exchange request sent! The practitioner will review your request.');
      onOpenChange(false);
      if (onSuccess) onSuccess();
      
      // Reset form
      setStep(1);
      setBookingData({
        session_date: '',
        start_time: '',
        duration_minutes: 60,
        session_type: 'Treatment Exchange'
      });
    } catch (error: any) {
      console.error('Error sending request:', error);
      toast.error(error.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string | undefined | null) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Treatment Exchange</DialogTitle>
          <DialogDescription>
            Exchange treatments with {practitioner.first_name} {practitioner.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Service Selection */}
          {step === 1 && (
            <div className="space-y-4">
              {loadingServices ? (
                <div className="flex items-center justify-center p-8">
                  <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading services...</span>
                </div>
              ) : services.length === 0 ? (
                <div className="p-4 border rounded-lg text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    This practitioner has no active services available for treatment exchange.
                  </p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="service" className="text-base font-medium mb-2 block">Select Service</Label>
                  <Select
                    value={selectedServiceId}
                    onValueChange={(value) => {
                      setSelectedServiceId(value);
                      const selectedService = services.find(s => s.id === value);
                      if (selectedService) {
                        setBookingData(prev => ({
                          ...prev,
                          duration_minutes: selectedService.duration_minutes || 60,
                          session_type: selectedService.name
                        }));
                      }
                    }}
                  >
                    <SelectTrigger id="service" className="h-12 text-base bg-gray-50">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {services.map((service) => (
                        <SelectItem 
                          key={service.id} 
                          value={service.id} 
                          className="py-3 cursor-pointer focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900"
                        >
                          <div className="flex items-center justify-between w-full gap-4 min-w-0">
                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                              <span className="font-semibold text-base text-foreground leading-tight">
                                {service.name}
                              </span>
                              {service.duration_minutes && (
                                <span className="text-sm text-muted-foreground leading-tight">
                                  {service.duration_minutes} minutes
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-medium text-foreground whitespace-nowrap flex-shrink-0">
                              {serviceCreditCosts[service.id] ?? calculateCreditCost(service.duration_minutes || 60)} credits
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Card className="bg-muted">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Your Credit Balance:</span>
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-yellow-600" />
                      <span className="font-bold">{creditBalance} credits</span>
                    </div>
                  </div>
                  {(() => {
                    const selectedService = services.find(s => s.id === selectedServiceId);
                    const requiredCredits = selectedService?.duration_minutes ?? bookingData.duration_minutes;
                    return creditBalance < requiredCredits && (
                    <p className="text-xs text-destructive mt-2">
                        Insufficient credits. You need {requiredCredits} credits.
                    </p>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Date/Time Selection */}
          {step === 2 && selectedServiceId && (
            <div className="space-y-4">
              <CalendarTimeSelector
                therapistId={practitioner.user_id || practitioner.id}
                duration={bookingData.duration_minutes}
                selectedDate={bookingData.session_date}
                selectedTime={bookingData.start_time}
                onDateTimeSelect={(date, time) => {
                  setBookingData(prev => ({ ...prev, session_date: date, start_time: time }));
                }}
              />
              
              {bookingData.session_date && bookingData.start_time && (
                <div className="mt-4 bg-primary/10 border border-primary/20 p-3 rounded-lg flex items-center gap-2 text-sm justify-center">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Selected: <span className="font-semibold">{new Date(bookingData.session_date).toLocaleDateString()} at {formatTime(bookingData.start_time)}</span></span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Practitioner:</span>
                      <span className="font-medium">{practitioner.first_name} {practitioner.last_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Date:</span>
                      <span className="font-medium">
                        {new Date(bookingData.session_date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Time:</span>
                      <span className="font-medium">{formatTime(bookingData.start_time)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Duration:</span>
                      <span className="font-medium">{bookingData.duration_minutes} minutes</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Cost:</span>
                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-yellow-600" />
                        <span className="font-bold">{serviceCreditCosts[selectedServiceId] ?? bookingData.duration_minutes} credits</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Credits will only be deducted when the practitioner accepts your request. You can cancel before acceptance for a full refund.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
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
              <Button onClick={handleSubmit} disabled={loading || creditBalance < (serviceCreditCosts[selectedServiceId] ?? bookingData.duration_minutes)}>
                {loading ? 'Sending...' : 'Send Request'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

