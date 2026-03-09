# Marketplace Enhancements Plan

## Overview

Implement critical missing features for the Stripe Connect marketplace to provide complete service discovery, filtering, account management, and service-specific reviews.

## User Requirements

Based on clarification:
- 1a: Service type, price range, duration filtering (most useful for clients)
- 2a: Link to existing booking system - clients pay first, then schedule separately
- 3b: Detailed verification status including missing documents, verification steps, payout eligibility
- 4a: Basic payout history list with dates and amounts
- 5a: Service-specific reviews/ratings separate from practitioner ratings
- 6a: View only booking management (no reschedule/cancel)

## Implementation Phases

### Phase 1: Service Categories & Advanced Filtering

#### 1.1 Add Service Category to Products Table

**File**: `supabase/migrations/20250126_add_product_categories.sql`

```sql
-- Add category column to practitioner_products
ALTER TABLE practitioner_products 
ADD COLUMN category TEXT CHECK (category IN ('massage', 'osteopathy', 'sports_therapy', 'general'));

-- Add index for filtering
CREATE INDEX idx_practitioner_products_category ON practitioner_products(category);

-- Update existing products with default category based on practitioner role
UPDATE practitioner_products pp
SET category = CASE 
  WHEN u.user_role = 'massage_therapist' THEN 'massage'
  WHEN u.user_role = 'osteopath' THEN 'osteopathy'
  WHEN u.user_role = 'sports_therapist' THEN 'sports_therapy'
  ELSE 'general'
END
FROM users u
WHERE pp.practitioner_id = u.id;
```

#### 1.2 Update ProductForm to Include Category

**File**: `src/components/practitioner/ProductForm.tsx`

Add category selection:

```typescript
<div className="space-y-2">
  <Label htmlFor="category">Service Category</Label>
  <Select value={category} onValueChange={setCategory}>
    <SelectTrigger>
      <SelectValue placeholder="Select category" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="massage">Massage Therapy</SelectItem>
      <SelectItem value="osteopathy">Osteopathy</SelectItem>
      <SelectItem value="sports_therapy">Sports Therapy</SelectItem>
      <SelectItem value="general">General Treatment</SelectItem>
    </SelectContent>
  </Select>
</div>
```

#### 1.3 Create Advanced Filter Component

**File**: `src/components/marketplace/ServiceFilters.tsx`

```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface ServiceFiltersProps {
  filters: {
    category: string;
    priceMin: number;
    priceMax: number;
    durationMin: number;
    durationMax: number;
  };
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
}

export const ServiceFilters: React.FC<ServiceFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters
}) => {
  const activeFilterCount = Object.values(filters).filter(v => 
    v !== 'all' && v !== 0 && v !== 1000
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filter Services</CardTitle>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="cursor-pointer" onClick={onClearFilters}>
              Clear ({activeFilterCount})
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Filter */}
        <div className="space-y-2">
          <Label>Service Type</Label>
          <Select 
            value={filters.category} 
            onValueChange={(value) => onFilterChange({ ...filters, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              <SelectItem value="massage">Massage Therapy</SelectItem>
              <SelectItem value="osteopathy">Osteopathy</SelectItem>
              <SelectItem value="sports_therapy">Sports Therapy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Price Range Filter */}
        <div className="space-y-2">
          <Label>Price Range: £{filters.priceMin} - £{filters.priceMax}</Label>
          <Slider
            min={0}
            max={200}
            step={5}
            value={[filters.priceMin, filters.priceMax]}
            onValueChange={([min, max]) => 
              onFilterChange({ ...filters, priceMin: min, priceMax: max })
            }
          />
        </div>

        {/* Duration Filter */}
        <div className="space-y-2">
          <Label>Duration: {filters.durationMin} - {filters.durationMax} mins</Label>
          <Slider
            min={15}
            max={180}
            step={15}
            value={[filters.durationMin, filters.durationMax]}
            onValueChange={([min, max]) => 
              onFilterChange({ ...filters, durationMin: min, durationMax: max })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
};
```

#### 1.4 Update Marketplace with Filtering

**File**: `src/pages/Marketplace.tsx`

Add filter state and logic:

```typescript
const [serviceFilters, setServiceFilters] = useState({
  category: 'all',
  priceMin: 0,
  priceMax: 200,
  durationMin: 15,
  durationMax: 180,
});

// Filter products based on criteria
const filterProducts = (products: any[]) => {
  return products.filter(product => {
    const priceInPounds = product.price_amount / 100;
    
    if (serviceFilters.category !== 'all' && product.category !== serviceFilters.category) {
      return false;
    }
    if (priceInPounds < serviceFilters.priceMin || priceInPounds > serviceFilters.priceMax) {
      return false;
    }
    if (product.duration_minutes < serviceFilters.durationMin || 
        product.duration_minutes > serviceFilters.durationMax) {
      return false;
    }
    return true;
  });
};
```

