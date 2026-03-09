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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to submit a review');
        return;
      }

      const { error } = await supabase
        .from('service_reviews')
        .insert({
          booking_id: bookingId,
          product_id: productId,
          practitioner_id: practitionerId,
          client_id: user.id,
          overall_rating: overallRating,
          service_quality: serviceQuality || overallRating,
          value_for_money: valueForMoney || overallRating,
          review_title: reviewTitle,
          review_text: reviewText,
          review_status: 'published', // Auto-publish for now
        });

      if (error) throw error;

      // Update booking to mark as reviewed
      await supabase
        .from('marketplace_bookings')
        .update({ has_review: true })
        .eq('id', bookingId);

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
          className={`h-6 w-6 cursor-pointer transition-colors ${
            star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
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
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Overall Rating *</Label>
            <StarRating value={overallRating} onChange={setOverallRating} />
            {overallRating > 0 && (
              <p className="text-sm text-muted-foreground">
                {overallRating === 5 ? 'Excellent!' : overallRating === 4 ? 'Very Good' : overallRating === 3 ? 'Good' : overallRating === 2 ? 'Fair' : 'Poor'}
              </p>
            )}
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
            <Label htmlFor="title">Review Title (Optional)</Label>
            <Input
              id="title"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Sum up your experience"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="review">Your Review (Optional)</Label>
            <Textarea
              id="review"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience with this service..."
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {reviewText.length}/1000 characters
            </p>
          </div>

          <Button type="submit" disabled={submitting || overallRating === 0} className="w-full">
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
