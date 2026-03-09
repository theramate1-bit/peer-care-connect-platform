/**
 * Type definitions for Treatment Exchange system
 * 
 * This file contains all TypeScript interfaces and types used throughout
 * the treatment exchange feature. Keeping types separate makes them easier
 * to find, reuse, and maintain.
 */

/**
 * User preferences for treatment exchange matching
 */
export interface TreatmentExchangePreferences {
  /** Specializations the user prefers to exchange with */
  preferred_specializations: string[];
  
  /** Minimum rating threshold (0-5) */
  rating_threshold: number;
  
  /** Whether to automatically accept matching requests */
  auto_accept: boolean;
  
  /** Maximum distance in kilometers */
  max_distance_km: number;
  
  /** Preferred session types */
  preferred_session_types: string[];
  
  /** Availability preferences */
  availability_preferences: {
    weekdays: boolean;
    weekends: boolean;
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  };
}

/**
 * Treatment exchange request between two practitioners
 */
export interface ExchangeRequest {
  id: string;
  
  /** Practitioner who requested the treatment */
  requester_id: string;
  
  /** Practitioner who received the request */
  recipient_id: string;
  
  /** Date of requested session (YYYY-MM-DD) */
  requested_session_date: string;
  
  /** Start time (HH:MM) */
  requested_start_time: string;
  
  /** End time (HH:MM) */
  requested_end_time: string;
  
  /** Duration in minutes */
  duration_minutes: number;
  
  /** Optional session type (e.g., 'massage', 'osteopathy') */
  session_type?: string;
  
  /** Notes from requester */
  requester_notes?: string;
  
  /** Notes from recipient */
  recipient_notes?: string;
  
  /** Current status of the request */
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  
  /** When the request expires (ISO timestamp) */
  expires_at: string;
  
  /** When the request was accepted (ISO timestamp) */
  accepted_at?: string;
  
  /** When the request was declined (ISO timestamp) */
  declined_at?: string;
  
  /** When the request was created (ISO timestamp) */
  created_at: string;
  
  /** When the request was last updated (ISO timestamp) */
  updated_at: string;
  
  /** Joined data: Requester practitioner details */
  requester?: {
    id: string;
    first_name: string;
    last_name: string;
    user_role: string;
    specializations: string[];
    average_rating?: number;
    profile_photo_url?: string;
  };
  
  /** Joined data: Recipient practitioner details */
  recipient?: {
    id: string;
    first_name: string;
    last_name: string;
    user_role: string;
    specializations: string[];
    average_rating?: number;
    profile_photo_url?: string;
  };
}

/**
 * Mutual exchange session created when request is accepted
 */
export interface MutualExchangeSession {
  id: string;
  
  /** ID of the exchange request this session came from */
  exchange_request_id: string;
  
  /** First practitioner (usually the requester) */
  practitioner_a_id: string;
  
  /** Second practitioner (usually the recipient) */
  practitioner_b_id: string;
  
  /** Session date (YYYY-MM-DD) */
  session_date: string;
  
  /** Start time (HH:MM) */
  start_time: string;
  
  /** End time (HH:MM) */
  end_time: string;
  
  /** Duration in minutes */
  duration_minutes: number;
  
  /** Optional session type */
  session_type?: string;
  
  /** Optional location */
  location?: string;
  
  /** Current status of the session */
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  
  /** Notes from practitioner A */
  practitioner_a_notes?: string;
  
  /** Notes from practitioner B */
  practitioner_b_notes?: string;
  
  /** Rating from practitioner A (1-5) */
  practitioner_a_rating?: number;
  
  /** Rating from practitioner B (1-5) */
  practitioner_b_rating?: number;
  
  /** Feedback from practitioner A */
  practitioner_a_feedback?: string;
  
  /** Feedback from practitioner B */
  practitioner_b_feedback?: string;
  
  /** Number of credits exchanged */
  credits_exchanged: number;
  
  /** When the session was created (ISO timestamp) */
  created_at: string;
  
  /** When the session was last updated (ISO timestamp) */
  updated_at: string;
}

/**
 * Practitioner eligible for treatment exchange
 */
export interface EligiblePractitioner {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  user_role: string;
  specializations: string[];
  average_rating?: number;
  profile_photo_url?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  treatment_exchange_preferences?: TreatmentExchangePreferences;
}

/**
 * Filters for finding eligible practitioners
 */
export interface PractitionerFilters {
  /** Filter by specializations */
  specializations?: string[];
  
  /** Minimum rating threshold */
  rating_threshold?: number;
  
  /** Maximum distance in kilometers */
  max_distance_km?: number;
  
  /** Preferred session types */
  session_types?: string[];
}

/**
 * Credit balance check result
 */
export interface CreditBalanceResult {
  /** Whether user has sufficient credits */
  hasSufficientCredits: boolean;
  
  /** Current credit balance */
  currentBalance: number;
  
  /** Required number of credits */
  requiredCredits: number;
}