### Phase 2: Link to Existing Booking System

#### 2.1 Update ProductBookingCard

**File**: `src/components/booking/ProductBookingCard.tsx`

Add post-payment booking link:

```typescript
// After successful payment, show booking link
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
  <p className="text-sm font-medium text-blue-900 mb-2">
    Payment Successful! Next Step:
  </p>
  <Button 
    onClick={() => navigate(`/booking/schedule/${booking.id}`)}
    className="w-full"
  >
    Schedule Your Session
  </Button>
</div>
```

#### 2.2 Update BookingSuccess Page

**File**: `src/pages/booking/BookingSuccess.tsx`

Add scheduling CTA:

```typescript
<div className="bg-primary/10 p-4 rounded-lg">
  <h4 className="font-semibold mb-2">Next Step: Schedule Your Session</h4>
  <p className="text-sm text-muted-foreground mb-3">
    Your payment is confirmed. Now choose a convenient time with your practitioner.
  </p>
  <Button 
    onClick={() => navigate(`/booking/schedule/${booking.id}`)}
    className="w-full"
  >
    Schedule Now
  </Button>
</div>
```

### Phase 3: Detailed Account Verification Status

#### 3.1 Create Verification Status Component

**File**: `src/components/payments/StripeConnectStatus.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  FileText,
  CreditCard,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VerificationRequirement {
  type: string;
  status: 'verified' | 'pending' | 'required';
  description: string;
}

export const StripeConnectStatus: React.FC<{ userId: string }> = ({ userId }) => {
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAccountStatus();
  }, [userId]);

  const fetchAccountStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('stripe-payment', {
        body: {
          action: 'get-account-status',
          user_id: userId,
        }
      });

      if (error) throw error;
      setAccountStatus(data);
    } catch (error: any) {
      console.error('Error fetching account status:', error);
      toast.error('Failed to load account status');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAccountStatus();
    setRefreshing(false);
    toast.success('Status updated');
  };

  if (loading) {
    return <div>Loading account status...</div>;
  }

  if (!accountStatus) {
    return (
      <Alert>
        <AlertDescription>
          No Stripe Connect account found. Please complete onboarding.
        </AlertDescription>
      </Alert>
    );
  }

  const getStatusBadge = () => {
    if (accountStatus.charges_enabled && accountStatus.payouts_enabled) {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>;
    }
    if (accountStatus.details_submitted) {
      return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" /> Under Review</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Incomplete</Badge>;
  };

  const requirements: VerificationRequirement[] = [
    {
      type: 'identity',
      status: accountStatus.requirements?.currently_due?.includes('individual.verification.document') 
        ? 'required' : 'verified',
      description: 'Identity verification (ID document)'
    },
    {
      type: 'business',
      status: accountStatus.requirements?.currently_due?.includes('business_profile') 
        ? 'required' : 'verified',
      description: 'Business information'
    },
    {
      type: 'bank',
      status: accountStatus.external_accounts?.data?.length > 0 ? 'verified' : 'required',
      description: 'Bank account details'
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Stripe Connect Status</CardTitle>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="font-medium">Account Status</p>
            <p className="text-sm text-muted-foreground">
              ID: {accountStatus.stripe_account_id}
            </p>
          </div>
          {getStatusBadge()}
        </div>

        {/* Capabilities */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 p-3 border rounded-lg">
            <CreditCard className={`h-5 w-5 ${accountStatus.charges_enabled ? 'text-green-500' : 'text-gray-400'}`} />
            <div>
              <p className="text-sm font-medium">Accept Payments</p>
              <p className="text-xs text-muted-foreground">
                {accountStatus.charges_enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 border rounded-lg">
            <Shield className={`h-5 w-5 ${accountStatus.payouts_enabled ? 'text-green-500' : 'text-gray-400'}`} />
            <div>
              <p className="text-sm font-medium">Receive Payouts</p>
              <p className="text-xs text-muted-foreground">
                {accountStatus.payouts_enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>

        {/* Verification Requirements */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Verification Requirements</h4>
          {requirements.map((req) => (
            <div key={req.type} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{req.description}</span>
              </div>
              {req.status === 'verified' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : req.status === 'pending' ? (
                <Clock className="h-4 w-4 text-yellow-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
          ))}
        </div>

        {/* Action Required Alert */}
        {accountStatus.requirements?.currently_due?.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Action required: {accountStatus.requirements.currently_due.length} item(s) need attention.
              <Button 
                size="sm" 
                className="mt-2 w-full"
                onClick={() => window.location.href = accountStatus.onboarding_url}
              >
                Complete Verification
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
```

