import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  CreditCard, 
  Smartphone, 
  Shield,
  Lock,
  Calendar,
  Clock,
  MapPin,
  User as UserIcon,
  Mail,
  Phone,
  Star
} from 'lucide-react';

interface MobileCheckoutProps {
  bookingDetails: {
    therapistName: string;
    sessionType: string;
    duration: number;
    price: number;
    date: string;
    time: string;
    location: string;
  };
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export const MobileCheckout: React.FC<MobileCheckoutProps> = ({
  bookingDetails,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userInfo, setUserInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isGuest, setIsGuest] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const steps = [
    { id: 'review', title: 'Review', icon: <Calendar className="h-4 w-4" /> },
    { id: 'details', title: 'Details', icon: <UserIcon className="h-4 w-4" /> },
    { id: 'payment', title: 'Payment', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'confirm', title: 'Confirm', icon: <CheckCircle className="h-4 w-4" /> }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsProcessing(true);
      try {
        await Promise.resolve(onComplete({ userInfo, paymentMethod, isGuest, termsAccepted }));
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true;
      case 1:
        return userInfo.firstName && userInfo.lastName && userInfo.email && userInfo.phone;
      case 2:
        return paymentMethod;
      case 3:
        return termsAccepted;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Session Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Therapist:</span>
                  <span className="font-medium">{bookingDetails.therapistName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">{bookingDetails.sessionType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{bookingDetails.duration} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{bookingDetails.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{bookingDetails.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium">{bookingDetails.location}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>£{bookingDetails.price}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                What's Included
              </h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Professional therapy session</li>
                <li>• Post-session notes</li>
                <li>• Follow-up support</li>
                <li>• Money-back guarantee</li>
              </ul>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="flex space-x-2 mb-4">
              <Button
                variant={isGuest ? "outline" : "default"}
                onClick={() => setIsGuest(false)}
                className="flex-1 text-sm"
              >
                <UserIcon className="h-4 w-4 mr-1" />
                Account
              </Button>
              <Button
                variant={isGuest ? "default" : "outline"}
                onClick={() => setIsGuest(true)}
                className="flex-1 text-sm"
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                Guest
              </Button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName" className="text-sm">First Name *</Label>
                  <Input
                    id="firstName"
                    value={userInfo.firstName}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, firstName: e.target.value }))}
                    className="h-10"
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={userInfo.lastName}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, lastName: e.target.value }))}
                    className="h-10"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-sm">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={userInfo.email}
                  onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                  className="h-10"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={userInfo.phone}
                  onChange={(e) => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className="h-10"
                  placeholder="+44 7123 456789"
                />
              </div>
            </div>

            {!isGuest && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-1 text-sm">Account Benefits</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Save preferences</li>
                  <li>• Track sessions</li>
                  <li>• Member benefits</li>
                </ul>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">Payment Method</h3>
            
            <div className="space-y-3">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setPaymentMethod('card')}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">💳</div>
                  <div className="flex-1">
                    <div className="font-medium">Credit/Debit Card</div>
                    <div className="text-sm text-gray-600">Visa, Mastercard, Amex</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">£{bookingDetails.price}</div>
                    <div className="text-xs text-gray-500">No fees</div>
                  </div>
                </div>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'apple-pay' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setPaymentMethod('apple-pay')}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🍎</div>
                  <div className="flex-1">
                    <div className="font-medium">Apple Pay</div>
                    <div className="text-sm text-gray-600">Touch ID / Face ID</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">£{bookingDetails.price}</div>
                    <Badge className="bg-green-100 text-green-800 text-xs">Fastest</Badge>
                  </div>
                </div>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'google-pay' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setPaymentMethod('google-pay')}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🔵</div>
                  <div className="flex-1">
                    <div className="font-medium">Google Pay</div>
                    <div className="text-sm text-gray-600">Quick & secure</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">£{bookingDetails.price}</div>
                    <div className="text-xs text-gray-500">No fees</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="font-medium text-sm">Secure Payment</span>
              </div>
              <div className="text-xs text-gray-600">
                Your payment is encrypted and secure. We never store your card details.
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Confirm Your Booking</h3>
              <p className="text-sm text-gray-600">Review and complete your payment</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3 text-sm">Booking Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Session with {bookingDetails.therapistName}</span>
                  <span>£{bookingDetails.price}</span>
                </div>
                <div className="flex justify-between">
                  <span>{bookingDetails.date} at {bookingDetails.time}</span>
                  <span>{bookingDetails.duration} min</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>£{bookingDetails.price}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm leading-relaxed">
                  I agree to the <a href="/terms" className="text-blue-600 underline">Terms</a> and <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a>
                </Label>
              </div>
            </div>

            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-1 text-sm">Money-Back Guarantee</h4>
              <p className="text-xs text-green-800">
                Not satisfied? Get a full refund within 24 hours.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isProcessing}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold">Checkout</h1>
          <div className="w-8" />
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        <Card>
          <CardContent className="p-4">
            {renderStepContent()}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {currentStep > 0 && (
              <Button variant="ghost" size="sm" onClick={handlePrevious} disabled={isProcessing}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex-1 text-center">
            <div className="text-sm font-medium">
              {isProcessing ? 'Processing...' : (currentStep === steps.length - 1 ? 'Complete Booking' : `Step ${currentStep + 1}`)}
            </div>
            <div className="text-xs text-gray-500">
              {currentStep === steps.length - 1 ? '£' + bookingDetails.price : steps[currentStep].title}
            </div>
          </div>

          <div>
            {currentStep === steps.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white px-6"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Pay Now
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isProcessing}
                className="px-6"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Security Badges */}
        <div className="flex justify-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Shield className="h-3 w-3" />
            <span>Secure</span>
          </div>
          <div className="flex items-center space-x-1">
            <Lock className="h-3 w-3" />
            <span>Encrypted</span>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="h-3 w-3" />
            <span>Guaranteed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileCheckout;


