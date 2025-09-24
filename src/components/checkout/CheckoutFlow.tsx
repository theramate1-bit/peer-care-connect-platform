import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Smartphone, 
  Shield, 
  Lock, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Star,
  Heart
} from 'lucide-react';
// import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'; // TEMPORARILY DISABLED
import { TrustIndicators } from '@/components/trust/TrustIndicators';
import { ProgressIndicator } from '@/components/journey/ProgressIndicator';

interface CheckoutStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'upcoming';
}

interface BookingDetails {
  therapistId: string;
  therapistName: string;
  sessionType: string;
  duration: number;
  price: number;
  date: string;
  time: string;
  location: string;
}

interface CheckoutFlowProps {
  bookingDetails: BookingDetails;
  onComplete: (paymentData: any) => void;
  onCancel: () => void;
  className?: string;
}

export const CheckoutFlow: React.FC<CheckoutFlowProps> = ({
  bookingDetails,
  onComplete,
  onCancel,
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGuest, setIsGuest] = useState(false);
  const [userInfo, setUserInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postcode: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [billingAddress, setBillingAddress] = useState({
    sameAsContact: true,
    address: '',
    city: '',
    postcode: ''
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const steps: CheckoutStep[] = [
    {
      id: 'review',
      title: 'Review Booking',
      description: 'Confirm your session details',
      icon: <Calendar className="h-5 w-5" />,
      status: 'current'
    },
    {
      id: 'contact',
      title: 'Contact Information',
      description: 'Enter your details',
      icon: <User className="h-5 w-5" />,
      status: 'upcoming'
    },
    {
      id: 'payment',
      title: 'Payment Method',
      description: 'Choose how to pay',
      icon: <CreditCard className="h-5 w-5" />,
      status: 'upcoming'
    },
    {
      id: 'confirm',
      title: 'Confirmation',
      description: 'Complete your booking',
      icon: <CheckCircle className="h-5 w-5" />,
      status: 'upcoming'
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      updateStepStatus(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateStepStatus = (stepIndex: number) => {
    steps.forEach((step, index) => {
      if (index < stepIndex) {
        step.status = 'completed';
      } else if (index === stepIndex) {
        step.status = 'current';
      } else {
        step.status = 'upcoming';
      }
    });
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const paymentData = {
        bookingDetails,
        userInfo,
        paymentMethod,
        billingAddress,
        termsAccepted
      };
      
      onComplete(paymentData);
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">Session Details</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Therapist:</span>
            <span className="font-medium">{bookingDetails.therapistName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Session Type:</span>
            <span className="font-medium">{bookingDetails.sessionType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Duration:</span>
            <span className="font-medium">{bookingDetails.duration} minutes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date & Time:</span>
            <span className="font-medium">{bookingDetails.date} at {bookingDetails.time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Location:</span>
            <span className="font-medium">{bookingDetails.location}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>£{bookingDetails.price}</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">What's Included:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Professional therapy session</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Post-session notes and recommendations</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Follow-up support</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Money-back guarantee</span>
          </li>
        </ul>
      </div>
    </div>
  );

  const renderContactStep = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant={isGuest ? "outline" : "default"}
          onClick={() => setIsGuest(false)}
          className="flex-1"
        >
          <User className="h-4 w-4 mr-2" />
          Create Account
        </Button>
        <Button
          variant={isGuest ? "default" : "outline"}
          onClick={() => setIsGuest(true)}
          className="flex-1"
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Guest Checkout
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={userInfo.firstName}
            onChange={(e) => setUserInfo(prev => ({ ...prev, firstName: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={userInfo.lastName}
            onChange={(e) => setUserInfo(prev => ({ ...prev, lastName: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          value={userInfo.email}
          onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          type="tel"
          value={userInfo.phone}
          onChange={(e) => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="address">Address *</Label>
        <Input
          id="address"
          value={userInfo.address}
          onChange={(e) => setUserInfo(prev => ({ ...prev, address: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={userInfo.city}
            onChange={(e) => setUserInfo(prev => ({ ...prev, city: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="postcode">Postcode *</Label>
          <Input
            id="postcode"
            value={userInfo.postcode}
            onChange={(e) => setUserInfo(prev => ({ ...prev, postcode: e.target.value }))}
            required
          />
        </div>
      </div>

      {!isGuest && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-2">Benefits of Creating an Account:</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Save your preferences for faster future bookings</li>
            <li>• Track your session history and progress</li>
            <li>• Access exclusive member benefits</li>
            <li>• Manage your appointments easily</li>
          </ul>
        </div>
      )}
    </div>
  );

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-4">Choose Payment Method</h3>
        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="card" id="card" />
              <Label htmlFor="card" className="flex-1 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Credit/Debit Card</div>
                    <div className="text-sm text-gray-600">Visa, Mastercard, American Express</div>
                  </div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="apple-pay" id="apple-pay" />
              <Label htmlFor="apple-pay" className="flex-1 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <Smartphone className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Apple Pay</div>
                    <div className="text-sm text-gray-600">Pay with Touch ID or Face ID</div>
                  </div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="google-pay" id="google-pay" />
              <Label htmlFor="google-pay" className="flex-1 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <Smartphone className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Google Pay</div>
                    <div className="text-sm text-gray-600">Quick and secure payment</div>
                  </div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="paypal" id="paypal" />
              <Label htmlFor="paypal" className="flex-1 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5" />
                  <div>
                    <div className="font-medium">PayPal</div>
                    <div className="text-sm text-gray-600">Pay with your PayPal account</div>
                  </div>
                </div>
              </Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {paymentMethod === 'card' && (
        <div className="space-y-4">
          <div>
            <Label>Card Details</Label>
            <div className="mt-2 p-4 border rounded-lg">
              <div className="text-sm text-gray-500 p-4">
                Demo Mode: Card input simulated
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="billing-same"
              checked={billingAddress.sameAsContact}
              onCheckedChange={(checked) => 
                setBillingAddress(prev => ({ ...prev, sameAsContact: checked as boolean }))
              }
            />
            <Label htmlFor="billing-same">Billing address same as contact address</Label>
          </div>

          {!billingAddress.sameAsContact && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="billing-address">Billing Address</Label>
                <Input
                  id="billing-address"
                  value={billingAddress.address}
                  onChange={(e) => setBillingAddress(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billing-city">City</Label>
                  <Input
                    id="billing-city"
                    value={billingAddress.city}
                    onChange={(e) => setBillingAddress(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="billing-postcode">Postcode</Label>
                  <Input
                    id="billing-postcode"
                    value={billingAddress.postcode}
                    onChange={(e) => setBillingAddress(prev => ({ ...prev, postcode: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-blue-900">Secure Payment</span>
        </div>
        <p className="text-sm text-blue-800">
          Your payment information is encrypted and secure. We never store your card details.
        </p>
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Ready to Complete Your Booking</h3>
        <p className="text-gray-600">Review your details and confirm your payment</p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-3">Booking Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Session with {bookingDetails.therapistName}</span>
            <span>£{bookingDetails.price}</span>
          </div>
          <div className="flex justify-between">
            <span>Date & Time</span>
            <span>{bookingDetails.date} at {bookingDetails.time}</span>
          </div>
          <div className="flex justify-between">
            <span>Duration</span>
            <span>{bookingDetails.duration} minutes</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>£{bookingDetails.price}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
          />
          <Label htmlFor="terms" className="text-sm">
            I agree to the <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="newsletter"
            checked={newsletterOptIn}
            onCheckedChange={(checked) => setNewsletterOptIn(checked as boolean)}
          />
          <Label htmlFor="newsletter" className="text-sm">
            Send me updates about new therapists and special offers
          </Label>
        </div>
      </div>

      <div className="bg-green-50 p-4 rounded-lg">
        <h4 className="font-semibold text-green-900 mb-2">Money-Back Guarantee</h4>
        <p className="text-sm text-green-800">
          If you're not satisfied with your session, we'll provide a full refund within 24 hours.
        </p>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderReviewStep();
      case 1:
        return renderContactStep();
      case 2:
        return renderPaymentStep();
      case 3:
        return renderConfirmStep();
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true;
      case 1:
        return userInfo.firstName && userInfo.lastName && userInfo.email && userInfo.phone;
      case 2:
        return paymentMethod && (paymentMethod !== 'card' || billingAddress.sameAsContact || billingAddress.address);
      case 3:
        return termsAccepted;
      default:
        return false;
    }
  };

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-2xl">Complete Your Booking</CardTitle>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex flex-col items-center space-y-2 ${
                  index <= currentStep ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index < currentStep ? 'bg-green-600 text-white' :
                  index === currentStep ? 'bg-blue-600 text-white' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {index < currentStep ? <CheckCircle className="h-4 w-4" /> : step.icon}
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium">{step.title}</div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {renderCurrentStep()}

          {/* Trust Indicators */}
          <div className="mt-6">
            <TrustIndicators variant="minimal" className="justify-center" />
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <div>
              {currentStep > 0 && (
                <Button variant="outline" onClick={handlePrevious}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
            </div>
            <div>
              {currentStep === steps.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Complete Booking
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutFlow;
