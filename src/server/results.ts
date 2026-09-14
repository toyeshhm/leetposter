import { cardAltered } from "@/components/game/copy";
import type { Player, RoomState } from "@/game/types";
import type { GameResultRow } from "@/server/achievements";
import { log } from "@/server/log";
import { supabase } from "@/server/supabase";

const HISTORY_LIMIT = 50;

/**
 * Record one game_results row per player who holds an account, once a hall has reached the reveal.
 * Idempotent (unique user_id + code). Guests are skipped. Never throws into the game path: log and return.
 * This is the one place a database failure is swallowed; the game itself was already saved.
 */
export async function recordResults(state: RoomState): Promise<void> {
  const { problem, outcome } = state;
  if (problem === null || outcome === null) return;
  const rows = state.players.flatMap((p) => {
    if (p.userId === null) return [];
    const cards = state.cards.filter((c) => c.playerId === p.id);
    return [
      {
        user_id: p.userId,
        code: state.code,
        seats: seatsHeld(p, cards.map((c) => c.seat)),
        was_imposter: p.isImposter,
        won: (outcome.winner === "imposter") === p.isImposter,
        reason: outcome.reason,
        cards_played: cards.length,
        cards_altered: cards.filter((c) => cardAltered(problem, c.card)).length,
        ejected: p.ejected,
        players: state.players.length,
      },
    ];
  });
  if (rows.length === 0) return;
  const { error } = await supabase.from("game_results").upsert(rows, { onConflict: "user_id,code" });
  if (error !== null) log.error("results.failed", { code: state.code, error: error.message });
}

/** Seats a player held at any point: their seats now, plus any seat they played a card from (the Herald seat moves on ejection). */
function seatsHeld(player: Player, played: Player["seats"]): string[] {
  return [...new Set([...player.seats, ...played])];
}

/** A player's recorded games, newest first, at most the last fifty. */
export async function loadResults(userId: string): Promise<GameResultRow[]> {
  const { data, error } = await supabase
    .from("game_results")
    .select("*")
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error !== null) throw new Error(`loadResults ${userId}: ${error.message}`);
  return data;
}
