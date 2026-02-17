/**
 * Metro area types — snake_case matching Supabase database columns
 * See: supabase/migrations/001_initial_schema.sql
 */

export interface MetroArea {
  id: string;
  name: string;
  state: string;
  population: number | null;
  cbsa_type?: string;
  created_at?: string;
}

export interface MetroAreaResult {
  data?: MetroArea;
  error?: Error;
}
