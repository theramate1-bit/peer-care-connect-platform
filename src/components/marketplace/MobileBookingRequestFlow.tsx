import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Calendar as CalendarIcon, Clock, CreditCard, AlertCircle, User as UserIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SmartLocationPicker } from '@/components/ui/SmartLocationPicker';
import { formatCurrency } from '@/lib/utils';
import { formValidation } from '@/lib/form-utils';
import { isProductMobileBookable } from '@/lib/booking-flow-type';
import { CalendarTimeSelector } from '@/components/booking/CalendarTimeSelector';
import { BodyMap, type BodyMapMarker } from '@/components/forms/BodyMap';

interface Practitioner {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  therapist_type?: 'clinic_based' | 'mobile' | 'hybrid';
  mobile_service_radius_km?: number;
  stripe_connect_account_id?: string | null;
  base_latitude?: number | null;
  base_longitude?: number | null;
  clinic_latitude?: number | null;
  clinic_longitude?: number | null;
  products?: Array<{
    id: string;
    name: string;
    description: string;
    price_amount: number;
    currency: string;
    duration_minutes: number;
    service_type?: 'clinic' | 'mobile' | 'both' | null;
    is_active: boolean;
  }>;
}

interface MobileBookingRequestFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practitioner: Practitioner;
  clientLocation?: { lat: number; lon: number; address?: string } | null;
  initialDate?: string;
  initialTime?: string;
}

