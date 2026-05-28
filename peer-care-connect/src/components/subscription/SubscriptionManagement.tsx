import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Calendar, 
  Settings, 
  Download, 
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionManagementProps {
  className?: string;
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ className }) => {
  const { subscribed, subscriptionTier, subscriptionEnd, loading, manageSubscription } = useSubscription();
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState(false);

  const handleManageSubscription = async () => {
    setActionLoading(true);
    try {
      await manageSubscription();
    } finally {
      setActionLoading(false);
    }
  };

  const getTierDisplayName = (tier: string | null) => {
    switch (tier) {
      case 'practitioner':
      case 'professional':
        return 'Starter Plan';
      case 'clinic':
      case 'professional-pro':
      case 'pro':
        return 'Pro Plan';
      case 'starter':
        return 'Starter Plan';
      default:
        return 'Unknown Plan';
    }
  };

  const getTierDescription = (tier: string | null) => {
    switch (tier) {
      case 'practitioner':
        return 'Advanced tools for established practitioners - 3% marketplace fee. Includes advanced scheduling, analytics, priority support, and marketing tools.';
      case 'clinic':
        return 'Complete suite for top practitioners - 1% marketplace fee. Includes full analytics, white label options, API access, and dedicated support.';
      case 'starter':
        return 'Free plan for clients to book sessions with practitioners';
      default:
        return 'No active subscription';
    }
  };

  const getTierPrice = (tier: string | null) => {
    switch (tier) {
      case 'practitioner':
        return '£79.99/month';
      case 'clinic':
        return '£199.99/month';
      case 'starter':
        return 'Free';
      default:
        return 'N/A';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No expiry date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isExpiringSoon = (dateString: string | null) => {
    if (!dateString) return false;
    const expiryDate = new Date(dateString);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isExpired = (dateString: string | null) => {
    if (!dateString) return false;
    const expiryDate = new Date(dateString);
    const now = new Date();
    return expiryDate < now;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription Management
          </CardTitle>
          <CardDescription>Loading subscription information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Subscription Management
        </CardTitle>
        <CardDescription>
          Manage your subscription, billing, and account settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Subscription Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-lg">
                {getTierDisplayName(subscriptionTier)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {getTierDescription(subscriptionTier)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {getTierPrice(subscriptionTier)}
              </div>
              <Badge 
                className={
                  subscribed 
                    ? (isExpired(subscriptionEnd) 
                        ? 'bg-red-100 text-red-800' 
                        : isExpiringSoon(subscriptionEnd)
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800')
                    : 'bg-gray-100 text-gray-800'
                }
              >
                {subscribed 
                  ? (isExpired(subscriptionEnd) 
                      ? 'Expired' 
                      : isExpiringSoon(subscriptionEnd)
                        ? 'Expiring Soon'
                        : 'Active')
                  : 'Inactive'
                }
              </Badge>
            </div>
          </div>

          {/* Expiry Information */}
          {subscriptionEnd && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="font-medium">Subscription expires:</span>{' '}
                <span className={isExpired(subscriptionEnd) ? 'text-red-600' : isExpiringSoon(subscriptionEnd) ? 'text-yellow-600' : 'text-muted-foreground'}>
                  {formatDate(subscriptionEnd)}
                </span>
              </div>
            </div>
          )}

          {/* Expiry Warnings */}
          {isExpired(subscriptionEnd) && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div className="text-sm text-red-800">
                <span className="font-medium">Subscription Expired:</span> Your subscription has expired. 
                Please renew to continue using practitioner features.
              </div>
            </div>
          )}

          {isExpiringSoon(subscriptionEnd) && !isExpired(subscriptionEnd) && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div className="text-sm text-yellow-800">
                <span className="font-medium">Renewal Reminder:</span> Your subscription expires soon. 
                Consider renewing to avoid service interruption.
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Subscription Actions */}
        <div className="space-y-4">
          <h4 className="font-medium">Subscription Actions</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={handleManageSubscription}
              disabled={actionLoading || !subscribed}
              className="h-12 flex-col gap-1"
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm">Manage Subscription</span>
            </Button>
            
            <Button 
              variant="outline"
              disabled={!subscribed}
              className="h-12 flex-col gap-1"
            >
              <Download className="h-4 w-4" />
              <span className="text-sm">Download Invoice</span>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Subscription Benefits */}
        <div className="space-y-4">
          <h4 className="font-medium">Your Plan Benefits</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptionTier === 'practitioner' && (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Client booking management</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Session scheduling</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Client communication</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Basic analytics</span>
                </div>
              </>
            )}
            
            {subscriptionTier === 'clinic' && (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Multiple practitioner support</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Advanced analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Team collaboration tools</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Priority support</span>
                </div>
              </>
            )}
            
            {subscriptionTier === 'starter' && (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Browse practitioners</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Book sessions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Session history</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Basic messaging</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Upgrade Options */}
        {(subscriptionTier === 'practitioner' || subscriptionTier === 'professional') && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Upgrade to Pro Plan</h4>
            <p className="text-sm text-blue-800 mb-3">
              Get advanced features including full analytics, white label options, API access, and dedicated support. Only 1% marketplace fee vs 3%.
            </p>
            <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
              Upgrade Now (£50/month)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
