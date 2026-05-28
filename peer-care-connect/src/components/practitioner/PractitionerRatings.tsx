import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, StarIcon } from 'lucide-react';

interface PractitionerRatingsProps {
  practitionerId: string;
  ratings?: Array<{
    id: string;
    rating: number;
    review_text?: string;
    client_id: string;
    created_at: string;
  }>;
  averageRating?: number;
  totalRatings?: number;
  onRate?: (rating: number, review: string) => void;
}

export function PractitionerRatings({ 
  practitionerId, 
  ratings = [], 
  averageRating = 0, 
  totalRatings = 0,
  onRate 
}: PractitionerRatingsProps) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitRating = async () => {
    if (selectedRating === 0) return;
    
    setIsSubmitting(true);
    try {
      if (onRate) {
        await onRate(selectedRating, reviewText);
        setSelectedRating(0);
        setReviewText('');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? "button" : undefined}
            onClick={interactive ? () => setSelectedRating(star) : undefined}
            className={interactive ? "cursor-pointer" : "cursor-default"}
            disabled={!interactive}
          >
            <StarIcon
              className={`h-5 w-5 ${
                star <= rating
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Ratings & Reviews
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Average Rating */}
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold">{averageRating.toFixed(1)}</div>
          <div>
            {renderStars(Math.round(averageRating))}
            <div className="text-sm text-gray-600">{totalRatings} reviews</div>
          </div>
        </div>

        {/* Rating Form */}
        {onRate && (
          <div className="space-y-3 p-4 border rounded-lg">
            <h4 className="font-medium">Rate this practitioner:</h4>
            <div className="flex items-center gap-2">
              <span className="text-sm">Rating:</span>
              {renderStars(selectedRating, true)}
            </div>
            <Textarea
              placeholder="Write a review (optional)..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="min-h-[80px]"
            />
            <Button
              onClick={handleSubmitRating}
              disabled={selectedRating === 0 || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </div>
        )}

        {/* Reviews List */}
        {ratings.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Recent Reviews:</h4>
            {ratings.slice(0, 5).map((rating) => (
              <div key={rating.id} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(rating.rating)}
                  <span className="text-sm text-gray-600">
                    {new Date(rating.created_at).toLocaleDateString()}
                  </span>
                </div>
                {rating.review_text && (
                  <p className="text-sm text-gray-700">{rating.review_text}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {ratings.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No reviews yet. Be the first to rate this practitioner!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
