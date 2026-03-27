export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  public: {
    Tables: {
      client_sessions: {
        Row: {
          appointment_type: string;
          client_email: string | null;
          client_id: string | null;
          client_name: string;
          client_phone: string | null;
          created_at: string | null;
          credit_cost: number | null;
          duration_minutes: number;
          has_recording: boolean | null;
          id: string;
          is_peer_booking: boolean | null;
          notes: string | null;
          payment_date: string | null;
          payment_method: string | null;
          payment_status: string | null;
          platform_fee_amount: number | null;
          practitioner_amount: number | null;
          price: number | null;
          recording_consent: boolean | null;
          session_date: string;
          session_type: string | null;
          start_time: string;
          status: Database["public"]["Enums"]["session_status"] | null;
          stripe_payment_intent_id: string | null;
          therapist_id: string | null;
          updated_at: string | null;
          visit_address: string | null;
        };
        Insert: {
          appointment_type?: string;
          client_email?: string | null;
          client_id?: string | null;
          client_name: string;
          client_phone?: string | null;
          created_at?: string | null;
          credit_cost?: number | null;
          duration_minutes: number;
          has_recording?: boolean | null;
          id?: string;
          is_peer_booking?: boolean | null;
          notes?: string | null;
          payment_date?: string | null;
          payment_method?: string | null;
          payment_status?: string | null;
          platform_fee_amount?: number | null;
          practitioner_amount?: number | null;
          price?: number | null;
          recording_consent?: boolean | null;
          session_date: string;
          session_type?: string | null;
          start_time: string;
          status?: Database["public"]["Enums"]["session_status"] | null;
          stripe_payment_intent_id?: string | null;
          therapist_id?: string | null;
          updated_at?: string | null;
          visit_address?: string | null;
        };
        Update: {
          appointment_type?: string;
          client_email?: string | null;
          client_id?: string | null;
          client_name?: string;
          client_phone?: string | null;
          created_at?: string | null;
          credit_cost?: number | null;
          duration_minutes?: number;
          has_recording?: boolean | null;
          id?: string;
          is_peer_booking?: boolean | null;
          notes?: string | null;
          payment_date?: string | null;
          payment_method?: string | null;
          payment_status?: string | null;
          platform_fee_amount?: number | null;
          practitioner_amount?: number | null;
          price?: number | null;
          recording_consent?: boolean | null;
          session_date?: string;
          session_type?: string | null;
          start_time?: string;
          status?: Database["public"]["Enums"]["session_status"] | null;
          stripe_payment_intent_id?: string | null;
          therapist_id?: string | null;
          updated_at?: string | null;
          visit_address?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_sessions_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_sessions_therapist_id_fkey";
            columns: ["therapist_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          atmmif_status: boolean | null;
          avatar_preferences: Json | null;
          bio: string | null;
          cnhc_registration: boolean | null;
          created_at: string | null;
          email: string;
          email_verified_at: string | null;
          experience_years: number | null;
          first_name: string;
          full_name: string | null;
          goc_registration: boolean | null;
          hourly_rate: number | null;
          id: string;
          is_active: boolean | null;
          is_verified: boolean | null;
          itmmif_status: boolean | null;
          last_login_at: string | null;
          last_name: string;
          location: string | null;
          membership_number: string | null;
          oauth_completed: boolean | null;
          onboarding_status:
            | Database["public"]["Enums"]["onboarding_status"]
            | null;
          phone: string | null;
          pitch_side_trauma: boolean | null;
          preferences: Json | null;
          professional_body: string | null;
          professional_body_other: string | null;
          profile_completed: boolean | null;
          qualification_expiry: string | null;
          qualification_file_url: string | null;
          qualification_type: string | null;
          registration_number: string | null;
          specializations: string[] | null;
          terms_accepted: boolean | null;
          terms_accepted_at: string | null;
          updated_at: string | null;
          user_role: Database["public"]["Enums"]["user_role"] | null;
        };
        Insert: {
          atmmif_status?: boolean | null;
          avatar_preferences?: Json | null;
          bio?: string | null;
          cnhc_registration?: boolean | null;
          created_at?: string | null;
          email: string;
          email_verified_at?: string | null;
          experience_years?: number | null;
          first_name: string;
          full_name?: string | null;
          goc_registration?: boolean | null;
          hourly_rate?: number | null;
          id?: string;
          is_active?: boolean | null;
          is_verified?: boolean | null;
          itmmif_status?: boolean | null;
          last_login_at?: string | null;
          last_name: string;
          location?: string | null;
          membership_number?: string | null;
          oauth_completed?: boolean | null;
          onboarding_status?:
            | Database["public"]["Enums"]["onboarding_status"]
            | null;
          phone?: string | null;
          pitch_side_trauma?: boolean | null;
          preferences?: Json | null;
          professional_body?: string | null;
          professional_body_other?: string | null;
          profile_completed?: boolean | null;
          qualification_expiry?: string | null;
          qualification_file_url?: string | null;
          qualification_type?: string | null;
          registration_number?: string | null;
          specializations?: string[] | null;
          terms_accepted?: boolean | null;
          terms_accepted_at?: string | null;
          updated_at?: string | null;
          user_role?: Database["public"]["Enums"]["user_role"] | null;
        };
        Update: {
          atmmif_status?: boolean | null;
          avatar_preferences?: Json | null;
          bio?: string | null;
          cnhc_registration?: boolean | null;
          created_at?: string | null;
          email?: string;
          email_verified_at?: string | null;
          experience_years?: number | null;
          first_name?: string;
          full_name?: string | null;
          goc_registration?: boolean | null;
          hourly_rate?: number | null;
          id?: string;
          is_active?: boolean | null;
          is_verified?: boolean | null;
          itmmif_status?: boolean | null;
          last_login_at?: string | null;
          last_name?: string;
          location?: string | null;
          membership_number?: string | null;
          oauth_completed?: boolean | null;
          onboarding_status?:
            | Database["public"]["Enums"]["onboarding_status"]
            | null;
          phone?: string | null;
          pitch_side_trauma?: boolean | null;
          preferences?: Json | null;
          professional_body?: string | null;
          professional_body_other?: string | null;
          profile_completed?: boolean | null;
          qualification_expiry?: string | null;
          qualification_file_url?: string | null;
          qualification_type?: string | null;
          registration_number?: string | null;
          specializations?: string[] | null;
          terms_accepted?: boolean | null;
          terms_accepted_at?: string | null;
          updated_at?: string | null;
          user_role?: Database["public"]["Enums"]["user_role"] | null;
        };
        Relationships: [];
      };
    };
    Enums: {
      onboarding_status: "pending" | "in_progress" | "completed";
      session_status: "scheduled" | "completed" | "cancelled" | "no_show";
      user_role:
        | "sports_therapist"
        | "massage_therapist"
        | "osteopath"
        | "client"
        | "admin";
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;
