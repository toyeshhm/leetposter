import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/leaderboard/route";
import type { RoomState } from "@/game/types";
import { UNRATED, leaderboard, loadRatings, upsertRatings, type LeaderboardPage } from "@/server/ratings";
import { recordResults } from "@/server/results";
import { supabase } from "@/server/supabase";
import { T_BUILD, act, building, holder, imposter } from "../unit/fixtures";

const run = Date.now().toString(36);
// Signing in on the server client would make every later query run as that user; a throwaway client keeps the secret key in charge.
const signIn = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_KEY ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
const userIds: string[] = [];

afterAll(async () => {
  for (const id of userIds) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error !== null) throw new Error(error.message);
  }
});

interface User {
  id: string;
  username: string;
  token: string;
}

/** A real, confirmed Supabase Auth user with a profile row, signed in: what a browser would hold. */
async function newUser(tag: string): Promise<User> {
  const email = `ratings-${run}-${tag}@example.test`;
  const password = `pw-${run}-${tag}`;
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error !== null) throw new Error(created.error.message);
  const id = created.data.user.id;
  userIds.push(id);
  const username = `r${run}${tag}`.slice(0, 20);
  const profile = await supabase.from("profiles").insert({ id, username });
  if (profile.error !== null) throw new Error(profile.error.message);
  const signed = await signIn.auth.signInWithPassword({ email, password });
  if (signed.error !== null) throw new Error(signed.error.message);
  return { id, username, token: signed.data.session.access_token };
}

function get(board: string | null, token: string | null): Promise<Response> {
  const headers: Record<string, string> = token === null ? {} : { authorization: `Bearer ${token}` };
  return GET(new Request(`http://x/api/leaderboard${board === null ? "" : `?board=${board}`}`, { method: "GET", headers }));
}
async function json<T>(res: Response, status = 200): Promise<T> {
  const body: unknown = await res.json();
  expect(res.status, JSON.stringify(body)).toBe(status);
  return body as T;
}

function signedIn(state: RoomState, playerId: string, user: User): RoomState {
  return { ...state, players: state.players.map((p) => (p.id === playerId ? { ...p, userId: user.id, username: user.username } : p)) };
}

const row = (page: LeaderboardPage, username: string): LeaderboardPage["rows"][number] => {
  const found = page.rows.find((r) => r.username === username);
  if (found === undefined) throw new Error(`${username} is not on the ${page.board} board`);
  return found;
};

