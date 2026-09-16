import type { Player, RoomState } from "@/game/types";
import { bankById } from "@/problems";
import { DEFAULT_RATING, expected } from "@/server/elo";
import { loadRatings, UNRATED } from "@/server/ratings";
import { supabase, unwrap } from "@/server/supabase";

/**
 * A bank problem carries a rating of its own and defends it against every crew that sits down to it.
 * ponytail: K = 24, gentler than the players' 32, because a problem plays far more halls than any
 * player does; raise it if the authored ratings turn out to be badly off and settle too slowly.
 */
export const PROBLEM_K = 24;

/**
 * The problem's rating after one hall. The crew won when the judge accepted, so the problem scores
 * zero; anything else — the candle, the Reckoning, a Changeling who walked away with it — is a win
 * for the problem. Pure, so the arithmetic is testable without a table.
 */
export function rateProblem(rating: number, crewRating: number, accepted: boolean): number {
  return Math.round(rating + PROBLEM_K * ((accepted ? 0 : 1) - expected(rating, crewRating)));
}

/**
 * The bank's share of the reveal, registered in afterHall's HOOKS: a hall whose problem came from
 * the bank moves that problem's live rating and its attempt and solve counts. The row is seeded
 * from the authored rating the first time the problem is ever played.
 *
 * Idempotent as the pipeline runs it: `recordResults` reaches afterHall only on the call that first
 * writes this hall's game_results rows (unique user_id + code), so a replayed reveal counts once.
 */
export async function problemAfterHall(state: RoomState): Promise<void> {
  const bankId = state.problem?.bankId;
  if (bankId === undefined) return;
  const problem = bankById(bankId);
  // A hall may carry an id the bank no longer holds (a problem retired between the deal and the reveal).
  if (problem === null) return;

  const crew = state.players.filter((p) => !p.isImposter);
  const ratings = await loadRatings(crew.flatMap((p) => (p.userId === null ? [] : [p.userId])));
  // A guest, and an account that has never been rated, both sit down at the default rating.
  const overall = (p: Player): number => (ratings.get(p.userId ?? "") ?? UNRATED).overall.rating;
  const crewRating = crew.length === 0 ? DEFAULT_RATING : crew.reduce((sum, p) => sum + overall(p), 0) / crew.length;
  const accepted = state.outcome?.reason === "accepted";

  const before =
    unwrap(`problem_stats ${bankId}`, await supabase.from("problem_stats").select("rating, attempts, solves").eq("problem_id", bankId).maybeSingle()) ??
    { rating: problem.rating, attempts: 0, solves: 0 };
  unwrap(
    `problem_stats upsert ${bankId}`,
    await supabase.from("problem_stats").upsert({
      problem_id: bankId,
      rating: rateProblem(before.rating, crewRating, accepted),
      attempts: before.attempts + 1,
      solves: before.solves + (accepted ? 1 : 0),
      updated_at: new Date().toISOString(),
    }),
  );
}
