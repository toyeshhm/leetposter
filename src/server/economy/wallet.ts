import { supabase, unwrap } from "@/server/supabase";

/** Candles are the soft currency; xp is the lifetime total (the pass keeps its own, per season). */
export interface Wallet {
  candles: number;
  xp: number;
}

/** The account's wallet, opened empty the first time anyone asks for it. */
export async function ensureWallet(userId: string): Promise<Wallet> {
  // The upsert names only user_id, so an existing row keeps its candles and xp and is simply returned.
  return unwrap(`wallet ${userId}`, await supabase.from("wallets").upsert({ user_id: userId }, { onConflict: "user_id" }).select("candles, xp").single());
}

/**
 * Add candles (never negative: the store spends them itself, conditionally). Answers the new balance.
 * ponytail: read then write, so two grants in the same millisecond can lose one. The upgrade is a
 * Postgres function doing `candles = candles + n`; nothing in the game grants concurrently today.
 */
export async function grantCandles(userId: string, candles: number): Promise<number> {
  const wallet = await ensureWallet(userId);
  const next = wallet.candles + candles;
  unwrap(`grant candles ${userId}`, await supabase.from("wallets").update({ candles: next, updated_at: new Date().toISOString() }).eq("user_id", userId));
  return next;
}
