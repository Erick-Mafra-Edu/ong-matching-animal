import { createClient } from "@supabase/supabase-js";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      onboarding_questions: {
        Row: {
          id: string;
          label: string;
          description: string | null;
          placeholder: string | null;
          type: string;
          options: Json | null;
          required: boolean;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      tutors: {
        Row: {
          id: string;
          auth_user_id: string | null;
          name: string;
          location: unknown | null;
          custom_fields: Json;
          onboarding_completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          name: string;
          location?: unknown | null;
          custom_fields?: Json;
          onboarding_completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          auth_user_id?: string | null;
          name?: string;
          location?: unknown | null;
          custom_fields?: Json;
          onboarding_completed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

let browserClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }

  browserClient = createClient<Database>(supabaseUrl, publishableKey);
  return browserClient;
}
