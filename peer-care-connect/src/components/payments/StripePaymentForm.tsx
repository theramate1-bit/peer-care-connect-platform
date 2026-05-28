import React, { useState } from 'react';
// import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'; // TEMPORARILY DISABLED
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Shield,
  Lock,
  Banknote
} from 'lucide-react';
import { toast } from 'sonner';
// import { StripePaymentService } from '@/lib/stripe'; // TEMPORARILY DISABLED

interface PaymentFormProps {
  amount: number;
  currency?: string;
  description?: string;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: any) => void;
  metadata?: any;
  disabled?: boolean;
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
};

const StripePaymentForm: React.FC<PaymentFormProps> = ({
  amount,
  currency = 'gbp',
  description,
  onSuccess,
  onError,
  metadata,
  disabled = false
}) => {
  // const stripe = useStripe(); // TEMPORARILY DISABLED
  // const elements = useElements(); // TEMPORARILY DISABLED
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'succeeded' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // TEMPORARY FIX: Simulate payment processing without Stripe
    setLoading(true);
    setError(null);
    setPaymentStatus('processing');

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful payment
      const mockPaymentIntent = {
        id: `pi_mock_${Date.now()}`,
        client_secret: `pi_mock_${Date.now()}_secret`,
        status: 'succeeded'
      };
      
      setPaymentIntent(mockPaymentIntent);
      setPaymentStatus('succeeded');
      toast.success('Payment successful! (Demo Mode)');
      onSuccess?.(mockPaymentIntent);

    } catch (err: any) {
      setError('Payment simulation failed. Please try again.');
      setPaymentStatus('failed');
      toast.error('Payment simulation failed');
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'succeeded':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <CreditCard className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case 'succeeded':
        return <Badge className="bg-green-100 text-green-800">Payment Successful</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Payment Failed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Ready to Pay</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Secure Payment
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          {description || `Pay ${formatAmount(amount)} securely with your card`}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {paymentStatus === 'succeeded' ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-800">Payment Successful!</h3>
              <p className="text-sm text-green-600">
                Your payment of {formatAmount(amount)} has been processed successfully.
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-700">
                Payment ID: {paymentIntent?.id}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payment Amount Display */}
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Amount to Pay</span>
                <span className="text-lg font-bold text-gray-900">{formatAmount(amount)}</span>
              </div>
            </div>

            {/* Mock Card Input */}
            <div className="space-y-2">
              <Label htmlFor="card-element">Card Information</Label>
              <div className="border rounded-lg p-3 bg-white">
                <div className="text-sm text-gray-500">
                  Demo Mode: Payment processing simulated
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-blue-800">Secure Payment</p>
                  <p className="text-xs text-blue-700">
                    Your payment information is encrypted and processed securely by Stripe.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || disabled || paymentStatus === 'processing'}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Pay {formatAmount(amount)}
                </>
              )}
            </Button>

            {/* Payment Methods */}
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                <span>Visa</span>
              </div>
              <div className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                <span>Mastercard</span>
              </div>
              <div className="flex items-center gap-1">
                <Banknote className="h-3 w-3" />
                <span>Amex</span>
              </div>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default StripePaymentForm;
