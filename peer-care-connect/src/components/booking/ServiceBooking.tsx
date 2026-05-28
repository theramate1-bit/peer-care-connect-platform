/**
 * Service Booking Component
 * Handles booking sessions with custom pricing and Stripe integration
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  PoundSterling, 
  User as UserIcon, 
  MapPin,
  CreditCard,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { PractitionerService } from '@/services/practitionerServices';
import { BookingRequest, createBooking } from '@/services/bookingService';
import { formatPrice, getServiceTypeDisplayName } from '@/utils/pricing';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { SessionNotifications } from '@/lib/session-notifications';

interface ServiceBookingProps {
  service: PractitionerService;
  onBookingComplete?: (bookingId: string) => void;
  onCancel?: () => void;
}

const ServiceBooking: React.FC<ServiceBookingProps> = ({ 
  service, 
  onBookingComplete, 
  onCancel 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'payment' | 'confirmation'>('details');
  const [formData, setFormData] = useState({
    sessionDate: '',
    sessionTime: '',
    clientNotes: ''
  });
  const [booking, setBooking] = useState<any>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please log in to book a session');
      return;
    }

    try {
      setLoading(true);
      
      const sessionDateTime = new Date(`${formData.sessionDate}T${formData.sessionTime}`);
      
      const bookingRequest: BookingRequest = {
        serviceId: service.id,
        clientId: user.id,
        sessionDate: sessionDateTime,
        clientNotes: formData.clientNotes
      };

      const result = await createBooking(bookingRequest);
      setBooking(result.booking);
      setPaymentIntent(result.paymentIntent);
      setStep('payment');
      
      // Send notification for booking created
      await SessionNotifications.sendNotification({
        trigger: 'booking_created',
        sessionId: result.booking.id,
        clientId: user.id,
        practitionerId: service.practitioner_id
      });
      
      toast.success('Booking created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setStep('confirmation');
    onBookingComplete?.(booking.id);
    toast.success('Payment successful! Your session is confirmed.');
  };

  const handlePaymentError = () => {
    toast.error('Payment failed. Please try again.');
  };

  const getPriceInPounds = (pence: number) => (pence / 100).toFixed(2);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Service Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Book Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{service.service_name}</h3>
                <Badge variant="outline" className="mt-1">
                  {getServiceTypeDisplayName(service.service_type)}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{formatPrice(service.base_price_pence)}</div>
                <div className="text-sm text-muted-foreground">per session</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{service.duration_minutes} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <PoundSterling className="w-4 h-4 text-muted-foreground" />
                <span>4% platform fee included</span>
              </div>
            </div>

            {service.description && (
              <p className="text-sm text-muted-foreground">{service.description}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Booking Form */}
      {step === 'details' && (
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sessionDate">Date</Label>
                  <Input
                    id="sessionDate"
                    type="date"
                    value={formData.sessionDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, sessionDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sessionTime">Time</Label>
                  <Input
                    id="sessionTime"
                    type="time"
                    value={formData.sessionTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, sessionTime: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="clientNotes">Notes (Optional)</Label>
                <Textarea
                  id="clientNotes"
                  value={formData.clientNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientNotes: e.target.value }))}
                  placeholder="Any specific requirements or information for your session..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Creating Booking...' : 'Continue to Payment'}
                </Button>
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Payment */}
      {step === 'payment' && paymentIntent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Booking Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Service:</span>
                    <span>{service.service_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{service.duration_minutes} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span>{new Date(`${formData.sessionDate}T${formData.sessionTime}`).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>{formatPrice(service.base_price_pence)}</span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  You will be redirected to Stripe to complete your payment securely.
                </p>
                <Button 
                  onClick={handlePaymentSuccess}
                  className="w-full"
                >
                  Pay with Stripe
                </Button>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('details')}
                  className="flex-1"
                >
                  Back to Details
                </Button>
                {onCancel && (
                  <Button variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation */}
      {step === 'confirmation' && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Booking Confirmed!</h3>
            <p className="text-muted-foreground mb-6">
              Your session has been booked and payment processed successfully.
            </p>
            <div className="space-y-2 text-sm">
              <p><strong>Service:</strong> {service.service_name}</p>
              <p><strong>Date & Time:</strong> {new Date(`${formData.sessionDate}T${formData.sessionTime}`).toLocaleString()}</p>
              <p><strong>Duration:</strong> {service.duration_minutes} minutes</p>
              <p><strong>Total Paid:</strong> {formatPrice(service.base_price_pence)}</p>
            </div>
            <Button onClick={() => navigate('/client/dashboard')} className="mt-6">
              View My Bookings
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServiceBooking;



