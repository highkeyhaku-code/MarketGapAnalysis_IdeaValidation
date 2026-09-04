export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      genres: {
        Row: {
          id: string;
          level: number;
          parent_id: string | null;
          canonical_name: string;
          description: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          level: number;
          parent_id?: string | null;
          canonical_name: string;
          description?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          level?: number;
          parent_id?: string | null;
          canonical_name?: string;
          description?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "genres_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "genres";
            referencedColumns: ["id"];
          }
        ];
      };
      source_topic_mappings: {
        Row: {
          id: string;
          source_name: string;
          source_topic_key: string;
          genre_id: string;
          last_fetched_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          source_name: string;
          source_topic_key: string;
          genre_id: string;
          last_fetched_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          source_name?: string;
          source_topic_key?: string;
          genre_id?: string;
          last_fetched_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "source_topic_mappings_genre_id_fkey";
            columns: ["genre_id"];
            isOneToOne: false;
            referencedRelation: "genres";
            referencedColumns: ["id"];
          }
        ];
      };
      rankings: {
        Row: {
          id: string;
          genre_id: string;
          rank_list: Json;
          last_computed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          genre_id: string;
          rank_list?: Json;
          last_computed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          genre_id?: string;
          rank_list?: Json;
          last_computed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rankings_genre_id_fkey";
            columns: ["genre_id"];
            isOneToOne: false;
            referencedRelation: "genres";
            referencedColumns: ["id"];
          }
        ];
      };
      apps: {
        Row: {
          id: string;
          name: string;
          tagline: string | null;
          description: string | null;
          homepage_url: string | null;
          logo_url: string | null;
          features: Json;
          raw_reviews_count: number;
          physical_scores: Json;
          last_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tagline?: string | null;
          description?: string | null;
          homepage_url?: string | null;
          logo_url?: string | null;
          features?: Json;
          raw_reviews_count?: number;
          physical_scores?: Json;
          last_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          tagline?: string | null;
          description?: string | null;
          homepage_url?: string | null;
          logo_url?: string | null;
          features?: Json;
          raw_reviews_count?: number;
          physical_scores?: Json;
          last_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_genres: {
        Row: {
          app_id: string;
          genre_id: string;
          created_at: string;
        };
        Insert: {
          app_id: string;
          genre_id: string;
          created_at?: string;
        };
        Update: {
          app_id?: string;
          genre_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "app_genres_app_id_fkey";
            columns: ["app_id"];
            isOneToOne: false;
            referencedRelation: "apps";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "app_genres_genre_id_fkey";
            columns: ["genre_id"];
            isOneToOne: false;
            referencedRelation: "genres";
            referencedColumns: ["id"];
          }
        ];
      };
      market_cache: {
        Row: {
          id: string;
          genre_id: string;
          materialized_json: Json;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          genre_id: string;
          materialized_json: Json;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          genre_id?: string;
          materialized_json?: Json;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "market_cache_genre_id_fkey";
            columns: ["genre_id"];
            isOneToOne: true;
            referencedRelation: "genres";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          id: string;
          credits_balance: number;
          plan_tier: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          credits_balance?: number;
          plan_tier?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          credits_balance?: number;
          plan_tier?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ideas: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          active_commit_id: string | null;
          is_public: boolean | null;
          share_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          active_commit_id?: string | null;
          is_public?: boolean | null;
          share_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          active_commit_id?: string | null;
          is_public?: boolean | null;
          share_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ideas_active_commit_id_fkey";
            columns: ["active_commit_id"];
            isOneToOne: false;
            referencedRelation: "idea_commits";
            referencedColumns: ["id"];
          }
        ];
      };
      idea_commits: {
        Row: {
          id: string;
          idea_id: string;
          parent_commit_id: string | null;
          q1_target_pain: string | null;
          q2_solution: string | null;
          q3_core_edge: string | null;
          q4_target_literacy: string | null;
          q4_monetization_model: string | null;
          q4_supplementary_pains: Json;
          status: string;
          emotional_score: number | null;
          semantic_diff: string | null;
          target_coordinates: Json | null;
          share_token: string;
          visibility_flags: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          parent_commit_id?: string | null;
          q1_target_pain?: string | null;
          q2_solution?: string | null;
          q3_core_edge?: string | null;
          q4_target_literacy?: string | null;
          q4_monetization_model?: string | null;
          q4_supplementary_pains?: Json;
          status?: string;
          emotional_score?: number | null;
          semantic_diff?: string | null;
          target_coordinates?: Json | null;
          share_token?: string;
          visibility_flags?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          idea_id?: string;
          parent_commit_id?: string | null;
          q1_target_pain?: string | null;
          q2_solution?: string | null;
          q3_core_edge?: string | null;
          q4_target_literacy?: string | null;
          q4_monetization_model?: string | null;
          q4_supplementary_pains?: Json;
          status?: string;
          emotional_score?: number | null;
          semantic_diff?: string | null;
          target_coordinates?: Json | null;
          share_token?: string;
          visibility_flags?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_commits_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "idea_commits_parent_commit_id_fkey";
            columns: ["parent_commit_id"];
            isOneToOne: false;
            referencedRelation: "idea_commits";
            referencedColumns: ["id"];
          }
        ];
      };
      job_status: {
        Row: {
          id: string;
          user_id: string | null;
          status: string;
          percentage: number;
          error_message: string | null;
          result_data: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id?: string | null;
          status: string;
          percentage?: number;
          error_message?: string | null;
          result_data?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          status?: string;
          percentage?: number;
          error_message?: string | null;
          result_data?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          stripe_customer_id: string | null;
          plan_tier: "free" | "starter" | "founder" | "studio" | "pro";
          monthly_credits: number;
          purchased_credits: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          stripe_customer_id?: string | null;
          plan_tier?: "free" | "starter" | "founder" | "studio" | "pro";
          monthly_credits?: number;
          purchased_credits?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          stripe_customer_id?: string | null;
          plan_tier?: "free" | "starter" | "founder" | "studio" | "pro";
          monthly_credits?: number;
          purchased_credits?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_unlocked_markets: {
        Row: {
          id: string;
          user_id: string;
          genre_id: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          genre_id: string;
          unlocked_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          genre_id?: string;
          unlocked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_unlocked_markets_genre_id_fkey";
            columns: ["genre_id"];
            isOneToOne: false;
            referencedRelation: "genres";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      manual_cache_revalidate: {
        Args: {
          p_user_id: string;
          p_genre_id: string;
        };
        Returns: boolean;
      };
      calculate_borda_top10: {
        Args: {
          rankings_jsonb: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