describe("ratings at the reveal and the leaderboard route", () => {
  it("rates every account at the table once per hall, on the right ladders, and serves the boards", async () => {
    const mask = await newUser("mask");
    const crew1 = await newUser("c1");
    const crew2 = await newUser("c2");
    // Four at the table: the Changeling and two crew hold accounts, the fourth is a guest.
    let s = building(4);
    const [p1, p2] = s.players.filter((p) => !p.isImposter);
    if (p1 === undefined || p2 === undefined) throw new Error("no crew");
    s = signedIn(signedIn(signedIn(s, imposter(s).id, mask), p1.id, crew1), p2.id, crew2);
    const code = `R${run.toUpperCase()}`.slice(0, 5);
    s = act({ ...s, code }, holder(s, "runner").id, T_BUILD + 1, { type: "submit", verdict: "accepted" });
    expect(s.phase).toBe("reveal");
    expect(s.outcome?.winner).toBe("crew");

    await recordResults(s);
    const first = await loadRatings([mask.id, crew1.id, crew2.id]);
    // Everyone started at 1200 against 1200: the crew take 16 on overall and crew, the Changeling loses 16 on overall and changeling.
    expect(first.get(crew1.id)).toEqual({ overall: { rating: 1216, games: 1, wins: 1 }, crew: { rating: 1216, games: 1, wins: 1 }, changeling: UNRATED.changeling });
    expect(first.get(crew2.id)).toEqual({ overall: { rating: 1216, games: 1, wins: 1 }, crew: { rating: 1216, games: 1, wins: 1 }, changeling: UNRATED.changeling });
    expect(first.get(mask.id)).toEqual({ overall: { rating: 1184, games: 1, wins: 0 }, crew: UNRATED.crew, changeling: { rating: 1184, games: 1, wins: 0 } });
    const stored = await supabase.from("ratings").select("user_id").in("user_id", [mask.id, crew1.id, crew2.id]);
    expect(stored.data).toHaveLength(6);

    // The same hall again changes nothing.
    await recordResults(s);
    expect(await loadRatings([mask.id, crew1.id, crew2.id])).toEqual(first);

    // The boards, signed in and as a guest.
    const overall = await json<LeaderboardPage>(await get("overall", crew1.token));
    expect(overall.board).toBe("overall");
    expect(row(overall, crew1.username)).toMatchObject({ score: 1216, games: 1, wins: 1 });
    expect(row(overall, crew2.username).rank).toBe(row(overall, crew1.username).rank);
    expect(row(overall, mask.username).rank).toBeGreaterThan(row(overall, crew1.username).rank);
    expect(overall.me).toEqual(row(overall, crew1.username));
    expect(overall.ratings).toEqual(first.get(crew1.id));
    expect(overall.rows.map((r) => r.rank)).toEqual([...overall.rows.map((r) => r.rank)].sort((a, b) => a - b));
    const guest = await json<LeaderboardPage>(await get("crew", null));
    expect(guest.me).toBeNull();
    expect(guest.ratings).toBeNull();
    expect(row(guest, crew1.username).score).toBe(1216);
    expect(guest.rows.some((r) => r.username === mask.username)).toBe(false);
    const changeling = await json<LeaderboardPage>(await get("changeling", crew1.token));
    expect(row(changeling, mask.username)).toMatchObject({ score: 1184, games: 1, wins: 0 });
    expect(changeling.rows.some((r) => r.username === crew1.username)).toBe(false);
    // Not rated on this ladder: no own line.
    expect(changeling.me).toBeNull();

    // Off the top of a short board, the own line is still found and ranked below everyone above.
    const short = await leaderboard("overall", { id: mask.id, username: mask.username }, 1);
    expect(short.rows).toHaveLength(1);
    expect(short.me).toMatchObject({ username: mask.username, score: 1184, games: 1, wins: 0 });
    expect(short.me?.rank).toBeGreaterThanOrEqual(3);

    // A second hall, the Changeling's this time: ratings move from where they stood.
    await recordResults({ ...s, code: `${code.slice(0, 4)}2`, outcome: { winner: "imposter", reason: "time" } });
    const second = await loadRatings([mask.id, crew1.id, crew2.id]);
    expect(second.get(crew1.id)).toEqual({ overall: { rating: 1199, games: 2, wins: 1 }, crew: { rating: 1199, games: 2, wins: 1 }, changeling: UNRATED.changeling });
    expect(second.get(mask.id)).toEqual({ overall: { rating: 1201, games: 2, wins: 1 }, crew: UNRATED.crew, changeling: { rating: 1201, games: 2, wins: 1 } });

    // The count boards fold game_results: a crew win that was not a solve counts for wins but not solves.
    const ejected = await supabase.from("game_results").insert({
      user_id: crew2.id,
      code: `${code.slice(0, 4)}3`,
      seats: ["bounds"],
      was_imposter: false,
      won: true,
      reason: "imposter-ejected",
      cards_played: 0,
      cards_altered: 0,
      ejected: false,
      players: 4,
    });
    if (ejected.error !== null) throw new Error(ejected.error.message);
    const solves = await json<LeaderboardPage>(await get("solves", crew2.token));
    expect(row(solves, crew1.username)).toMatchObject({ score: 1, games: 2, wins: 1 });
    expect(row(solves, crew2.username)).toMatchObject({ score: 1, games: 3, wins: 2 });
    expect(solves.me).toEqual(row(solves, crew2.username));
    expect(solves.rows.some((r) => r.username === mask.username)).toBe(false);
    const maskWins = await json<LeaderboardPage>(await get("changeling-wins", crew1.token));
    expect(row(maskWins, mask.username)).toMatchObject({ score: 1, games: 2, wins: 1 });
    expect(maskWins.rows.some((r) => r.username === crew1.username)).toBe(false);
    expect(maskWins.me).toBeNull();
    expect((await json<LeaderboardPage>(await get("changeling-wins", null))).me).toBeNull();
    const shortCount = await leaderboard("solves", { id: crew1.id, username: crew1.username }, 1);
    expect(shortCount.rows).toHaveLength(1);
    expect(shortCount.me).toMatchObject({ username: crew1.username, score: 1 });

    // A signed-in account that never sat a rated hall: unrated everywhere, no own line.
    const fresh = await newUser("new");
    const unrated = await json<LeaderboardPage>(await get("overall", fresh.token));
    expect(unrated.me).toBeNull();
    expect(unrated.ratings).toEqual(UNRATED);
  });

  it("refuses an unknown or missing board, and a bad token", async () => {
    await expect(json<{ code: string }>(await get("elo", null), 400)).resolves.toMatchObject({ code: "invalid" });
    await expect(json<{ code: string }>(await get(null, null), 400)).resolves.toMatchObject({ code: "invalid" });
    await expect(json<{ code: string }>(await get("overall", "not-a-token"), 401)).resolves.toMatchObject({ code: "unauthorized" });
  });

  it("surfaces database errors instead of hiding them", async () => {
    await expect(loadRatings(["not-a-uuid"])).rejects.toThrow(/ratings not-a-uuid: .*uuid/);
    await expect(upsertRatings([{ user_id: "00000000-0000-4000-8000-000000000000", ladder: "overall", rating: 1200, games: 1, wins: 0 }])).rejects.toThrow(/ratings upsert .*foreign key/);
  });
});
