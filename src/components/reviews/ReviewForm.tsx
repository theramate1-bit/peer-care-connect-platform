import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, StarOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReviewFormProps {
  sessionId: string;
  therapistId: string;
  clientId: string;
  onReviewSubmitted?: () => void;
  onCancel?: () => void;
}

interface DetailedRating {
  rating_type: 'professionalism' | 'effectiveness' | 'communication' | 'punctuality';
  rating_value: number;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  sessionId,
  therapistId,
  clientId,
  onReviewSubmitted,
  onCancel
}) => {
  const [overallRating, setOverallRating] = useState(0);
  const [detailedRatings, setDetailedRatings] = useState<DetailedRating[]>([
    { rating_type: 'professionalism', rating_value: 0 },
    { rating_type: 'effectiveness', rating_value: 0 },
    { rating_type: 'communication', rating_value: 0 },
    { rating_type: 'punctuality', rating_value: 0 }
  ]);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleOverallRatingChange = (rating: number) => {
    setOverallRating(rating);
  };

  const handleDetailedRatingChange = (type: string, rating: number) => {
    setDetailedRatings(prev => 
      prev.map(dr => 
        dr.rating_type === type 
          ? { ...dr, rating_value: rating }
          : dr
      )
    );
  };

  const validateForm = () => {
    if (overallRating === 0) {
      toast({
        title: "Rating Required",
        description: "Please provide an overall rating for your session.",
        variant: "destructive"
      });
      return false;
    }

    if (reviewText.trim().length < 10) {
      toast({
        title: "Review Text Required",
        description: "Please provide a review comment (at least 10 characters).",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Insert the main review
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          session_id: sessionId,
          client_id: clientId,
          therapist_id: therapistId,
          overall_rating: overallRating,
          review_text: reviewText,
          review_status: 'pending',
          is_verified_session: true // Assuming this is a verified session
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      // Insert detailed ratings
      const detailedRatingsToInsert = detailedRatings
        .filter(dr => dr.rating_value > 0)
        .map(dr => ({
          review_id: reviewData.id,
          rating_type: dr.rating_type,
          rating_value: dr.rating_value
        }));

      if (detailedRatingsToInsert.length > 0) {
        const { error: detailedError } = await supabase
          .from('detailed_ratings')
          .insert(detailedRatingsToInsert);

        if (detailedError) throw detailedError;
      }

      // Check for potential fraud
      const { data: fraudCheck } = await supabase
        .rpc('detect_review_fraud', { new_review_id: reviewData.id });

      if (fraudCheck) {
        toast({
          title: "Review Flagged",
          description: "Your review has been flagged for review. It will be visible after moderation.",
          variant: "default"
        });
      } else {
        toast({
          title: "Review Submitted",
          description: "Thank you for your review! It will be visible shortly.",
          variant: "default"
        });
      }

      onReviewSubmitted?.();

    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number, onRatingChange: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className="focus:outline-none"
          >
            {star <= rating ? (
              <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
            ) : (
              <StarOff className="w-6 h-6 text-gray-300 hover:text-yellow-400" />
            )}
          </button>
        ))}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Session Review</CardTitle>
        <p className="text-sm text-gray-600">
          Share your experience to help other clients and improve our services.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Rating */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Overall Rating *</Label>
          <div className="flex items-center gap-4">
            {renderStars(overallRating, handleOverallRatingChange)}
            <span className="text-sm text-gray-600">
              {overallRating > 0 ? `${overallRating}/5` : 'Click to rate'}
            </span>
          </div>
        </div>

        {/* Detailed Ratings */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Detailed Ratings (Optional)</Label>
          {detailedRatings.map((rating) => (
            <div key={rating.rating_type} className="flex items-center justify-between">
              <Label className="capitalize text-sm">
                {rating.rating_type.replace('_', ' ')}
              </Label>
              {renderStars(rating.rating_value, (value) => 
                handleDetailedRatingChange(rating.rating_type, value)
              )}
            </div>
          ))}
        </div>

        {/* Review Text */}
        <div className="space-y-2">
          <Label htmlFor="review-text" className="text-base font-medium">
            Review Comment *
          </Label>
          <Textarea
            id="review-text"
            placeholder="Share your experience with this session. What went well? What could be improved? (Minimum 10 characters)"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <div className="text-xs text-gray-500 text-right">
            {reviewText.length}/500 characters
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || overallRating === 0 || reviewText.trim().length < 10}
            className="flex-1"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
          <p className="font-medium mb-1">Review Guidelines:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Be honest and constructive in your feedback</li>
            <li>Focus on the session experience and outcomes</li>
            <li>Avoid personal attacks or inappropriate content</li>
            <li>Your review helps other clients make informed decisions</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
