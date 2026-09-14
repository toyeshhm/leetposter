import type { AccountUser } from "@/server/auth";
import { DEFAULT_RATING, LADDERS, type Ladder } from "@/server/elo";
import { supabase, unwrap } from "@/server/supabase";

/** Three Elo ladders plus two plain counts over game_results. */
export const BOARDS = [...LADDERS, "solves", "changeling-wins"] as const;
export type Board = (typeof BOARDS)[number];

export interface LadderRow {
  rating: number;
  games: number;
  wins: number;
}

/** An account that has never been rated on any ladder. */
export const UNRATED: Record<Ladder, LadderRow> = {
  overall: { rating: DEFAULT_RATING, games: 0, wins: 0 },
  crew: { rating: DEFAULT_RATING, games: 0, wins: 0 },
  changeling: { rating: DEFAULT_RATING, games: 0, wins: 0 },
};

/** One line of a board. `score` is the Elo rating on a ladder, the count on a count board. Ranks are competition ranks (1, 2, 2, 4). */
export interface BoardRow {
  rank: number;
  username: string;
  score: number;
  games: number;
  wins: number;
}

export interface LeaderboardPage {
  board: Board;
  rows: BoardRow[];
  /** The caller's own line, wherever they stand; null for a guest or someone not on this board. */
  me: BoardRow | null;
  /** The caller's three ladders (for the ledger strip); null for a guest. */
  ratings: Record<Ladder, LadderRow> | null;
}

const LIMIT = 50;

/** Every stored ladder row for these accounts. An id without an entry, or a ladder without a row, is UNRATED. */
export async function loadRatings(userIds: string[]): Promise<Map<string, Record<Ladder, LadderRow>>> {
  const rows = unwrap(`ratings ${userIds.join(",")}`, await supabase.from("ratings").select("user_id, ladder, rating, games, wins").in("user_id", userIds));
  const byUser = new Map<string, Record<Ladder, LadderRow>>();
  for (const row of rows) {
    byUser.set(row.user_id, { ...(byUser.get(row.user_id) ?? UNRATED), [row.ladder]: { rating: row.rating, games: row.games, wins: row.wins } });
  }
  return byUser;
}

export async function upsertRatings(rows: { user_id: string; ladder: Ladder; rating: number; games: number; wins: number }[]): Promise<void> {
  const at = new Date().toISOString();
  unwrap(
    `ratings upsert ${rows.map((r) => r.user_id).join(",")}`,
    await supabase.from("ratings").upsert(
      rows.map((r) => ({ ...r, updated_at: at })),
      { onConflict: "user_id,ladder" },
    ),
  );
}

interface Standing {
  userId: string;
  username: string;
  score: number;
  games: number;
  wins: number;
}

function rowOf(s: Standing, all: Standing[]): BoardRow {
  return { rank: 1 + all.filter((o) => o.score > s.score).length, username: s.username, score: s.score, games: s.games, wins: s.wins };
}

async function rated(ladder: Ladder, me: AccountUser | null, limit: number): Promise<{ rows: BoardRow[]; me: BoardRow | null }> {
  const top = unwrap(
    `leaderboard ${ladder}`,
    await supabase
      .from("ratings")
      .select("user_id, rating, games, wins, profiles!ratings_user_id_fkey(username)")
      .eq("ladder", ladder)
      .order("rating", { ascending: false })
      .order("wins", { ascending: false })
      .order("user_id")
      .limit(limit),
  );
  const standings = top.map((r) => ({ userId: r.user_id, username: r.profiles.username, score: r.rating, games: r.games, wins: r.wins }));
  const rows = standings.map((s) => rowOf(s, standings));
  if (me === null) return { rows, me: null };
  const mine = standings.find((s) => s.userId === me.id);
  if (mine !== undefined) return { rows, me: rowOf(mine, standings) };
  const own = unwrap(`rating ${ladder} ${me.id}`, await supabase.from("ratings").select("rating, games, wins").eq("ladder", ladder).eq("user_id", me.id).maybeSingle());
  if (own === null) return { rows, me: null };
  // ponytail: rank = one plus everyone above, fetched as ids; a count query when the ladder is thousands deep.
  const above = unwrap(`rank ${ladder} ${me.id}`, await supabase.from("ratings").select("user_id").eq("ladder", ladder).gt("rating", own.rating));
  return { rows, me: { rank: above.length + 1, username: me.username, score: own.rating, games: own.games, wins: own.wins } };
}

/**
 * The count boards are folded from game_results in memory: solves are crew wins on an accepted
 * submission, changeling wins are wins in the mask. Only players with a count above zero appear.
 * ponytail: every row of the role is read; a SQL view once game_results is more than a few thousand rows.
 */
async function counted(board: "solves" | "changeling-wins", me: AccountUser | null, limit: number): Promise<{ rows: BoardRow[]; me: BoardRow | null }> {
  const mask = board === "changeling-wins";
  const played = unwrap(
    `leaderboard ${board}`,
    await supabase.from("game_results").select("user_id, won, reason, profiles!game_results_user_id_fkey(username)").eq("was_imposter", mask),
  );
  const byUser = new Map<string, Standing>();
  for (const row of played) {
    const s = byUser.get(row.user_id) ?? { userId: row.user_id, username: row.profiles.username, score: 0, games: 0, wins: 0 };
    s.games += 1;
    if (row.won) {
      s.wins += 1;
      if (mask || row.reason === "accepted") s.score += 1;
    }
    byUser.set(row.user_id, s);
  }
  const all = [...byUser.values()].filter((s) => s.score > 0).sort((a, b) => b.score - a.score || b.wins - a.wins || a.username.localeCompare(b.username));
  const mine = me === null ? undefined : all.find((s) => s.userId === me.id);
  return { rows: all.slice(0, limit).map((s) => rowOf(s, all)), me: mine === undefined ? null : rowOf(mine, all) };
}

/** One board, the caller's own line, and the caller's ladders. `limit` is injectable so the "outside the top" path is testable. */
export async function leaderboard(board: Board, me: AccountUser | null, limit = LIMIT): Promise<LeaderboardPage> {
  const standings = board === "solves" || board === "changeling-wins" ? await counted(board, me, limit) : await rated(board, me, limit);
  const ratings = me === null ? null : ((await loadRatings([me.id])).get(me.id) ?? UNRATED);
  return { board, ...standings, ratings };
}
