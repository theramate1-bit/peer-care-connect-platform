import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  PoundSterling, 
  Calendar, 
  CreditCard,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PractitionerProduct } from '@/lib/stripe-products';
import { formatAmount, getFeeBreakdown } from '@/config/platform-fees';

interface ProductBookingCardProps {
  product: PractitionerProduct;
  practitioner: {
    id: string;
    first_name: string;
    last_name: string;
    user_role: string;
    location?: string;
  };
  clientEmail?: string;
}

export const ProductBookingCard: React.FC<ProductBookingCardProps> = ({
  product,
  practitioner,
  clientEmail,
}) => {
  const [isBooking, setIsBooking] = useState(false);

  // Early return if practitioner is not provided
  if (!practitioner) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Practitioner information is not available.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const handleBookNow = async () => {
    if (!clientEmail) {
      toast.error('Please provide your email address to book');
      return;
    }

    if (!practitioner) {
      toast.error('Practitioner information is missing');
      return;
    }

    try {
      setIsBooking(true);

      // Get session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Your session has expired. Please refresh the page.');
        setIsBooking(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('stripe-payment', {
        body: {
          action: 'create-checkout-session',
          practitioner_id: practitioner.id,
          price_id: product.stripe_price_id,
          client_email: clientEmail,
          client_name: `${practitioner.first_name || ''} ${practitioner.last_name || ''}`.trim(),
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error creating checkout session:', error);
        toast.error(error.message || 'Failed to create booking session');
        return;
      }

      if (data?.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
      } else {
        toast.error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Error booking service:', error);
      toast.error('Failed to create booking session');
    } finally {
      setIsBooking(false);
    }
  };

  const feeBreakdown = getFeeBreakdown(product.price_amount);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{product.name}</span>
          <Badge variant="default">Available</Badge>
        </CardTitle>
        <CardDescription>
          with {practitioner?.first_name || ''} {practitioner?.last_name || ''}
          {practitioner?.location && ` • ${practitioner.location}`}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {product.description && (
          <p className="text-sm text-muted-foreground">
            {product.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <PoundSterling className="h-4 w-4" />
            <span className="font-medium text-lg">{feeBreakdown.formattedTotal}</span>
          </div>
          
          {product.duration_minutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{product.duration_minutes} minutes</span>
            </div>
          )}
        </div>

        {/* Fee breakdown */}
        <div className="bg-muted p-3 rounded-lg text-sm">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Service Price:</span>
              <span>{feeBreakdown.formattedTotal}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Platform Fee (0.5%):</span>
              <span>-{feeBreakdown.formattedApplicationFee}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Stripe Fee (~1.4%):</span>
              <span>-{formatAmount(Math.round(product.price_amount * 0.014))}</span>
            </div>
            <hr className="my-1" />
            <div className="flex justify-between font-medium">
              <span>Practitioner Receives:</span>
              <span>{formatAmount(feeBreakdown.practitionerAmount - Math.round(product.price_amount * 0.014))}</span>
            </div>
          </div>
        </div>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Secure Payment:</strong> Your payment is processed securely through Stripe. 
            The practitioner will receive their payment automatically after the session.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={handleBookNow} 
          disabled={isBooking}
          className="w-full"
          size="lg"
        >
          {isBooking ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Booking...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Book & Pay Now
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground text-center">
          <p>✓ Instant confirmation</p>
          <p>✓ Secure payment processing</p>
          <p>✓ Automatic payout to practitioner</p>
        </div>
      </CardContent>
    </Card>
  );
};
