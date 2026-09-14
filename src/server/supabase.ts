import { createClient } from "@supabase/supabase-js";
import type { RoomState } from "@/game/types";

/** Minimal schema for the tables we own (supabase/migrations). */
export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: { code: string; state: unknown; version: number; updated_at: string; doc: string | null };
        Insert: { code: string; state: RoomState; version: number };
        Update: { state?: RoomState; version?: number; updated_at?: string; doc?: string };
        Relationships: [];
      };
      profiles: {
        Row: { id: string; username: string; created_at: string };
        Insert: { id: string; username: string };
        Update: { username?: string };
        Relationships: [];
      };
      game_results: {
        Row: {
          id: string;
          user_id: string;
          code: string;
          played_at: string;
          seats: string[];
          was_imposter: boolean;
          won: boolean;
          reason: string;
          cards_played: number;
          cards_altered: number;
          ejected: boolean;
          players: number;
        };
        Insert: {
          user_id: string;
          code: string;
          played_at?: string;
          seats: string[];
          was_imposter: boolean;
          won: boolean;
          reason: string;
          cards_played: number;
          cards_altered: number;
          ejected: boolean;
          players: number;
        };
        Update: Record<string, never>;
        Relationships: [{ foreignKeyName: "game_results_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      friendships: {
        Row: { requester: string; addressee: string; status: "pending" | "accepted"; created_at: string };
        Insert: { requester: string; addressee: string; status: "pending" | "accepted" };
        Update: { status?: "pending" | "accepted" };
        Relationships: [
          { foreignKeyName: "friendships_requester_fkey"; columns: ["requester"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "friendships_addressee_fkey"; columns: ["addressee"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
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
