import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase client (with Row Level Security)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (bypasses RLS, for API routes)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;

// Database types
export interface DesignEntry {
  id: string;
  created_at: string;
  image_url: string | null;
  image_path: string | null;
  context: string | null;
  inquiries: string | null;
  advice: string;
  user_id?: string | null;
}

export interface DesignVersion {
  id: string;
  created_at: string;
  version_number: number;
  image_url: string | null;
  image_path: string | null;
  advice: string;
  entry_id: string;
  notes: string | null;
}

export interface UserSettings {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  global_advice: string | null;
}