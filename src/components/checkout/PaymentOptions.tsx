import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  CreditCard, 
  Smartphone, 
  Shield, 
  Lock, 
  CheckCircle, 
  Star,
  Clock,
  Heart,
  Zap,
  Gift
} from 'lucide-react';

interface PaymentOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  features: string[];
  processingFee?: number;
  isRecommended?: boolean;
  isPopular?: boolean;
}

interface PaymentOptionsProps {
  selectedMethod: string;
  onSelectMethod: (method: string) => void;
  totalAmount: number;
  className?: string;
}

export const PaymentOptions: React.FC<PaymentOptionsProps> = ({
  selectedMethod,
  onSelectMethod,
  totalAmount,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const paymentOptions: PaymentOption[] = [
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Pay securely with your card',
      icon: <CreditCard className="h-6 w-6" />,
      badge: 'Most Popular',
      features: [
        'Instant confirmation',
        'All major cards accepted',
        'Secure encryption',
        'Easy refunds'
      ],
      isPopular: true
    },
    {
      id: 'apple-pay',
      name: 'Apple Pay',
      description: 'Pay with Touch ID or Face ID',
      icon: <Smartphone className="h-6 w-6" />,
      badge: 'Fastest',
      features: [
        'One-touch payment',
        'Biometric security',
        'No card details stored',
        'Instant confirmation'
      ],
      isRecommended: true
    },
    {
      id: 'google-pay',
      name: 'Google Pay',
      description: 'Quick and secure payment',
      icon: <Smartphone className="h-6 w-6" />,
      features: [
        'Quick checkout',
        'Secure authentication',
        'No card details stored',
        'Instant confirmation'
      ]
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Pay with your PayPal account',
      icon: <CreditCard className="h-6 w-6" />,
      features: [
        'Pay with PayPal balance',
        'Buy now, pay later options',
        'Buyer protection',
        'Easy refunds'
      ]
    },
    {
      id: 'klarna',
      name: 'Klarna',
      description: 'Pay in 4 interest-free installments',
      icon: <Gift className="h-6 w-6" />,
      badge: 'Buy Now, Pay Later',
      features: [
        'Pay in 4 installments',
        'No interest or fees',
        'Instant approval',
        'Flexible payments'
      ],
      processingFee: 0
    },
    {
      id: 'clearpay',
      name: 'Clearpay',
      description: 'Split your payment into 4',
      icon: <Clock className="h-6 w-6" />,
      badge: 'Split Payment',
      features: [
        '4 interest-free payments',
        'No hidden fees',
        'Instant approval',
        'Manage payments in app'
      ],
      processingFee: 0
    }
  ];

  const getPaymentIcon = (option: PaymentOption) => {
    if (option.id === 'card') return '💳';
    if (option.id === 'apple-pay') return '🍎';
    if (option.id === 'google-pay') return '🔵';
    if (option.id === 'paypal') return '🅿️';
    if (option.id === 'klarna') return '🎁';
    if (option.id === 'clearpay') return '⏰';
    return '💳';
  };

  const calculateTotal = (option: PaymentOption) => {
    const fee = option.processingFee || 0;
    return totalAmount + fee;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-2">Choose Your Payment Method</h3>
        <p className="text-gray-600">Select how you'd like to pay for your session</p>
      </div>

      <RadioGroup value={selectedMethod} onValueChange={onSelectMethod}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paymentOptions.map((option) => (
            <Card
              key={option.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedMethod === option.id
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onSelectMethod(option.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{getPaymentIcon(option)}</div>
                    <div>
                      <CardTitle className="text-lg">{option.name}</CardTitle>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    {option.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {option.badge}
                      </Badge>
                    )}
                    {option.isRecommended && (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Recommended
                      </Badge>
                    )}
                    {option.isPopular && (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        <Heart className="h-3 w-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex items-center justify-between mb-3">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      £{calculateTotal(option).toFixed(2)}
                    </div>
                    {option.processingFee && option.processingFee > 0 && (
                      <div className="text-xs text-gray-500">
                        +£{option.processingFee} processing fee
                      </div>
                    )}
                    {option.processingFee === 0 && (
                      <div className="text-xs text-green-600">
                        No additional fees
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {option.features.slice(0, 2).map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  
                  {option.features.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDetails(showDetails === option.id ? null : option.id);
                      }}
                      className="text-blue-600 hover:text-blue-700 p-0 h-auto"
                    >
                      {showDetails === option.id ? 'Show less' : `+${option.features.length - 2} more features`}
                    </Button>
                  )}
                </div>

                {showDetails === option.id && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    {option.features.slice(2).map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </RadioGroup>

      {/* Security Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-3">
          <Shield className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-gray-900">Your Payment is Secure</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Lock className="h-4 w-4 text-green-600" />
            <span>256-bit SSL encryption</span>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-green-600" />
            <span>PCI DSS compliant</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Money-back guarantee</span>
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Payment Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Session fee:</span>
            <span>£{totalAmount.toFixed(2)}</span>
          </div>
          {selectedMethod && paymentOptions.find(opt => opt.id === selectedMethod)?.processingFee && (
            <div className="flex justify-between">
              <span>Processing fee:</span>
              <span>£{paymentOptions.find(opt => opt.id === selectedMethod)?.processingFee?.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-blue-900">
            <span>Total:</span>
            <span>£{selectedMethod ? calculateTotal(paymentOptions.find(opt => opt.id === selectedMethod)!).toFixed(2) : totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Special Offers */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Gift className="h-5 w-5 text-purple-600" />
          <span className="font-semibold text-purple-900">Special Offers</span>
        </div>
        <div className="space-y-2 text-sm text-purple-800">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>First-time users get 10% off with code WELCOME10</span>
          </div>
          <div className="flex items-center space-x-2">
            <Heart className="h-4 w-4" />
            <span>Refer a friend and both get £5 credit</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentOptions;
