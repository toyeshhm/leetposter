import { cardAltered } from "@/components/game/copy";
import type { Player, RoomState } from "@/game/types";
import type { GameResultRow } from "@/server/achievements";
import { rateHall, type Ladder, type Ratings } from "@/server/elo";
import { log } from "@/server/log";
import { loadRatings, UNRATED, upsertRatings, type LadderRow } from "@/server/ratings";
import { afterHall } from "@/server/afterHall";
import { supabase } from "@/server/supabase";

const HISTORY_LIMIT = 50;

/**
 * Record one game_results row per player who holds an account, once a hall has reached the reveal,
 * then rate the hall. Idempotent (unique user_id + code): a hall whose rows already exist is not rated
 * again. Guests are skipped. A refused results row is logged and swallowed (the game itself was already
 * saved); a ratings failure throws to actHandler, which logs it.
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
  const { data, error } = await supabase.from("game_results").upsert(rows, { onConflict: "user_id,code", ignoreDuplicates: true }).select("user_id");
  if (error !== null) {
    log.error("results.failed", { code: state.code, error: error.message });
    return;
  }
  if (data.length === 0) return;
  const current = await loadRatings(rows.map((r) => r.user_id));
  const ladders = (userId: string | null): Record<Ladder, LadderRow> => (userId === null ? UNRATED : (current.get(userId) ?? UNRATED));
  const elo = (r: Record<Ladder, LadderRow>): Ratings => ({ overall: r.overall.rating, crew: r.crew.rating, changeling: r.changeling.rating });
  const changes = rateHall(
    state.players.map((p) => ({ userId: p.userId, isImposter: p.isImposter, rating: elo(ladders(p.userId)) })),
    outcome.winner,
  );
  await upsertRatings(
    changes.map((c) => {
      const before = ladders(c.userId)[c.ladder];
      return { user_id: c.userId, ladder: c.ladder, rating: c.rating, games: before.games + 1, wins: before.wins + (c.won ? 1 : 0) };
    }),
  );
  await afterHall(state);
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
