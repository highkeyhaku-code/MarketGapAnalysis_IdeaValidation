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
          level: 1 | 2 | 3;
          parent_id: string | null;
          canonical_name: string;
          description: string | null;
          status: 'active' | 'stagnant' | 'deprecated';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          level: 1 | 2 | 3;
          parent_id?: string | null;
          canonical_name: string;
          description?: string | null;
          status?: 'active' | 'stagnant' | 'deprecated';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          level?: 1 | 2 | 3;
          parent_id?: string | null;
          canonical_name?: string;
          description?: string | null;
          status?: 'active' | 'stagnant' | 'deprecated';
          created_at?: string;
          updated_at?: string;
        };
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
      };
      rankings: {
        Row: {
          id: string;
          genre_id: string;
          rank_list: Json; // [{ "app_id": "UUID", "rank": number }]
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
      };
      users: {
        Row: {
          id: string;
          credits_balance: number;
          plan_tier: 'free' | 'bootstrapper' | 'founder' | 'studio';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          credits_balance?: number;
          plan_tier?: 'free' | 'bootstrapper' | 'founder' | 'studio';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          credits_balance?: number;
          plan_tier?: 'free' | 'bootstrapper' | 'founder' | 'studio';
          created_at?: string;
          updated_at?: string;
        };
      };
      ideas: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
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
          created_at?: string;
        };
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
      };
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
  };
};
