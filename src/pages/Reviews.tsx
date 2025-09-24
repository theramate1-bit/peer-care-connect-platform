import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare, Calendar, User, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Review {
  id: string;
  practitioner_id: string;
  client_id: string;
  session_id: string;
  rating: number;
  review_text: string;
  created_at: string;
  status: string;
  client: {
    first_name: string;
    last_name: string;
  };
  session: {
    session_type: string;
    session_date: string;
  };
}

const Reviews = () => {
  const { userProfile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'recent' | 'high_rating' | 'low_rating'>('all');

  useEffect(() => {
    if (userProfile) {
      loadReviews();
    }
  }, [userProfile]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          therapist_id,
          client_id,
          session_id,
          overall_rating,
          comment,
          created_at,
          review_status
        `)
        .eq('therapist_id', userProfile?.id)
        .eq('review_status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get client and session details for each review
      const reviewsWithDetails = await Promise.all(
        (data || []).map(async (review) => {
          // Get client details
          const { data: client, error: clientError } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', review.client_id)
            .single();

          // Get session details
          const { data: session, error: sessionError } = await supabase
            .from('client_sessions')
            .select('session_type, session_date')
            .eq('id', review.session_id)
            .single();

          return {
            ...review,
            rating: review.overall_rating, // Map overall_rating to rating for compatibility
            review_text: review.comment, // Map comment to review_text for compatibility
            status: review.review_status, // Map review_status to status for compatibility
            client: client || { first_name: 'Unknown', last_name: 'Client' },
            session: session || { session_type: 'Unknown', session_date: '' }
          };
        })
      );

      setReviews(reviewsWithDetails);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const filteredReviews = reviews.filter(review => {
    switch (filter) {
      case 'recent':
        return new Date(review.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      case 'high_rating':
        return review.rating >= 4;
      case 'low_rating':
        return review.rating <= 2;
      default:
        return true;
    }
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading reviews...</p>
          </div>
        </div>
      </div>
    );
  }

  const averageRating = getAverageRating();
  const ratingDistribution = getRatingDistribution();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Reviews & Ratings</h1>
        <p className="text-muted-foreground">See what clients say about your services</p>
      </div>

      {/* Rating Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Rating Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{averageRating.toFixed(1)}</div>
              <div className="flex justify-center mb-2">
                {renderStars(Math.round(averageRating))}
              </div>
              <p className="text-muted-foreground">
                Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="md:col-span-2">
              <h4 className="font-medium mb-3">Rating Distribution</h4>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = ratingDistribution[rating as keyof typeof ratingDistribution];
                  const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="text-sm w-8">{rating}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Client Reviews
            </CardTitle>
            
            {/* Filter Buttons */}
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All Reviews
              </Button>
              <Button
                variant={filter === 'recent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('recent')}
              >
                Recent
              </Button>
              <Button
                variant={filter === 'high_rating' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('high_rating')}
              >
                High Rating
              </Button>
              <Button
                variant={filter === 'low_rating' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('low_rating')}
              >
                Low Rating
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reviews found</h3>
              <p className="text-muted-foreground">
                {filter === 'all' 
                  ? "You haven't received any reviews yet. Complete sessions to start receiving feedback."
                  : `No ${filter.replace('_', ' ')} reviews found.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">
                            {review.client.first_name} {review.client.last_name}
                          </h4>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {renderStars(review.rating)}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(review.created_at), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {review.session.session_type}
                      </Badge>
                    </div>
                    
                    {review.review_text && (
                      <p className="text-muted-foreground mb-3">
                        "{review.review_text}"
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Session: {format(new Date(review.session.session_date), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Session completed</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reviews;