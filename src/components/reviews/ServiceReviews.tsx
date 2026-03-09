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

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading reviews...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Service Reviews</CardTitle>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-lg">{averageRating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Star className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No reviews yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to review this service!
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {review.client.first_name} {review.client.last_name[0]}.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {renderStars(review.overall_rating)}
                </div>
              </div>
              
              {review.review_title && (
                <h4 className="font-semibold text-sm">{review.review_title}</h4>
              )}
              
              {review.review_text && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {review.review_text}
                </p>
              )}
              
              <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Service Quality:</span>
                  <div className="flex">
                    {renderStars(review.service_quality)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Value:</span>
                  <div className="flex">
                    {renderStars(review.value_for_money)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
