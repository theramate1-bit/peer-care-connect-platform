export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      client_sessions: {
        Row: {
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          created_at: string | null
          credit_cost: number | null
          duration_minutes: number
          has_recording: boolean | null
          id: string
          is_peer_booking: boolean | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          platform_fee_amount: number | null
          practitioner_amount: number | null
          price: number | null
          recording_consent: boolean | null
          session_date: string
          session_type: string | null
          start_time: string
          status: Database["public"]["Enums"]["session_status"] | null
          stripe_payment_intent_id: string | null
          therapist_id: string | null
          updated_at: string | null
        }
        Insert: {
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string | null
          credit_cost?: number | null
          duration_minutes: number
          has_recording?: boolean | null
          id?: string
          is_peer_booking?: boolean | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          platform_fee_amount?: number | null
          practitioner_amount?: number | null
          price?: number | null
          recording_consent?: boolean | null
          session_date: string
          session_type?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["session_status"] | null
          stripe_payment_intent_id?: string | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Update: {
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string | null
          credit_cost?: number | null
          duration_minutes?: number
          has_recording?: boolean | null
          id?: string
          is_peer_booking?: boolean | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          platform_fee_amount?: number | null
          practitioner_amount?: number | null
          price?: number | null
          recording_consent?: boolean | null
          session_date?: string
          session_type?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["session_status"] | null
          stripe_payment_intent_id?: string | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sessions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_preferences: Json | null
          bio: string | null
          created_at: string | null
          email: string
          email_verified_at: string | null
          first_name: string
          full_name: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_login_at: string | null
          last_name: string
          location: string | null
          oauth_completed: boolean | null
          onboarding_status:
            | Database["public"]["Enums"]["onboarding_status"]
            | null
          phone: string | null
          preferences: Json | null
          professional_body: string | null
          profile_completed: boolean | null
          registration_number: string | null
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          updated_at: string | null
          user_role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          avatar_preferences?: Json | null
          bio?: string | null
          created_at?: string | null
          email: string
          email_verified_at?: string | null
          first_name: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_login_at?: string | null
          last_name: string
          location?: string | null
          oauth_completed?: boolean | null
          onboarding_status?:
            | Database["public"]["Enums"]["onboarding_status"]
            | null
          phone?: string | null
          preferences?: Json | null
          professional_body?: string | null
          profile_completed?: boolean | null
          registration_number?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          avatar_preferences?: Json | null
          bio?: string | null
          created_at?: string | null
          email?: string
          email_verified_at?: string | null
          first_name?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_login_at?: string | null
          last_name?: string
          location?: string | null
          oauth_completed?: boolean | null
          onboarding_status?:
            | Database["public"]["Enums"]["onboarding_status"]
            | null
          phone?: string | null
          preferences?: Json | null
          professional_body?: string | null
          profile_completed?: boolean | null
          registration_number?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      treatment_notes: {
        Row: {
          id: string
          session_id: string
          practitioner_id: string
          client_id: string
          note_type: string
          content: string
          timestamp: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          practitioner_id: string
          client_id: string
          note_type: string
          content: string
          timestamp?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          practitioner_id?: string
          client_id?: string
          note_type?: string
          content?: string
          timestamp?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "client_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_notes_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      progress_metrics: {
        Row: {
          id: string
          client_id: string
          practitioner_id: string
          session_id: string | null
          metric_name: string
          metric_value: number
          metric_unit: string
          session_date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          practitioner_id: string
          session_id?: string | null
          metric_name: string
          metric_value: number
          metric_unit: string
          session_date: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          practitioner_id?: string
          session_id?: string | null
          metric_name?: string
          metric_value?: number
          metric_unit?: string
          session_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_metrics_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_metrics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "client_sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      progress_goals: {
        Row: {
          id: string
          client_id: string
          practitioner_id: string
          goal_title: string
          goal_description: string
          target_value: number
          target_unit: string
          target_date: string
          status: string
          progress_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          practitioner_id: string
          goal_title: string
          goal_description: string
          target_value: number
          target_unit: string
          target_date: string
          status: string
          progress_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          practitioner_id?: string
          goal_title?: string
          goal_description?: string
          target_value?: number
          target_unit?: string
          target_date?: string
          status?: string
          progress_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_goals_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      // ... other tables truncated for brevity
    }
    Views: {
      marketplace_practitioners: {
        Row: {
          average_rating: number | null
          bio: string | null
          experience_years: number | null
          first_name: string | null
          hourly_rate: number | null
          id: string | null
          is_active: boolean | null
          last_active: string | null
          last_name: string | null
          location: string | null
          professional_statement: string | null
          profile_photo_url: string | null
          response_time_hours: number | null
          specializations:
            | Database["public"]["Enums"]["therapist_specialization"][]
            | null
          total_reviews: number | null
          treatment_philosophy: string | null
          user_id: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "therapist_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      sync_existing_users: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      onboarding_status: "pending" | "in_progress" | "completed"
      session_status: "scheduled" | "completed" | "cancelled" | "no_show"
      user_role:
        | "sports_therapist"
        | "massage_therapist"
        | "osteopath"
        | "client"
        | "admin"
      professional_body:
        | "society_of_sports_therapists"
        | "british_association_of_sports_therapists"
        | "chartered_society_of_physiotherapy"
        | "british_osteopathic_association"
        | "other"
      therapist_specialization:
        | "sports_injury"
        | "rehabilitation"
        | "massage_therapy"
        | "strength_training"
        | "injury_prevention"
        | "sports_massage"
        | "physiotherapy"
        | "osteopathy"
      verification_status: "pending" | "verified" | "rejected" | "under_review"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      onboarding_status: ["pending", "in_progress", "completed"],
      user_role: [
        "sports_therapist",
        "massage_therapist",
        "osteopath",
        "client",
        "admin",
      ],
      professional_body: [
        "society_of_sports_therapists",
        "british_association_of_sports_therapists",
        "chartered_society_of_physiotherapy",
        "british_osteopathic_association",
        "other",
      ],
      therapist_specialization: [
        "sports_injury",
        "rehabilitation",
        "massage_therapy",
        "strength_training",
        "injury_prevention",
        "sports_massage",
        "physiotherapy",
        "osteopathy",
      ],
      verification_status: ["pending", "verified", "rejected", "under_review"],
    },
  },
} as const