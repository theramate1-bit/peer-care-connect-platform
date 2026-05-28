/**
 * Practitioner Pricing Dashboard
 * Complete pricing management for practitioners
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  DollarSign, 
  Settings, 
  TrendingUp, 
  Users, 
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { 
  PractitionerSubscriptionPlan, 
  PractitionerSubscription, 
  PractitionerCustomPricing,
  SessionTransaction,
  practitionerPricingManager 
} from '@/lib/practitioner-pricing';

interface PractitionerPricingDashboardProps {
  practitionerId: string;
}

export const PractitionerPricingDashboard: React.FC<PractitionerPricingDashboardProps> = ({ 
  practitionerId 
}) => {
  const [subscriptionPlans, setSubscriptionPlans] = useState<PractitionerSubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<PractitionerSubscription | null>(null);
  const [customPricing, setCustomPricing] = useState<PractitionerCustomPricing[]>([]);
  const [transactions, setTransactions] = useState<SessionTransaction[]>([]);
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    totalFees: 0,
    netEarnings: 0,
    transactionCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New pricing form state
  const [showNewPricingForm, setShowNewPricingForm] = useState(false);
  const [newPricing, setNewPricing] = useState({
    productType: 'individual_session' as 'individual_session' | 'group_session' | 'workshop',
    priceAmount: 0,
    sessionDurationMinutes: 60,
    maxParticipants: 1
  });

  useEffect(() => {
    loadData();
  }, [practitionerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        plans,
        subscription,
        pricing,
        transactionData,
        earningsData
      ] = await Promise.all([
        practitionerPricingManager.getSubscriptionPlans(),
        practitionerPricingManager.getPractitionerSubscription(practitionerId),
        practitionerPricingManager.getPractitionerCustomPricing(practitionerId),
        practitionerPricingManager.getPractitionerTransactions(practitionerId, 10),
        practitionerPricingManager.getPractitionerEarnings(practitionerId)
      ]);

      setSubscriptionPlans(plans);
      setCurrentSubscription(subscription);
      setCustomPricing(pricing);
      setTransactions(transactionData);
      setEarnings(earningsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomPricing = async () => {
    try {
      // REAL IMPLEMENTATION: Create actual Stripe price
      const response = await fetch('/api/stripe/create-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          practitioner_id: practitionerId,
          product_type: newPricing.productType,
          amount: newPricing.priceAmount,
          currency: 'gbp',
          session_duration_minutes: newPricing.sessionDurationMinutes,
          description: `Custom ${newPricing.productType} session - ${newPricing.sessionDurationMinutes} minutes`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Stripe price');
      }

      const data = await response.json();
      const realPriceId = data.price_id;
      
      await practitionerPricingManager.createCustomPricing(
        practitionerId,
        newPricing.productType,
        realPriceId,
        newPricing.priceAmount,
        'gbp',
        newPricing.sessionDurationMinutes,
        newPricing.maxParticipants
      );

      setNewPricing({
        productType: 'individual_session',
        priceAmount: 0,
        sessionDurationMinutes: 60,
        maxParticipants: 1
      });
      setShowNewPricingForm(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create custom pricing');
    }
  };

  const handleDeleteCustomPricing = async (pricingId: string) => {
    try {
      await practitionerPricingManager.deleteCustomPricing(pricingId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete custom pricing');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading pricing data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
        <Button onClick={loadData} className="mt-2" variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pricing Management</h2>
          <p className="text-gray-600">Manage your subscription, custom pricing, and earnings</p>
        </div>
        <Button onClick={() => setShowNewPricingForm(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Custom Pricing</span>
        </Button>
      </div>

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-green-600">
                  £{earnings.totalEarnings.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Net Earnings</p>
                <p className="text-2xl font-bold text-blue-600">
                  £{earnings.netEarnings.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Platform Fees</p>
                <p className="text-2xl font-bold text-orange-600">
                  £{earnings.totalFees.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Sessions</p>
                <p className="text-2xl font-bold text-purple-600">
                  {earnings.transactionCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subscription" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="pricing">Custom Pricing</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Current Subscription</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentSubscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-blue-900">
                        {currentSubscription.plan?.plan_name}
                      </h3>
                      <p className="text-sm text-blue-700">
                        £{currentSubscription.plan?.monthly_fee}/month
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {currentSubscription.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Marketplace Fee</h4>
                      <p className="text-2xl font-bold text-green-600">
                        {currentSubscription.plan?.marketplace_fee_percentage}%
                      </p>
                      <p className="text-sm text-gray-600">
                        Commission per session
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Features</h4>
                      <div className="space-y-1">
                        {currentSubscription.plan?.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-gray-700 capitalize">
                              {feature.replace('_', ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Subscription</h3>
                  <p className="text-gray-600 mb-4">
                    Choose a subscription plan to start accepting sessions
                  </p>
                  <Button
                    onClick={() => {
                      // TODO: Implement view plans functionality
                      console.log('View plans functionality coming soon!');
                    }}
                  >
                    View Plans
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Plans */}
          <Card>
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {subscriptionPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-4 border rounded-lg ${
                      currentSubscription?.plan_id === plan.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{plan.plan_name}</h3>
                      {currentSubscription?.plan_id === plan.id && (
                        <Badge variant="secondary">Current</Badge>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-2">
                      £{plan.monthly_fee}/month
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      {plan.marketplace_fee_percentage}% marketplace fee
                    </p>
                    <div className="space-y-1 mb-4">
                      {plan.features.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-700 capitalize">
                            {feature.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                    {currentSubscription?.plan_id !== plan.id && (
                      <Button className="w-full" variant="outline">
                        Upgrade Plan
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Pricing Tab */}
        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Custom Pricing</span>
                <Button onClick={() => setShowNewPricingForm(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pricing
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customPricing.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Custom Pricing</h3>
                  <p className="text-gray-600 mb-4">
                    Create custom pricing for your services
                  </p>
                  <Button onClick={() => setShowNewPricingForm(true)}>
                    Create First Pricing
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {customPricing.map((pricing) => (
                    <div key={pricing.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium capitalize">
                            {pricing.product_type.replace('_', ' ')}
                          </h4>
                          <Badge variant="outline">
                            {pricing.session_duration_minutes}min
                          </Badge>
                          {pricing.max_participants && pricing.max_participants > 1 && (
                            <Badge variant="outline">
                              {pricing.max_participants} people
                            </Badge>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                          £{pricing.price_amount.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteCustomPricing(pricing.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions</h3>
                  <p className="text-gray-600">
                    Your transaction history will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">Session Payment</h4>
                          <Badge 
                            variant={
                              transaction.transaction_status === 'completed' ? 'default' :
                              transaction.transaction_status === 'pending' ? 'secondary' :
                              'destructive'
                            }
                          >
                            {transaction.transaction_status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-green-600">
                          +£{transaction.practitioner_amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Fee: £{transaction.marketplace_fee.toFixed(2)} ({transaction.fee_percentage}%)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Pricing Form Modal */}
      {showNewPricingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Custom Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="productType">Service Type</Label>
                <Select
                  value={newPricing.productType}
                  onValueChange={(value: any) => setNewPricing({ ...newPricing, productType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual_session">Individual Session</SelectItem>
                    <SelectItem value="group_session">Group Session</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priceAmount">Price (£)</Label>
                <Input
                  id="priceAmount"
                  type="number"
                  step="0.01"
                  value={newPricing.priceAmount}
                  onChange={(e) => setNewPricing({ ...newPricing, priceAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={newPricing.sessionDurationMinutes}
                  onChange={(e) => setNewPricing({ ...newPricing, sessionDurationMinutes: parseInt(e.target.value) || 60 })}
                />
              </div>

              {newPricing.productType !== 'individual_session' && (
                <div>
                  <Label htmlFor="maxParticipants">Max Participants</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    value={newPricing.maxParticipants}
                    onChange={(e) => setNewPricing({ ...newPricing, maxParticipants: parseInt(e.target.value) || 1 })}
                  />
                </div>
              )}

              <div className="flex space-x-2">
                <Button onClick={handleCreateCustomPricing} className="flex-1">
                  Create Pricing
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewPricingForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