#### 3.2 Add Account Status Endpoint

**File**: `supabase/functions/stripe-payment/index.ts`

Add new handler:

```typescript
async function handleGetAccountStatus(req: Request, body: any, supabase: any) {
  try {
    const { user_id } = body;

    // Get user's Stripe account ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_connect_account_id')
      .eq('id', user_id)
      .single();

    if (userError || !user?.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({ error: 'No Stripe account found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(user.stripe_connect_account_id);

    return new Response(
      JSON.stringify({
        stripe_account_id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements,
        external_accounts: account.external_accounts,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[GET-ACCOUNT-STATUS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
```

### Phase 4: Payout History

#### 4.1 Create Payout History Component

**File**: `src/components/payments/PayoutHistory.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrival_date: number;
  created: number;
  description: string;
}

export const PayoutHistory: React.FC<{ userId: string }> = ({ userId }) => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    fetchPayouts();
  }, [userId]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      
      // Get payouts from marketplace_bookings
      const { data: bookings, error } = await supabase
        .from('marketplace_bookings')
        .select('*')
        .eq('practitioner_id', userId)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const total = bookings?.reduce((sum, b) => sum + b.practitioner_amount, 0) || 0;
      setTotalEarnings(total);
      
      // Transform bookings into payout format
      const payoutList = bookings?.map(b => ({
        id: b.id,
        amount: b.practitioner_amount,
        currency: b.currency,
        status: 'paid',
        arrival_date: new Date(b.created_at).getTime() / 1000,
        created: new Date(b.created_at).getTime() / 1000,
        description: b.product_name,
      })) || [];

      setPayouts(payoutList);
    } catch (error: any) {
      console.error('Error fetching payouts:', error);
      toast.error('Failed to load payout history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading payout history...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Earnings */}
        <div className="bg-primary/10 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Total Earnings</span>
          </div>
          <p className="text-2xl font-bold">
            £{(totalEarnings / 100).toFixed(2)}
          </p>
        </div>

        {/* Payout List */}
        <div className="space-y-3">
          {payouts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No payouts yet
            </p>
          ) : (
            payouts.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">£{(payout.amount / 100).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{payout.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">{payout.status}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(payout.arrival_date * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

### Phase 5: Service-Specific Reviews

#### 5.1 Create Service Reviews Table

**File**: `supabase/migrations/20250126_service_reviews.sql`

```sql
-- Create service_reviews table
CREATE TABLE service_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES practitioner_products(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES marketplace_bookings(id) ON DELETE CASCADE,
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Ratings
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  service_quality INTEGER CHECK (service_quality >= 1 AND service_quality <= 5),
  value_for_money INTEGER CHECK (value_for_money >= 1 AND value_for_money <= 5),
  
  -- Review content
  review_title TEXT,
  review_text TEXT,
  
  -- Moderation
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'published', 'rejected')),
  moderation_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one review per booking
  UNIQUE(booking_id)
);

-- Indexes
CREATE INDEX idx_service_reviews_product ON service_reviews(product_id);
CREATE INDEX idx_service_reviews_client ON service_reviews(client_id);
CREATE INDEX idx_service_reviews_practitioner ON service_reviews(practitioner_id);
CREATE INDEX idx_service_reviews_status ON service_reviews(review_status);

-- RLS Policies
ALTER TABLE service_reviews ENABLE ROW LEVEL SECURITY;

-- Clients can create and view their own reviews
CREATE POLICY "Clients can manage their reviews" ON service_reviews
  FOR ALL USING (client_id = auth.uid());

-- Everyone can view published reviews
CREATE POLICY "Anyone can view published reviews" ON service_reviews
  FOR SELECT USING (review_status = 'published');

