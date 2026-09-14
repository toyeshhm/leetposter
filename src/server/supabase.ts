import type { PostgrestSingleResponse } from "@supabase/supabase-js";

export type ItemKind = "avatar" | "frame" | "title" | "theme" | "caret" | "badge" | "emote";
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type InventorySource = "store" | "pass" | "quest" | "achievement" | "grant";
export type PurchaseKind = "pass" | "candles";
export type PurchaseStatus = "pending" | "paid" | "failed";
import { createClient } from "@supabase/supabase-js";
import type { RoomState } from "@/game/types";

/** Minimal schema for the tables we own (supabase/migrations). */
export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: { code: string; state: unknown; version: number; updated_at: string; doc: string | null; listed: boolean };
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
      ratings: {
        Row: { user_id: string; ladder: "overall" | "crew" | "changeling"; rating: number; games: number; wins: number; updated_at: string };
        Insert: { user_id: string; ladder: "overall" | "crew" | "changeling"; rating: number; games: number; wins: number; updated_at?: string };
        Update: { rating?: number; games?: number; wins?: number; updated_at?: string };
        Relationships: [{ foreignKeyName: "ratings_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      problem_stats: {
        Row: { problem_id: string; rating: number; attempts: number; solves: number; updated_at: string };
        Insert: { problem_id: string; rating: number; attempts?: number; solves?: number; updated_at?: string };
        Update: { rating?: number; attempts?: number; solves?: number; updated_at?: string };
        Relationships: [];
      };
      items: {
        Row: { id: string; kind: ItemKind; name: string; description: string; rarity: Rarity; price_candles: number | null; season_id: string | null; tier: number | null; created_at: string };
        Insert: { id: string; kind: ItemKind; name: string; description?: string; rarity: Rarity; price_candles?: number | null; season_id?: string | null; tier?: number | null; created_at?: string };
        Update: { name?: string; description?: string; rarity?: Rarity; price_candles?: number | null; season_id?: string | null; tier?: number | null };
        Relationships: [];
      };
      wallets: {
        Row: { user_id: string; candles: number; xp: number; updated_at: string };
        Insert: { user_id: string; candles?: number; xp?: number; updated_at?: string };
        Update: { candles?: number; xp?: number; updated_at?: string };
        Relationships: [{ foreignKeyName: "wallets_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      inventory: {
        Row: { user_id: string; item_id: string; source: InventorySource; acquired_at: string };
        Insert: { user_id: string; item_id: string; source: InventorySource; acquired_at?: string };
        Update: { source?: InventorySource };
        Relationships: [
          { foreignKeyName: "inventory_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "inventory_item_id_fkey"; columns: ["item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["id"] },
        ];
      };
      loadouts: {
        Row: { user_id: string; avatar: string | null; frame: string | null; title: string | null; theme: string | null; caret: string | null; badge: string | null; updated_at: string };
        Insert: { user_id: string; avatar?: string | null; frame?: string | null; title?: string | null; theme?: string | null; caret?: string | null; badge?: string | null; updated_at?: string };
        Update: { avatar?: string | null; frame?: string | null; title?: string | null; theme?: string | null; caret?: string | null; badge?: string | null; updated_at?: string };
        Relationships: [{ foreignKeyName: "loadouts_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      seasons: {
        Row: { id: string; name: string; starts_at: string; ends_at: string; tiers: unknown };
        Insert: { id: string; name: string; starts_at: string; ends_at: string; tiers: unknown };
        Update: { name?: string; starts_at?: string; ends_at?: string; tiers?: unknown };
        Relationships: [];
      };
      pass_progress: {
        Row: { user_id: string; season_id: string; xp: number; paid: boolean; claimed: number[] };
        Insert: { user_id: string; season_id: string; xp?: number; paid?: boolean; claimed?: number[] };
        Update: { xp?: number; paid?: boolean; claimed?: number[] };
        Relationships: [
          { foreignKeyName: "pass_progress_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "pass_progress_season_id_fkey"; columns: ["season_id"]; isOneToOne: false; referencedRelation: "seasons"; referencedColumns: ["id"] },
        ];
      };
      quest_progress: {
        Row: { user_id: string; quest_id: string; period: string; progress: number; claimed: boolean; updated_at: string };
        Insert: { user_id: string; quest_id: string; period: string; progress?: number; claimed?: boolean; updated_at?: string };
        Update: { progress?: number; claimed?: boolean; updated_at?: string };
        Relationships: [{ foreignKeyName: "quest_progress_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      purchases: {
        Row: { id: string; user_id: string; kind: PurchaseKind; season_id: string | null; stripe_session_id: string | null; amount_cents: number; status: PurchaseStatus; created_at: string };
        Insert: { id?: string; user_id: string; kind: PurchaseKind; season_id?: string | null; stripe_session_id?: string | null; amount_cents: number; status: PurchaseStatus; created_at?: string };
        Update: { status?: PurchaseStatus; stripe_session_id?: string | null };
        Relationships: [{ foreignKeyName: "purchases_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
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

/** A PostgREST answer as data, or an Error naming the query. */
export function unwrap<T>(what: string, res: PostgrestSingleResponse<T>): T {
  if (res.error !== null) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}