export const MobileBookingRequestFlow: React.FC<MobileBookingRequestFlowProps> = ({
  open,
  onOpenChange,
  practitioner,
  clientLocation,
  initialDate,
  initialTime
}) => {
  const { user, userProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [mobileServices, setMobileServices] = useState<typeof practitioner.products>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialDate ? new Date(initialDate) : undefined
  );
  const [selectedTime, setSelectedTime] = useState<string>(initialTime || '');
  const [clientAddress, setClientAddress] = useState<string>('');
  const [clientLatitude, setClientLatitude] = useState<number | null>(null);
  const [clientLongitude, setClientLongitude] = useState<number | null>(null);
  const [clientNotes, setClientNotes] = useState<string>('');
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [preAssessmentRequired, setPreAssessmentRequired] = useState(true);
  const [preAssessmentCanSkip, setPreAssessmentCanSkip] = useState(false);
  const [preAssessmentCheckedEmail, setPreAssessmentCheckedEmail] = useState<string>('');
  const [checkingPreAssessment, setCheckingPreAssessment] = useState(false);
  const [preAssessmentData, setPreAssessmentData] = useState({
    name: '',
    date_of_birth: '',
    contact_email: '',
    contact_phone: '',
    gp_name: '',
    gp_address: '',
    current_medical_conditions: '',
    past_medical_history: '',
    area_of_body: '',
    time_scale: '',
    how_issue_began: '',
    activities_affected: '',
    body_map_markers: [] as BodyMapMarker[],
  });
  const [guestData, setGuestData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });
  const [guestEmailError, setGuestEmailError] = useState<string>('');
  const [marketingConsent, setMarketingConsent] = useState(false);

  const getCandidateEmail = () => {
    if (user) return userProfile?.email || user.email || '';
    return guestData.email || '';
  };

  const validatePreAssessmentForStep = () => {
    if (!preAssessmentRequired || preAssessmentCanSkip) return true;
    return !!(
      preAssessmentData.name.trim() &&
      preAssessmentData.gp_name.trim() &&
      preAssessmentData.gp_address.trim()
    );
  };

  const checkPreAssessmentRequirementByEmail = async (email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || normalized === preAssessmentCheckedEmail) return;

    setCheckingPreAssessment(true);
    try {
      const { data, error } = await supabase.rpc('email_has_completed_pre_assessment', {
        p_email: normalized,
      });
      if (error) throw error;

      const recognized = data === true;
      setPreAssessmentRequired(!recognized);
      setPreAssessmentCanSkip(recognized);
      setPreAssessmentCheckedEmail(normalized);
    } catch (err) {
      console.error('Failed to check pre-assessment requirement:', err);
      setPreAssessmentRequired(true);
      setPreAssessmentCanSkip(false);
      setPreAssessmentCheckedEmail(normalized);
    } finally {
      setCheckingPreAssessment(false);
    }
  };

  // Load mobile services
  useEffect(() => {
    if (!open) return;

    const loadMobileServices = async () => {
      setServicesLoading(true);
      try {
        const localProducts = practitioner.products ?? [];
        const sourceProducts = localProducts.length > 0
          ? localProducts
          : (
              await supabase
                .from('practitioner_products')
                .select('id, name, description, price_amount, currency, duration_minutes, service_type, is_active')
                .eq('practitioner_id', practitioner.user_id)
                .eq('is_active', true)
            ).data ?? [];

        const mobile = sourceProducts.filter((p) => isProductMobileBookable(practitioner.therapist_type ?? null, p));
        setMobileServices(mobile);
        if (mobile.length === 1) {
          setSelectedServiceId(mobile[0].id);
        }
      } finally {
        setServicesLoading(false);
      }
    };

    loadMobileServices();
  }, [open, practitioner]);

  // Set client location from geo search if available
  useEffect(() => {
    if (clientLocation && clientLocation.address) {
      setClientAddress(clientLocation.address);
      setClientLatitude(clientLocation.lat);
      setClientLongitude(clientLocation.lon);
    }
  }, [clientLocation]);

  useEffect(() => {
    if (!open) return;
    if (!user) return;

    const fullName = `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim();
    setPreAssessmentData((prev) => ({
      ...prev,
      name: prev.name || fullName,
      contact_email: prev.contact_email || (userProfile?.email || user.email || ''),
      contact_phone: prev.contact_phone || (userProfile?.phone || ''),
    }));

    const candidateEmail = getCandidateEmail();
    if (candidateEmail) {
      void checkPreAssessmentRequirementByEmail(candidateEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, userProfile?.first_name, userProfile?.last_name, userProfile?.email, userProfile?.phone, user?.email]);

  useEffect(() => {
    if (!open || user) return;
    const fullName = `${guestData.first_name} ${guestData.last_name}`.trim();
    setPreAssessmentData((prev) => ({
      ...prev,
      name: fullName,
      contact_email: guestData.email,
      contact_phone: guestData.phone,
    }));
  }, [open, user, guestData.first_name, guestData.last_name, guestData.email, guestData.phone]);

  // Calculate distance when location is set
  useEffect(() => {
    if (clientLatitude !== null && clientLongitude !== null && practitioner.therapist_type) {
      const useBaseAddress = practitioner.therapist_type === 'mobile' || practitioner.therapist_type === 'hybrid';
      const baseLat = useBaseAddress
        ? practitioner.base_latitude
        : practitioner.clinic_latitude;
      const baseLon = useBaseAddress
        ? practitioner.base_longitude
        : practitioner.clinic_longitude;

      if (baseLat !== null && baseLat !== undefined && baseLon !== null && baseLon !== undefined) {
        const distance = calculateDistance(clientLatitude, clientLongitude, baseLat, baseLon);
        setDistanceKm(distance);
        
        // Check if within service radius
        if (practitioner.mobile_service_radius_km && distance > practitioner.mobile_service_radius_km) {
          setValidationError(
            `Your location is ${distance.toFixed(1)} km away, outside the practitioner's service radius of ${practitioner.mobile_service_radius_km} km.`
          );
        } else {
          setValidationError(null);
        }
      } else if (useBaseAddress) {
        setValidationError('This practitioner has no base coordinates configured yet for mobile requests.');
      }
    }
  }, [clientLatitude, clientLongitude, practitioner]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const selectedService = mobileServices?.find(s => s.id === selectedServiceId);

  const handleAddressChange = (address: string) => {
    setClientAddress(address);
    // If user edits the address text after selecting, require a fresh suggestion pick.
    setClientLatitude(null);
    setClientLongitude(null);
    setDistanceKm(null);
    setValidationError(null);
  };

  const handleLocationSelect = (lat: number, lon: number, address: string) => {
    setClientAddress(address);
    setClientLatitude(lat);
    setClientLongitude(lon);
  };

  const handleSubmit = async () => {
    if (
      !selectedServiceId ||
      !selectedDate ||
      !selectedTime ||
      !clientAddress ||
      clientLatitude === null ||
      clientLongitude === null
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!validatePreAssessmentForStep()) {
      toast.error('Please complete required pre-assessment fields (including GP details).');
      setStep(4);
      return;
    }

    setLoading(true);

    try {
      let clientId: string;
      let clientEmail: string;
      let clientName: string;

      if (user && userProfile) {
        clientId = user.id;
        clientEmail = userProfile.email || user.email || '';
        clientName = `${userProfile.first_name} ${userProfile.last_name}`;
      } else {
        if (!guestData.first_name || !guestData.last_name || !guestData.email || !guestData.phone) {
          throw new Error('Please complete your contact details.');
        }
        if (!formValidation.isValidEmail(guestData.email)) {
          throw new Error('Please enter a valid email address.');
        }

        const { data: guestUserData, error: guestError } = await supabase
          .rpc('upsert_guest_user', {
            p_email: guestData.email,
            p_first_name: guestData.first_name,
            p_last_name: guestData.last_name,
            p_phone: guestData.phone
          })
          .maybeSingle();

        if (guestError) throw guestError;
        if (!guestUserData?.id) throw new Error('Failed to create guest profile for mobile request');

        clientId = guestUserData.id;
        clientEmail = guestData.email;
        clientName = `${guestData.first_name} ${guestData.last_name}`;

        if (marketingConsent) {
          const { data: currentUser } = await supabase
            .from('users')
            .select('preferences')
            .eq('id', clientId)
            .single();

          await supabase
            .from('users')
            .update({
              preferences: {
                ...currentUser?.preferences,
                marketing_consent: true,
                marketing_consent_date: new Date().toISOString(),
                marketing_consent_source: 'guest_mobile_booking_request'
              }
            })
            .eq('id', clientId);
        }
      }

      // Create mobile booking request
      const preAssessmentPayload = {
        required: preAssessmentRequired,
        canSkip: preAssessmentCanSkip,
        completed_at: new Date().toISOString(),
        ...preAssessmentData,
      };

      const { data: requestData, error: requestError } = await supabase.rpc('create_mobile_booking_request', {
        p_client_id: clientId,
        p_practitioner_id: practitioner.user_id,
        p_product_id: selectedServiceId,
        p_requested_date: selectedDate.toISOString().split('T')[0],
        p_requested_start_time: selectedTime,
        p_duration_minutes: selectedService?.duration_minutes || 60,
        p_client_address: clientAddress,
        p_client_latitude: clientLatitude,
        p_client_longitude: clientLongitude,
        p_client_notes: clientNotes || null,
        p_pre_assessment_payload: preAssessmentPayload
      });

      if (requestError) {
        throw requestError;
      }

      if (!requestData?.success) {
        throw new Error(requestData?.error || 'Failed to create request');
      }

      // Persist context for post-checkout finalization and notifications.
      localStorage.setItem(
        `mobile_checkout_context_${requestData.request_id}`,
        JSON.stringify({
          requestId: requestData.request_id,
          practitionerId: practitioner.user_id,
          clientName,
          serviceType: selectedService?.name || 'Mobile Service',
          requestedDate: selectedDate.toISOString().split('T')[0],
          requestedTime: selectedTime,
          clientAddress,
          distanceKm: requestData.distance_km,
          price: selectedService.price_amount,
        })
      );

      // Create Stripe Checkout session that authorizes payment with manual capture.
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('mobile-payment', {
        body: {
          action: 'create-mobile-checkout-session',
          request_id: requestData.request_id,
          amount: selectedService.price_amount,
          currency: selectedService.currency || 'GBP',
          client_email: clientEmail,
          practitioner_id: practitioner.user_id,
          therapist_connect_account_id: practitioner.stripe_connect_account_id,
          metadata: {
            client_user_id: clientId,
            client_email: clientEmail,
            client_name: clientName,
            practitioner_name: `${practitioner.first_name} ${practitioner.last_name}`,
            service_name: selectedService.name,
            requested_date: selectedDate.toISOString().split('T')[0],
            requested_time: selectedTime
          }
        }
      });

      if (checkoutError) {
        throw checkoutError;
      }

      if (!checkoutData?.checkout_url) {
        throw new Error('Failed to initialize secure checkout for mobile request');
      }

      // Redirect user to Stripe Checkout to complete authorization hold.
      window.location.assign(checkoutData.checkout_url);

    } catch (error: unknown) {
      console.error('Error creating mobile booking request:', error);
      const message = error instanceof Error ? error.message : 'Failed to create mobile booking request';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Mobile Session</DialogTitle>
          <DialogDescription>
            Request a mobile session with {practitioner.first_name} {practitioner.last_name}
          </DialogDescription>
        </DialogHeader>

        {/* Step Progress Indicator */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Step {step} of 5
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round((step / 5) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className={`text-xs ${step >= 1 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Service</span>
            <span className={`text-xs ${step >= 2 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Date & Time</span>
            <span className={`text-xs ${step >= 3 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Location</span>
            <span className={`text-xs ${step >= 4 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Pre-Assessment</span>
            <span className={`text-xs ${step >= 5 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Review</span>
          </div>
        </div>

        <div className="space-y-6 py-4">
          {/* Step 1: Select Service */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Select Mobile Service</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">
                  Choose a service that will be delivered at your location
                </p>
                <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                  <SelectTrigger disabled={servicesLoading || !mobileServices || mobileServices.length === 0}>
                    <SelectValue placeholder={servicesLoading ? 'Loading services...' : 'Choose a service'} />
                  </SelectTrigger>
                  <SelectContent>
                    {mobileServices?.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - {formatCurrency(service.price_amount / 100)} - {service.duration_minutes} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!mobileServices || mobileServices.length === 0) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    No mobile services are currently configured for this practitioner.
                  </p>
                )}
              </div>

              {selectedService && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{selectedService.name}</span>
                    <span className="text-lg font-semibold">
                      {formatCurrency(selectedService.price_amount / 100)}
                    </span>
                  </div>
                  {selectedService.description && (
                    <p className="text-sm text-muted-foreground">{selectedService.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{selectedService.duration_minutes} minutes</span>
                  </div>
                </div>
              )}

              <Button 
                onClick={() => setStep(2)} 
                disabled={!selectedServiceId}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-4">
              <CalendarTimeSelector
                therapistId={practitioner.user_id}
                duration={selectedService?.duration_minutes || 60}
                requestedAppointmentType="mobile"
                therapistType={practitioner.therapist_type ?? null}
                selectedDate={selectedDate ? selectedDate.toISOString().split('T')[0] : undefined}
                selectedTime={selectedTime}
                onDateTimeSelect={(date, time) => {
                  setSelectedDate(date ? new Date(date) : undefined);
                  setSelectedTime(time);
                }}
              />

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  disabled={!selectedDate || !selectedTime}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Your Address for Mobile Session</Label>
                <SmartLocationPicker
                  value={clientAddress}
                  onChange={handleAddressChange}
                  onLocationSelect={handleLocationSelect}
                  placeholder="Enter your address"
                />
              </div>

              {distanceKm !== null && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Distance: <strong>{distanceKm.toFixed(1)} km</strong> from practitioner's base
                    </span>
                  </div>
                  {practitioner.mobile_service_radius_km && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Service radius: {practitioner.mobile_service_radius_km} km
                    </div>
                  )}
                </div>
              )}

              {validationError && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{validationError}</p>
                </div>
              )}

              <div>
                <Label>Additional Notes (Optional)</Label>
                <Textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Any special instructions or notes for the practitioner..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(4)} 
                  disabled={!(
                    clientAddress &&
                    Number.isFinite(clientLatitude) &&
                    Number.isFinite(clientLongitude) &&
                    !validationError
                  )}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Pre-Assessment (same new-user logic as regular booking flow) */}
          {step === 4 && (
            <div className="space-y-4">
              {!user && (
                <div className="space-y-3 rounded-lg border p-4 bg-blue-50/50">
                  <div className="flex items-start gap-2">
                    <UserIcon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium">Booking as Guest</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        We need your details before we can submit your request.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="guest-first-name">First Name *</Label>
                        <Input
                          id="guest-first-name"
                          value={guestData.first_name}
                          onChange={(e) => setGuestData(prev => ({ ...prev, first_name: e.target.value }))}
                          placeholder="First name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="guest-last-name">Last Name *</Label>
                        <Input
                          id="guest-last-name"
                          value={guestData.last_name}
                          onChange={(e) => setGuestData(prev => ({ ...prev, last_name: e.target.value }))}
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="guest-email">Email *</Label>
                      <Input
                        id="guest-email"
                        type="email"
                        value={guestData.email}
                        onChange={(e) => {
                          const email = e.target.value;
                          setGuestData(prev => ({ ...prev, email }));
                          if (guestEmailError) setGuestEmailError('');
                        }}
                        onBlur={(e) => {
                          const email = e.target.value.trim();
                          if (email && !formValidation.isValidEmail(email)) {
                            setGuestEmailError('Please enter a valid email address');
                            return;
                          }
                          setGuestEmailError('');
                          if (email) {
                            void checkPreAssessmentRequirementByEmail(email);
                          }
                        }}
                        placeholder="you@example.com"
                      />
                      {guestEmailError && <p className="text-xs text-destructive mt-1">{guestEmailError}</p>}
                    </div>
                    <div>
                      <Label htmlFor="guest-phone">Phone *</Label>
                      <Input
                        id="guest-phone"
                        type="tel"
                        value={guestData.phone}
                        onChange={(e) => setGuestData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="flex items-start space-x-2 pt-1">
                      <Checkbox
                        id="mobile-guest-marketing"
                        checked={marketingConsent}
                        onCheckedChange={(checked) => setMarketingConsent(checked === true)}
                      />
                      <Label htmlFor="mobile-guest-marketing" className="text-xs text-muted-foreground leading-relaxed">
                        I agree to receive occasional marketing updates. You can unsubscribe anytime.
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-lg border p-4 space-y-3">
                <div>
                  <h4 className="font-medium">Pre-Assessment</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {preAssessmentRequired && !preAssessmentCanSkip
                      ? 'Required for new clients before submitting a mobile booking request.'
                      : 'Optional for returning clients.'}
                  </p>
                </div>

                {checkingPreAssessment && (
                  <p className="text-xs text-muted-foreground">Checking pre-assessment requirement...</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Full Name {preAssessmentRequired && !preAssessmentCanSkip ? '*' : ''}</Label>
                    <Input
                      value={preAssessmentData.name}
                      onChange={(e) => setPreAssessmentData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={preAssessmentData.date_of_birth}
                      onChange={(e) => setPreAssessmentData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label>GP Name {preAssessmentRequired && !preAssessmentCanSkip ? '*' : ''}</Label>
                    <Input
                      value={preAssessmentData.gp_name}
                      onChange={(e) => setPreAssessmentData(prev => ({ ...prev, gp_name: e.target.value }))}
                      placeholder="Your GP name"
                    />
                  </div>
                  <div>
                    <Label>GP Address {preAssessmentRequired && !preAssessmentCanSkip ? '*' : ''}</Label>
                    <SmartLocationPicker
                      id="mobile-gp-address"
                      value={preAssessmentData.gp_address}
                      onChange={(value) => setPreAssessmentData(prev => ({ ...prev, gp_address: value }))}
                      placeholder="Start typing GP address..."
                    />
                  </div>
                </div>

                <div>
                  <Label>Current Medical Conditions</Label>
                  <Textarea
                    value={preAssessmentData.current_medical_conditions}
                    onChange={(e) => setPreAssessmentData(prev => ({ ...prev, current_medical_conditions: e.target.value }))}
                    placeholder="List any current medical conditions, medications, or health concerns"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Past Medical History</Label>
                  <Textarea
                    value={preAssessmentData.past_medical_history}
                    onChange={(e) => setPreAssessmentData(prev => ({ ...prev, past_medical_history: e.target.value }))}
                    placeholder="Any relevant past medical history, surgeries, or injuries"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Area of Body Needing Attention</Label>
                    <Input
                      value={preAssessmentData.area_of_body}
                      onChange={(e) => setPreAssessmentData(prev => ({ ...prev, area_of_body: e.target.value }))}
                      placeholder="e.g., Lower back, Right knee"
                    />
                  </div>
                  <div>
                    <Label>How Long Has This Been an Issue?</Label>
                    <Select
                      value={preAssessmentData.time_scale || ''}
                      onValueChange={(value) => setPreAssessmentData(prev => ({ ...prev, time_scale: value }))}
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
                </div>

                <div>
                  <Label>How Did This Issue Begin?</Label>
                  <Textarea
                    value={preAssessmentData.how_issue_began}
                    onChange={(e) => setPreAssessmentData(prev => ({ ...prev, how_issue_began: e.target.value }))}
                    placeholder="Describe how this issue started"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Activities Affected</Label>
                  <Textarea
                    value={preAssessmentData.activities_affected}
                    onChange={(e) => setPreAssessmentData(prev => ({ ...prev, activities_affected: e.target.value }))}
                    placeholder="What movements or daily tasks are affected?"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Body Map (Optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Mark affected areas to help your practitioner prepare.
                  </p>
                  <BodyMap
                    markers={preAssessmentData.body_map_markers}
                    onMarkersChange={(markers) => setPreAssessmentData(prev => ({ ...prev, body_map_markers: markers }))}
                    maxMarkers={5}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={async () => {
                    const candidateEmail = getCandidateEmail();
                    if (candidateEmail && candidateEmail.trim().toLowerCase() !== preAssessmentCheckedEmail) {
                      await checkPreAssessmentRequirementByEmail(candidateEmail);
                    }
                    setStep(5);
                  }}
                  disabled={
                    checkingPreAssessment ||
                    (!user && (
                      !guestData.first_name ||
                      !guestData.last_name ||
                      !guestData.email ||
                      !guestData.phone ||
                      !!guestEmailError ||
                      !formValidation.isValidEmail(guestData.email)
                    )) ||
                    !validatePreAssessmentForStep()
                  }
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Review & Payment */}
          {step === 5 && selectedService && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div>
                  <h4 className="font-medium mb-1">Service</h4>
                  <p className="text-sm text-muted-foreground">{selectedService.name}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Date & Time</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedDate?.toLocaleDateString()} at {selectedTime}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Location</h4>
                  <p className="text-sm text-muted-foreground">{clientAddress}</p>
                  {distanceKm !== null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {distanceKm.toFixed(1)} km from practitioner's base
                    </p>
                  )}
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total Amount</span>
                    <span className="text-lg font-semibold">
                      {formatCurrency(selectedService.price_amount / 100)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Payment will be held and only charged if the practitioner accepts your request
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="text-sm font-medium mb-2">Pre-Assessment Status</p>
                <p className="text-xs text-muted-foreground">
                  {preAssessmentRequired && !preAssessmentCanSkip
                    ? 'Required pre-assessment captured for this request.'
                    : 'Returning client pre-assessment logic applied.'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={
                    loading
                  }
                  className="flex-1"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
