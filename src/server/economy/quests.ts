import type { QuestsPage } from "@/client/api";
import { questsFor, type Quest, type QuestRule } from "@/economy/quests";
import { GameError } from "@/game/errors";
import type { Problem, RoomState } from "@/game/types";
import type { GameResultRow } from "@/server/achievements";
import type { AccountUser } from "@/server/auth";
import { grantXp } from "@/server/economy/pass";
import { ensureWallet, grantCandles } from "@/server/economy/wallet";
import { supabase, unwrap } from "@/server/supabase";

/** What a quest rule needs from the hall itself, on top of the player's own recorded row. */
export interface Hall {
  problem: Problem | null;
  /** A tribunal (freeze) was called at least once. */
  tribunal: boolean;
}

/** Does this one recorded hall count towards this rule? Pure: the whole quest system turns on it. */
export function satisfies(rule: QuestRule, row: GameResultRow, hall: Hall): boolean {
  switch (rule.kind) {
    case "halls":
      return true;
    case "win":
      return row.won && (rule.as === "any" || (rule.as === "changeling") === row.was_imposter);
    case "cards-true":
      return row.cards_played - row.cards_altered >= rule.n;
    case "tribunal-called":
      return hall.tribunal;
    case "accepted":
      return !row.was_imposter && row.reason === "accepted";
    case "rating-at-least": {
      const rating = hall.problem?.rating;
      return rating !== undefined && rating >= rule.rating && row.reason === "accepted";
    }
    case "seat":
      return row.seats.includes(rule.seat);
    case "cast-out-changeling":
      return !row.was_imposter && row.reason === "imposter-ejected";
    case "survive":
      return row.was_imposter && row.won && !row.ejected;
  }
}

/** Today's three and this week's three, each with the period key they are counted under. */
function active(now: Date): { quest: Quest; period: string }[] {
  const { daily, weekly, period } = questsFor(now);
  return [...daily.map((quest) => ({ quest, period: period.daily })), ...weekly.map((quest) => ({ quest, period: period.weekly }))];
}

async function progressOf(userId: string, board: { quest: Quest; period: string }[]): Promise<Map<string, { progress: number; claimed: boolean }>> {
  const rows = unwrap(
    `quest progress ${userId}`,
    await supabase
      .from("quest_progress")
      .select("quest_id, period, progress, claimed")
      .eq("user_id", userId)
      .in("quest_id", board.map((entry) => entry.quest.id))
      .in("period", [...new Set(board.map((entry) => entry.period))]),
  );
  return new Map(rows.map((row) => [`${row.quest_id}@${row.period}`, { progress: row.progress, claimed: row.claimed }]));
}

/** The six quests on the board with what this account has counted against each. */
export async function questsPage(user: AccountUser, now = new Date()): Promise<QuestsPage> {
  const board = active(now);
  const [wallet, counted] = await Promise.all([ensureWallet(user.id), progressOf(user.id, board)]);
  const line = ({ quest, period }: { quest: Quest; period: string }): { id: string; progress: number; claimed: boolean } => {
    const row = counted.get(`${quest.id}@${period}`) ?? { progress: 0, claimed: false };
    return { id: quest.id, progress: row.progress, claimed: row.claimed };
  };
  return { daily: board.slice(0, 3).map(line), weekly: board.slice(3).map(line), candles: wallet.candles };
}

/** Take a finished quest's XP and candles, once per period. */
export async function claimQuest(user: AccountUser, questId: string, now = new Date()): Promise<QuestsPage> {
  const board = active(now);
  const entry = board.find(({ quest }) => quest.id === questId);
  if (entry === undefined) throw new GameError("invalid", "That quest is not on the board.");
  const row = (await progressOf(user.id, board)).get(`${questId}@${entry.period}`) ?? { progress: 0, claimed: false };
  if (row.claimed) throw new GameError("invalid", "You have taken that one already.");
  if (row.progress < entry.quest.goal) throw new GameError("invalid", `${entry.quest.name} wants ${String(entry.quest.goal)}; you have ${String(row.progress)}.`);
  unwrap(
    `claim ${questId} ${user.id}`,
    await supabase
      .from("quest_progress")
      .update({ claimed: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("quest_id", questId)
      .eq("period", entry.period),
  );
  await grantXp(user.id, entry.quest.xp, now);
  await grantCandles(user.id, entry.quest.candles);
  return questsPage(user, now);
}

/**
 * One recorded hall against every quest on the board, for every account at the table: each rule the
 * hall satisfies moves that player's counter on by one. `rows` are the hall's own game_results rows.
 */
export async function advanceQuests(state: RoomState, rows: GameResultRow[], now = new Date()): Promise<void> {
  const board = active(now);
  const hall: Hall = { problem: state.problem, tribunal: state.votes.some((round) => round.kind === "freeze") };
  const earned = rows.flatMap((row) =>
    board.filter(({ quest }) => satisfies(quest.rule, row, hall)).map(({ quest, period }) => ({ user_id: row.user_id, quest_id: quest.id, period })),
  );
  if (earned.length === 0) return;
  const counted = unwrap(
    `quest progress ${state.code}`,
    await supabase
      .from("quest_progress")
      .select("user_id, quest_id, period, progress")
      .in("user_id", [...new Set(earned.map((entry) => entry.user_id))])
      .in("quest_id", [...new Set(earned.map((entry) => entry.quest_id))])
      .in("period", [...new Set(earned.map((entry) => entry.period))]),
  );
  const before = new Map(counted.map((row) => [`${row.user_id}@${row.quest_id}@${row.period}`, row.progress]));
  const at = new Date().toISOString();
  unwrap(
    `advance quests ${state.code}`,
    await supabase.from("quest_progress").upsert(
      earned.map((entry) => ({ ...entry, progress: (before.get(`${entry.user_id}@${entry.quest_id}@${entry.period}`) ?? 0) + 1, updated_at: at })),
      { onConflict: "user_id,quest_id,period" },
    ),
  );
}
