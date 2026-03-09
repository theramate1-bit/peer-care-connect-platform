/**
 * Complete Review System
 * Handles review submission, validation, and display
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReviewSubmission {
  sessionId: string;
  practitionerId: string;
  clientId?: string; // Optional for guest reviews
  clientEmail?: string; // For guest reviews
  overallRating: number; // 1-5 stars
  title: string;
  comment: string;
  isAnonymous: boolean;
}

export interface ReviewData {
  id: string;
  client_id: string;
  therapist_id: string;
  session_id: string;
  overall_rating: number;
  title: string;
  comment: string;
  is_anonymous: boolean;
  created_at: string;
  client_name?: string;
  session_date?: string;
}

export class ReviewSystem {
  /**
   * Submit a review for a completed session
   * Supports both authenticated users (with clientId) and guests (with clientEmail)
   */
  static async submitReview(review: ReviewSubmission): Promise<{ success: boolean; error?: string }> {
    try {
      // For guest reviews, validate via email + session_id using RPC
      if (!review.clientId && review.clientEmail) {
        return await this.submitGuestReview(review);
      }

      // For authenticated users, use existing validation
      if (!review.clientId) {
        return {
          success: false,
          error: 'Client ID or email is required'
        };
      }

      // Validate session exists and is completed
      const { data: session, error: sessionError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('id', review.sessionId)
        .eq('status', 'completed')
        .eq('client_id', review.clientId)
        .single();

      if (sessionError || !session) {
        return {
          success: false,
          error: 'Session not found or not completed'
        };
      }

      // Check if review already exists
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('session_id', review.sessionId)
        .eq('client_id', review.clientId)
        .maybeSingle();

      if (existingReview) {
        return {
          success: false,
          error: 'Review already submitted for this session'
        };
      }

      // Validate rating
      if (review.overallRating < 1 || review.overallRating > 5) {
        return {
          success: false,
          error: 'Rating must be between 1 and 5 stars'
        };
      }

      // Submit review
      const { data: newReview, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          client_id: review.clientId,
          therapist_id: review.practitionerId,
          session_id: review.sessionId,
          overall_rating: review.overallRating,
          title: review.title,
          comment: review.comment,
          is_anonymous: review.isAnonymous,
          is_verified_session: true,
          review_status: 'published'
        })
        .select()
        .single();

      if (reviewError) {
        console.error('Review submission error:', reviewError);
        return {
          success: false,
          error: 'Failed to submit review'
        };
      }

      // Send notification to practitioner
      await this.sendReviewNotification(review.practitionerId, review.clientId, review.overallRating, newReview.id);

      // Update practitioner's average rating
      await this.updatePractitionerRating(review.practitionerId);

      return { success: true };

    } catch (error) {
      console.error('Review submission error:', error);
      return {
        success: false,
        error: 'Review submission failed'
      };
    }
  }

  /**
   * Submit a review for a guest (validates via email + session_id)
   */
  private static async submitGuestReview(review: ReviewSubmission): Promise<{ success: boolean; error?: string }> {
    try {
      if (!review.clientEmail) {
        return {
          success: false,
          error: 'Email is required for guest reviews'
        };
      }

      // Validate session via RPC function (similar to BookingSuccess)
      const { data: sessionData, error: rpcError } = await supabase
        .rpc('get_session_by_email_and_id', {
          p_session_id: review.sessionId,
          p_email: review.clientEmail
        });

      if (rpcError || !sessionData || (Array.isArray(sessionData) && sessionData.length === 0)) {
        return {
          success: false,
          error: 'Session not found or email does not match'
        };
      }

      const session = Array.isArray(sessionData) ? sessionData[0] : sessionData;

      // Check if session is completed
      if (session.status !== 'completed') {
        return {
          success: false,
          error: 'You can only review completed sessions'
        };
      }

      // Check if review already exists (by session_id only for guests)
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('session_id', review.sessionId)
        .maybeSingle();

      if (existingReview) {
        return {
          success: false,
          error: 'Review already submitted for this session'
        };
      }

      // Validate rating
      if (review.overallRating < 1 || review.overallRating > 5) {
        return {
          success: false,
          error: 'Rating must be between 1 and 5 stars'
        };
      }

      // Get client_id from session (even guests have a client_id after booking)
      const clientId = session.client_id;

      // Submit review
      const { data: newReview, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          client_id: clientId, // Use the client_id from the session
          therapist_id: review.practitionerId,
          session_id: review.sessionId,
          overall_rating: review.overallRating,
          title: review.title,
          comment: review.comment,
          is_anonymous: review.isAnonymous,
          is_verified_session: true,
          review_status: 'published'
        })
        .select()
        .single();

      if (reviewError) {
        console.error('Review submission error:', reviewError);
        return {
          success: false,
          error: 'Failed to submit review'
        };
      }

      // Send notification to practitioner
      if (clientId) {
        await this.sendReviewNotification(review.practitionerId, clientId, review.overallRating, newReview.id);
      }

      // Update practitioner's average rating
      await this.updatePractitionerRating(review.practitionerId);

      return { success: true };

    } catch (error) {
      console.error('Guest review submission error:', error);
      return {
        success: false,
        error: 'Review submission failed'
      };
    }
  }

  /**
   * Get reviews for a practitioner
   */
  static async getPractitionerReviews(practitionerId: string): Promise<ReviewData[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          client:users!reviews_client_id_fkey(first_name, last_name),
          session:client_sessions(session_date)
        `)
        .eq('therapist_id', practitionerId)
        .eq('review_status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(review => ({
        id: review.id,
        client_id: review.client_id,
        therapist_id: review.therapist_id,
        session_id: review.session_id,
        overall_rating: review.overall_rating,
        title: review.title,
        comment: review.comment,
        is_anonymous: review.is_anonymous,
        created_at: review.created_at,
        client_name: review.is_anonymous ? 'Anonymous' : `${review.client?.first_name} ${review.client?.last_name}`,
        session_date: review.session?.session_date
      }));

    } catch (error) {
      console.error('Error fetching practitioner reviews:', error);
      return [];
    }
  }

  /**
   * Get practitioner's average rating and review count
   * Combines ratings from both reviews and practitioner_ratings tables
   */
  static async getPractitionerStats(practitionerId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingBreakdown: { [key: number]: number };
  }> {
    try {
      // Get ratings from reviews table (public reviews)
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('overall_rating')
        .eq('therapist_id', practitionerId)
        .eq('review_status', 'published');

      if (reviewsError) throw reviewsError;

      // Also get ratings from practitioner_ratings table (private feedback)
      const { data: practitionerRatings, error: ratingsError } = await supabase
        .from('practitioner_ratings')
        .select('rating')
        .eq('practitioner_id', practitionerId)
        .eq('status', 'active');

      if (ratingsError) throw ratingsError;

      // Combine ratings from both tables
      const allRatings = [
        ...(reviews || []).map(r => r.overall_rating),
        ...(practitionerRatings || []).map(r => r.rating)
      ];

      const totalReviews = allRatings.length;

      if (totalReviews === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }

      const averageRating = allRatings.reduce((sum, r) => sum + r, 0) / totalReviews;

      // Calculate rating breakdown
      const ratingBreakdown: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      allRatings.forEach(rating => {
        ratingBreakdown[rating as keyof typeof ratingBreakdown] = (ratingBreakdown[rating as keyof typeof ratingBreakdown] || 0) + 1;
      });

      return {
        averageRating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
        totalReviews,
        ratingBreakdown
      };
    } catch (error) {
      console.error('Error getting practitioner stats:', error);
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }
  }

  /**
   * Get reviews that a client can submit
   */
  static async getPendingReviews(clientId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('client_sessions')
        .select(`
          *,
          practitioner:users!client_sessions_therapist_id_fkey(first_name, last_name),
          existing_review:reviews(id)
        `)
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .is('existing_review.id', null)
        .order('session_date', { ascending: false });

      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('Error fetching pending reviews:', error);
      return [];
    }
  }

  /**
   * Send review notification to practitioner
   */
  private static async sendReviewNotification(
    practitionerId: string,
    clientId: string | null | undefined,
    rating: number,
    reviewId: string
  ): Promise<void> {
    try {
      if (!clientId) return;

      // Get client name
      const { data: client } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', clientId)
        .maybeSingle();

      const clientName = client ? `${client.first_name} ${client.last_name}` : 'A client';

      await supabase
        .from('notifications')
        .insert({
          user_id: practitionerId,
          type: 'review_received',
          title: 'New Review Received',
          message: `${clientName} left you a ${rating}-star review!`,
          data: {
            review_id: reviewId,
            client_name: clientName,
            rating: rating
          }
        });

    } catch (error) {
      console.error('Error sending review notification:', error);
    }
  }

  /**
   * Update practitioner's average rating in their profile
   */
  private static async updatePractitionerRating(practitionerId: string): Promise<void> {
    try {
      const stats = await this.getPractitionerStats(practitionerId);
      
      await supabase
        .from('users')
        .update({
          average_rating: stats.averageRating,
          total_reviews: stats.totalReviews
        })
        .eq('id', practitionerId);

    } catch (error) {
      console.error('Error updating practitioner rating:', error);
    }
  }

  /**
   * Get recent reviews for homepage/feed
   */
  static async getRecentReviews(limit: number = 10): Promise<ReviewData[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          client:users!reviews_client_id_fkey(first_name, last_name),
          practitioner:users!reviews_therapist_id_fkey(first_name, last_name),
          session:client_sessions(session_date)
        `)
        .eq('review_status', 'published')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(review => ({
        id: review.id,
        client_id: review.client_id,
        therapist_id: review.therapist_id,
        session_id: review.session_id,
        overall_rating: review.overall_rating,
        title: review.title,
        comment: review.comment,
        is_anonymous: review.is_anonymous,
        created_at: review.created_at,
        client_name: review.is_anonymous ? 'Anonymous' : `${review.client?.first_name} ${review.client?.last_name}`,
        session_date: review.session?.session_date
      }));

    } catch (error) {
      console.error('Error fetching recent reviews:', error);
      return [];
    }
  }

  /**
   * Report a review for moderation
   */
  static async reportReview(reviewId: string, reason: string, reportedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      await supabase
        .from('reviews')
        .update({
          review_status: 'reported',
          moderation_notes: `Reported by ${reportedBy}: ${reason}`
        })
        .eq('id', reviewId);

      return { success: true };

    } catch (error) {
      console.error('Error reporting review:', error);
      return {
        success: false,
        error: 'Failed to report review'
      };
    }
  }
}
