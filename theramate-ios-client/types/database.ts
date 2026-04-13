/**
 * Database Types
 * Generated from Supabase schema - matches web app types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// User role enum (live Supabase `public.user_role`)
export type UserRole =
  | "sports_therapist"
  | "massage_therapist"
  | "osteopath"
  | "client"
  | "admin"
  | "guest";

// Onboarding status enum (live Supabase `public.onboarding_status`)
export type OnboardingStatus = "pending" | "in_progress" | "completed";

// Session status enum (live Supabase `public.session_status`)
export type SessionStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "pending_payment"
  | "pending_approval"
  | "declined"
  | "expired";

// Verification status enum
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

// Therapist specialization enum
export type TherapistSpecialization =
  | 'sports_therapy'
  | 'massage_therapy'
  | 'osteopathy'
  | 'physiotherapy'
  | 'chiropractic'
  | 'acupuncture'
  | 'rehabilitation';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          full_name: string | null;
          phone: string | null;
          location: string | null;
          bio: string | null;
          avatar_preferences: Json | null;
          user_role: UserRole | null;
          onboarding_status: OnboardingStatus | null;
          profile_completed: boolean | null;
          is_active: boolean | null;
          is_verified: boolean | null;
          treatment_exchange_opt_in: boolean | null;
          preferences: Json | null;
          terms_accepted: boolean | null;
          terms_accepted_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          first_name: string;
          last_name: string;
          full_name?: string | null;
          phone?: string | null;
          location?: string | null;
          bio?: string | null;
          avatar_preferences?: Json | null;
          user_role?: UserRole | null;
          onboarding_status?: OnboardingStatus | null;
          profile_completed?: boolean | null;
          is_active?: boolean | null;
          is_verified?: boolean | null;
          treatment_exchange_opt_in?: boolean | null;
          preferences?: Json | null;
          terms_accepted?: boolean | null;
          terms_accepted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };

      therapist_profiles: {
        Row: {
          id: string;
          user_id: string;
          specializations: TherapistSpecialization[] | null;
          hourly_rate: number | null;
          bio: string | null;
          professional_statement: string | null;
          treatment_philosophy: string | null;
          experience_years: number | null;
          average_rating: number | null;
          total_reviews: number | null;
          is_active: boolean | null;
          verification_status: VerificationStatus | null;
          profile_photo_url: string | null;
          location: string | null;
          latitude: number | null;
          longitude: number | null;
          service_radius_km: number | null;
          response_time_hours: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['therapist_profiles']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['therapist_profiles']['Insert']>;
      };

      practitioner_products: {
        Row: {
          id: string;
          practitioner_id: string | null;
          stripe_product_id: string | null;
          stripe_price_id: string | null;
          name: string;
          description: string | null;
          price_amount: number;
          currency: string | null;
          duration_minutes: number | null;
          is_active: boolean | null;
          category: string | null;
          service_category: string | null;
          recommendation_reason: string | null;
          pricing_rationale: string | null;
          popularity_score: number | null;
          recommended_for: string[] | null;
          service_type: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['practitioner_products']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['practitioner_products']['Insert']>;
      };

      client_sessions: {
        Row: {
          id: string;
          therapist_id: string | null;
          client_id: string | null;
          client_name: string;
          client_email: string | null;
          client_phone: string | null;
          session_date: string;
          start_time: string;
          duration_minutes: number;
          session_type: string | null;
          price: number | null;
          currency: string | null;
          status: SessionStatus | null;
          payment_status: string | null;
          stripe_payment_intent_id: string | null;
          notes: string | null;
          is_peer_booking: boolean | null;
          credit_cost: number | null;
          has_recording: boolean | null;
          recording_consent: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['client_sessions']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['client_sessions']['Insert']>;
      };

      reviews: {
        Row: {
          id: string;
          therapist_id: string;
          client_id: string | null;
          session_id: string | null;
          overall_rating: number;
          title: string | null;
          comment: string | null;
          is_anonymous: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          review_status: string | null;
          is_verified_session: boolean | null;
          helpful_votes: number | null;
          unhelpful_votes: number | null;
          moderated_at: string | null;
          moderated_by: string | null;
          moderation_notes: string | null;
        };
        Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>;
      };

      conversations: {
        Row: {
          id: string;
          participant_1_id: string;
          participant_2_id: string;
          last_message_at: string | null;
          unread_count_1: number | null;
          unread_count_2: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };

      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          is_read: boolean | null;
          created_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };

      favorites: {
        Row: {
          id: string;
          client_id: string;
          therapist_id: string;
          created_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['favorites']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['favorites']['Insert']>;
      };

      progress_goals: {
        Row: {
          id: string;
          client_id: string;
          practitioner_id: string;
          goal_title: string;
          goal_description: string;
          target_value: number;
          target_unit: string;
          target_date: string;
          status: string;
          progress_notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['progress_goals']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['progress_goals']['Insert']>;
      };

      progress_metrics: {
        Row: {
          id: string;
          client_id: string;
          practitioner_id: string;
          session_id: string | null;
          metric_name: string;
          metric_value: number;
          metric_unit: string;
          session_date: string;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['progress_metrics']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['progress_metrics']['Insert']>;
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string | null;
          data: Json | null;
          is_read: boolean | null;
          created_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };

      availability_slots: {
        Row: {
          id: string;
          therapist_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          duration_minutes: number | null;
          is_available: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['availability_slots']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['availability_slots']['Insert']>;
      };
    };

    Views: {
      marketplace_practitioners: {
        Row: {
          id: string | null;
          user_id: string | null;
          first_name: string | null;
          last_name: string | null;
          bio: string | null;
          location: string | null;
          specializations: string[] | null;
          experience_years: number | null;
          hourly_rate: number | null;
          average_rating: number | null;
          total_reviews: number | null;
          professional_statement: string | null;
          treatment_philosophy: string | null;
          is_active: boolean | null;
          response_time_hours: number | null;
          profile_photo_url: string | null;
          verification_status: VerificationStatus | null;
          last_active: string | null;
        };
      };
    };

    Functions: {
      find_practitioners_by_distance: {
        Args: {
          search_lat: number;
          search_lon: number;
          radius_km: number;
          limit_count?: number;
          service_type?: string;
          min_price?: number;
          max_price?: number;
          min_rating?: number;
          p_user_role?: string;
        };
        Returns: unknown[];
      };
      get_next_available_slot: {
        Args: { practitioner_id: string; duration_minutes: number };
        Returns: { date: string; time: string }[];
      };
      create_booking_with_validation: {
        Args: {
          therapist_id: string;
          client_id: string;
          session_date: string;
          start_time: string;
          duration_minutes: number;
          product_id: string;
        };
        Returns: { id: string };
      };
    };

    Enums: {
      user_role: UserRole;
      onboarding_status: OnboardingStatus;
      session_status: SessionStatus;
      verification_status: VerificationStatus;
      therapist_specialization: TherapistSpecialization;
    };
  };
}

// Utility types for common operations
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row'];

// Convenient type aliases
export type User = Tables<'users'>;
export type TherapistProfile = Tables<'therapist_profiles'>;
export type PractitionerProduct = Tables<'practitioner_products'>;
export type ClientSession = Tables<'client_sessions'>;
export type Review = Tables<'reviews'>;
export type Conversation = Tables<'conversations'>;
export type Message = Tables<'messages'>;
export type Favorite = Tables<'favorites'>;
export type ProgressGoal = Tables<'progress_goals'>;
export type ProgressMetric = Tables<'progress_metrics'>;
export type Notification = Tables<'notifications'>;
export type AvailabilitySlot = Tables<'availability_slots'>;
export type MarketplacePractitioner = Views<'marketplace_practitioners'>;

