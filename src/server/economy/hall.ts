import { badgeForAchievement } from "@/economy/catalog";
import type { RoomState } from "@/game/types";
import { achievements, type GameResultRow } from "@/server/achievements";
import { grantItem } from "@/server/economy/inventory";
import { grantXp } from "@/server/economy/pass";
import { advanceQuests } from "@/server/economy/quests";
import { supabase, unwrap } from "@/server/supabase";

const BASE_XP = 40;
const WIN_XP = 30;
const ACCEPTED_XP = 20;
const CARD_XP = 10;

/** What one hall was worth to one player: the sitting, the win, the green mark, and every card played as written. */
export function xpForHall(row: GameResultRow): number {
  return BASE_XP + (row.won ? WIN_XP : 0) + (row.reason === "accepted" ? ACCEPTED_XP : 0) + CARD_XP * (row.cards_played - row.cards_altered);
}

/**
 * The economy's share of the reveal, run from `afterHall` once the game_results rows exist: XP for
 * everyone who holds an account, quest counters moved on, and a badge for every achievement they
 * now hold. Badges are computed from all of the player's rows and granted idempotently, so one that
 * was earned last week is simply re-granted to no effect.
 */
export async function economyAfterHall(state: RoomState): Promise<void> {
  const userIds = [...new Set(state.players.flatMap((player) => (player.userId === null ? [] : [player.userId])))];
  if (userIds.length === 0) return;
  const rows = unwrap(`hall results ${state.code}`, await supabase.from("game_results").select("*").in("user_id", userIds));
  const hall = rows.filter((row) => row.code === state.code);
  const now = new Date();
  for (const row of hall) await grantXp(row.user_id, xpForHall(row), now);
  await advanceQuests(state, hall, now);
  for (const userId of userIds) {
    const earned = achievements(rows.filter((row) => row.user_id === userId)).filter((achievement) => achievement.earned);
    for (const achievement of earned) await grantItem(userId, badgeForAchievement(achievement.id), "achievement");
  }
}
