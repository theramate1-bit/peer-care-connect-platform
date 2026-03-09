import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, MessageSquare, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Review {
  id: string;
  rating: number;
  title: string;
  comment: string;
  is_anonymous: boolean;
  created_at: string;
  client_name: string;
}

interface ReviewsSectionProps {
  therapistId: string;
  averageRating?: number;
  reviewCount?: number;
}

export const ReviewsSection = ({ therapistId, averageRating, reviewCount }: ReviewsSectionProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchReviews();
  }, [therapistId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('therapist_id', therapistId)
        .in('review_status', ['approved', 'published']) // Fixed: show approved/published reviews
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedReviews = (reviewsData || []).map(review => ({
        id: review.id,
        rating: review.overall_rating || 0, // Fixed: use 'overall_rating' instead of 'rating'
        title: review.title || '',
        comment: review.comment || '',
        is_anonymous: review.is_anonymous,
        created_at: review.created_at,
        client_name: review.is_anonymous ? 'Anonymous' : 'Client'
      }));

      setReviews(formattedReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading reviews...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reviews Summary */}
      {averageRating && reviewCount && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Reviews & Ratings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {averageRating.toFixed(1)}
                </div>
                <div className="flex items-center justify-center mt-1">
                  {renderStars(averageRating)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Based on {reviewCount} reviews
                </div>
              </div>
              
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map(rating => {
                  const count = reviews.filter(r => r.rating === rating).length;
                  const percentage = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                  
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-sm w-6">{rating}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Reviews */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No reviews yet</p>
            </CardContent>
          </Card>
        ) : (
          reviews.map(review => (
            <Card key={review.id} className="transition-[border-color,background-color] duration-200 ease-out">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {review.is_anonymous ? (
                        <UserIcon className="h-5 w-5" />
                      ) : (
                        review.client_name.charAt(0)
                      )}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{review.client_name}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {renderStars(review.rating)}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(review.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {review.title && (
                      <h4 className="font-medium mb-2">{review.title}</h4>
                    )}
                    
                    {review.comment && (
                      <p className="text-muted-foreground">{review.comment}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
