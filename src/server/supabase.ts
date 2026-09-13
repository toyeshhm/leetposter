import { createClient } from "@supabase/supabase-js";
import type { RoomState } from "@/game/types";

/** Minimal schema for the one table we own: rooms(code, state jsonb, version). */
export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: { code: string; state: unknown; version: number; updated_at: string };
        Insert: { code: string; state: RoomState; version: number };
        Update: { state?: RoomState; version?: number; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ponytail: the "server-only" package is not a dependency; a runtime guard does the same job.
if (typeof window !== "undefined") throw new Error("src/server/supabase.ts must never be imported in the browser");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;
if (url === undefined || url === "" || key === undefined || key === "") {
  throw new Error("SUPABASE_URL and SUPABASE_KEY must be set (see .env.example)");
}

export const supabase = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
