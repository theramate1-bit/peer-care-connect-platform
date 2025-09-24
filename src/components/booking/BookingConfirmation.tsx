import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, User, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { BookingValidationResult } from '@/lib/booking-validation';

interface BookingConfirmationProps {
  practitioner: {
    user_id: string;
    first_name: string;
    last_name: string;
    hourly_rate: number;
    specializations: string[];
  };
  sessionDetails: {
    date: string;
    time: string;
    duration: number;
    type: string;
  };
  validation: BookingValidationResult;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  practitioner,
  sessionDetails,
  validation,
  onConfirm,
  onCancel,
  loading = false
}) => {
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
    return (practitioner.hourly_rate * sessionDetails.duration) / 60;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Validation Results */}
      {!validation.isValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Booking cannot be confirmed due to the following issues:</p>
              <ul className="list-disc list-inside space-y-1">
                {validation.conflicts.map((conflict, index) => (
                  <li key={index}>{conflict.message}</li>
                ))}
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validation.warnings.map((warning, index) => (
                <p key={index}>{warning}</p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Confirmation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Confirm Your Booking
          </CardTitle>
          <CardDescription>
            Please review your booking details before proceeding to payment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Practitioner Details */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Practitioner
            </h4>
            <div className="pl-6 space-y-2">
              <p className="font-medium">
                {practitioner.first_name} {practitioner.last_name}
              </p>
              <div className="flex flex-wrap gap-1">
                {practitioner.specializations.map((spec, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {spec.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                £{practitioner.hourly_rate}/hour
              </p>
            </div>
          </div>

          {/* Session Details */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Session Details
            </h4>
            <div className="pl-6 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(sessionDetails.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">{formatTime(sessionDetails.time)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{formatDuration(sessionDetails.duration)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{sessionDetails.type.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Pricing
            </h4>
            <div className="pl-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Session fee</span>
                <span>£{calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Platform fee (3%)</span>
                <span>£{(calculateTotal() * 0.03).toFixed(2)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>£{(calculateTotal() * 1.03).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">Important Information</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• You will be charged immediately upon confirmation</li>
              <li>• Cancellations must be made at least 24 hours in advance for a full refund</li>
              <li>• You will receive a confirmation email with session details</li>
              <li>• The practitioner will be notified of your booking</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Back to Edit
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!validation.isValid || loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                'Confirm & Pay'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingConfirmation;