-- Practitioners can view reviews for their services
CREATE POLICY "Practitioners can view their service reviews" ON service_reviews
  FOR SELECT USING (practitioner_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_service_reviews_updated_at 
  BEFORE UPDATE ON service_reviews 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 5.2 Create Service Review Component

**File**: `src/components/reviews/ServiceReviewForm.tsx`

```typescript
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ServiceReviewFormProps {
  bookingId: string;
  productId: string;
  practitionerId: string;
  onReviewSubmitted: () => void;
}

export const ServiceReviewForm: React.FC<ServiceReviewFormProps> = ({
  bookingId,
  productId,
  practitionerId,
  onReviewSubmitted
}) => {
  const [overallRating, setOverallRating] = useState(0);
  const [serviceQuality, setServiceQuality] = useState(0);
  const [valueForMoney, setValueForMoney] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (overallRating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('service_reviews')
        .insert({
          booking_id: bookingId,
          product_id: productId,
          practitioner_id: practitionerId,
          client_id: (await supabase.auth.getUser()).data.user?.id,
          overall_rating: overallRating,
          service_quality: serviceQuality || overallRating,
          value_for_money: valueForMoney || overallRating,
          review_title: reviewTitle,
          review_text: reviewText,
          review_status: 'published', // Auto-publish for now
        });

      if (error) throw error;

      toast.success('Review submitted successfully!');
      onReviewSubmitted();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-6 w-6 cursor-pointer ${
            star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
          onClick={() => onChange(star)}
        />
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate This Service</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Overall Rating *</Label>
            <StarRating value={overallRating} onChange={setOverallRating} />
          </div>

          <div className="space-y-2">
            <Label>Service Quality</Label>
            <StarRating value={serviceQuality} onChange={setServiceQuality} />
          </div>

          <div className="space-y-2">
            <Label>Value for Money</Label>
            <StarRating value={valueForMoney} onChange={setValueForMoney} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Review Title</Label>
            <Input
              id="title"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Sum up your experience"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="review">Your Review</Label>
            <Textarea
              id="review"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience with this service..."
              rows={4}
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
```

#### 5.3 Display Service Reviews

**File**: `src/components/reviews/ServiceReviews.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ServiceReviewsProps {
  productId: string;
}

export const ServiceReviews: React.FC<ServiceReviewsProps> = ({ productId }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('service_reviews')
        .select(`
          *,
          client:users!client_id(first_name, last_name)
        `)
        .eq('product_id', productId)
        .eq('review_status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);
      
      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.overall_rating, 0) / data.length;
        setAverageRating(avg);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading reviews...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Service Reviews</CardTitle>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{averageRating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No reviews yet. Be the first to review this service!
          </p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">
                    {review.client.first_name} {review.client.last_name[0]}.
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < review.overall_rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              {review.review_title && (
                <h4 className="font-semibold">{review.review_title}</h4>
              )}
              
              {review.review_text && (
                <p className="text-sm text-muted-foreground">{review.review_text}</p>
              )}
              
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>Service Quality: {review.service_quality}/5</span>
                <span>•</span>
                <span>Value: {review.value_for_money}/5</span>
                <span>•</span>
                <span>{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
```

### Phase 6: View-Only Booking Management

#### 6.1 Update ClientBookings with Review Option

**File**: `src/pages/client/ClientBookings.tsx`

Add review button for completed bookings:

```typescript
{booking.status === 'completed' && !booking.has_review && (
  <Button
    size="sm"
    variant="outline"
    onClick={() => setReviewingBooking(booking)}
  >
    Leave Review
  </Button>
)}
```

## Files to Create

1. `supabase/migrations/20250126_add_product_categories.sql`
2. `supabase/migrations/20250126_service_reviews.sql`
3. `src/components/marketplace/ServiceFilters.tsx`
4. `src/components/payments/StripeConnectStatus.tsx`
5. `src/components/payments/PayoutHistory.tsx`
6. `src/components/reviews/ServiceReviewForm.tsx`
7. `src/components/reviews/ServiceReviews.tsx`

## Files to Modify

1. `src/components/practitioner/ProductForm.tsx` - Add category selection
2. `src/pages/Marketplace.tsx` - Add filtering logic and ServiceFilters component
3. `src/components/booking/ProductBookingCard.tsx` - Add post-payment booking link
4. `src/pages/booking/BookingSuccess.tsx` - Add scheduling CTA
5. `supabase/functions/stripe-payment/index.ts` - Add get-account-status handler
6. `src/pages/client/ClientBookings.tsx` - Add review option
7. `src/pages/practitioner/PractitionerBookings.tsx` - Display service reviews

## Implementation Order

1. Phase 1: Service Categories & Filtering (Essential for discovery)
2. Phase 3: Account Verification Status (Builds practitioner trust)
3. Phase 4: Payout History (Practitioner satisfaction)
4. Phase 5: Service Reviews (Social proof and conversion)
5. Phase 2: Booking System Link (Integration with existing flow)
6. Phase 6: View-Only Booking Management (Enhancement)

## Success Metrics

After implementation:
- Clients can filter services by type, price, and duration
- Practitioners see detailed verification status and requirements
- Practitioners can track payout history
- Services have individual ratings and reviews
- Payment flow links to existing booking system
- Complete view-only booking history for clients

