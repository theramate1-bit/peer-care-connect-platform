import React, { useState } from 'react';
// import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'; // TEMPORARILY DISABLED
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface StripePaymentFormProps {
  amount: number;
  currency?: string;
  description?: string;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
  metadata?: Record<string, string>;
  disabled?: boolean;
  showAmount?: boolean;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
  hidePostalCode: false,
};

export const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  amount,
  currency = 'usd',
  description,
  onSuccess,
  onError,
  metadata = {},
  disabled = false,
  showAmount = true,
}) => {
  // const stripe = useStripe(); // TEMPORARILY DISABLED
  // const elements = useElements(); // TEMPORARILY DISABLED
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe has not loaded yet. Please try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setCardError(null);

    // TEMPORARY FIX: Skip card element validation in demo mode
    // const cardElement = elements.getElement(CardElement);
    // if (!cardElement) {
    //   onError('Card element not found. Please try again.');
    //   setIsProcessing(false);
    //   return;
    // }

    try {
      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          description,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret } = await response.json();

      // Confirm payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              // Add billing details if needed
            },
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        onError(stripeError.message || 'Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        setIsComplete(true);
        onSuccess(paymentIntent);
        toast.success('Payment successful!');
      } else {
        setError('Payment was not successful');
        onError('Payment was not successful');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardChange = (event: any) => {
    setCardError(event.error ? event.error.message : null);
  };

  if (isComplete) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-700 mb-2">Payment Successful!</h3>
            <p className="text-sm text-gray-600">
              Your payment has been processed successfully.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Details
        </CardTitle>
        <CardDescription>
          {description || 'Complete your payment securely with Stripe'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showAmount && (
          <>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium">Amount</span>
              <Badge variant="outline" className="text-lg font-semibold">
                ${amount.toFixed(2)} {currency.toUpperCase()}
              </Badge>
            </div>
            <Separator className="mb-4" />
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-element">Card Information</Label>
            <div className="p-3 border border-gray-200 rounded-md">
              <div className="text-sm text-gray-500">
                Demo Mode: Card input simulated
              </div>
            </div>
            {cardError && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {cardError}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Shield className="h-3 w-3" />
            <span>Your payment information is secure and encrypted</span>
          </div>

          <Button
            type="submit"
            disabled={!stripe || isProcessing || disabled}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay ${amount.toFixed(2)}
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>Powered by Stripe • Secure payment processing</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StripePaymentForm;
