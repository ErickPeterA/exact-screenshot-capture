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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          event_name: string
          id: string
          metadata: Json
          node_code: string | null
          occurred_at: string
          session_id: string | null
        }
        Insert: {
          event_name: string
          id?: string
          metadata?: Json
          node_code?: string | null
          occurred_at?: string
          session_id?: string | null
        }
        Update: {
          event_name?: string
          id?: string
          metadata?: Json
          node_code?: string | null
          occurred_at?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "journey_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_sessions: {
        Row: {
          company: string
          completed_at: string | null
          created_at: string
          current_node: string | null
          id: string
          journey_version: string
          last_activity_at: string
          name: string
          started_at: string
          status: string
        }
        Insert: {
          company: string
          completed_at?: string | null
          created_at?: string
          current_node?: string | null
          id?: string
          journey_version?: string
          last_activity_at?: string
          name: string
          started_at?: string
          status?: string
        }
        Update: {
          company?: string
          completed_at?: string | null
          created_at?: string
          current_node?: string | null
          id?: string
          journey_version?: string
          last_activity_at?: string
          name?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          consent: boolean
          email: string
          id: string
          session_id: string
          submitted_at: string
          wants_contact: boolean
          whatsapp: string | null
        }
        Insert: {
          consent?: boolean
          email: string
          id?: string
          session_id: string
          submitted_at?: string
          wants_contact?: boolean
          whatsapp?: string | null
        }
        Update: {
          consent?: boolean
          email?: string
          id?: string
          session_id?: string
          submitted_at?: string
          wants_contact?: boolean
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "journey_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      result_snapshots: {
        Row: {
          created_at: string
          dimension_scores: Json
          engine_version: string
          extra: Json
          id: string
          journey_version: string
          opportunities: Json
          priorities: Json
          service_scores: Json
          session_id: string
          structured_points: Json
          uncertainty_rate: number
        }
        Insert: {
          created_at?: string
          dimension_scores?: Json
          engine_version: string
          extra?: Json
          id?: string
          journey_version?: string
          opportunities?: Json
          priorities?: Json
          service_scores?: Json
          session_id: string
          structured_points?: Json
          uncertainty_rate?: number
        }
        Update: {
          created_at?: string
          dimension_scores?: Json
          engine_version?: string
          extra?: Json
          id?: string
          journey_version?: string
          opportunities?: Json
          priorities?: Json
          service_scores?: Json
          session_id?: string
          structured_points?: Json
          uncertainty_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "result_snapshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "journey_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_answers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          node_code: string
          option_code: string
          session_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          node_code: string
          option_code: string
          session_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          node_code?: string
          option_code?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "journey_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
