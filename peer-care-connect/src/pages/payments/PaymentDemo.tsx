import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const PaymentDemo = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment System Demo</h1>
          <p className="text-gray-600">Test and explore our payment system features</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Stripe Connect Demo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary">Stripe Connect</Badge>
                Connect Account Setup
              </CardTitle>
              <CardDescription>
                Set up your Stripe Connect account to receive payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Features:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Business verification</li>
                    <li>• Bank account setup</li>
                    <li>• Identity verification</li>
                    <li>• Compliance requirements</li>
                  </ul>
                </div>
                <Button className="w-full" variant="outline">
                  <a href="/payments/connect">Setup Connect Account</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment Processing Demo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary">Payments</Badge>
                Payment Processing
              </CardTitle>
              <CardDescription>
                Test payment flows and fee calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Features:</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Credit card payments</li>
                    <li>• Marketplace fee calculation</li>
                    <li>• Payment confirmation</li>
                    <li>• Receipt generation</li>
                  </ul>
                </div>
                <Button className="w-full" variant="outline">
                  <a href="/payments">View Payments</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Fee Structure Demo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary">Fees</Badge>
                Marketplace Fee Structure
              </CardTitle>
              <CardDescription>
                Understand our transparent fee structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Fee Breakdown:</h4>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• Platform fee: 1.5%</li>
                    <li>• Stripe processing: 1.4% + 20p (UK cards)</li>
                    <li>• Therapist receives: ~97.1%</li>
                  </ul>
                </div>
                <div className="text-xs text-gray-500">
                  * Fees may vary based on location and payment method
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payout Demo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary">Payouts</Badge>
                Payout Management
              </CardTitle>
              <CardDescription>
                Manage your earnings and payouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-2">Features:</h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• Automatic payouts</li>
                    <li>• Payout schedules</li>
                    <li>• Transaction history</li>
                    <li>• Tax reporting</li>
                  </ul>
                </div>
                <Button className="w-full" variant="outline">
                  View Payouts
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        {/* Quick Test Section */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Test Scenarios</CardTitle>
            <CardDescription>
              Test different payment scenarios to verify system functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Test Payment</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Use test card: 4242 4242 4242 4242
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  Test Payment
                </Button>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Fee Calculator</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Calculate fees for different amounts
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  Calculate Fees
                </Button>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Webhook Test</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Test webhook event handling
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  Test Webhook
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentDemo;
