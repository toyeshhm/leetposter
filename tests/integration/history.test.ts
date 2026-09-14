import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";
import { GET as achievementsGet } from "@/app/api/account/achievements/route";
import { GET as historyGet } from "@/app/api/account/history/route";
import type { Player, RoomState } from "@/game/types";
import type { Achievement, GameResultRow } from "@/server/achievements";
import { loadResults, recordResults } from "@/server/results";
import { supabase } from "@/server/supabase";
import { PROBLEM, T_BUILD, act, building, holder, imposter, lobby } from "../unit/fixtures";

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

/** A real, confirmed Supabase Auth user with a profile row, signed in: what a browser would hold. */
async function newUser(tag: string): Promise<{ id: string; token: string }> {
  const email = `history-${run}-${tag}@example.test`;
  const password = `pw-${run}-${tag}`;
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error !== null) throw new Error(created.error.message);
  const id = created.data.user.id;
  userIds.push(id);
  const profile = await supabase.from("profiles").insert({ id, username: `h${run}${tag}`.slice(0, 20) });
  if (profile.error !== null) throw new Error(profile.error.message);
  const signed = await signIn.auth.signInWithPassword({ email, password });
  if (signed.error !== null) throw new Error(signed.error.message);
  return { id, token: signed.data.session.access_token };
}

function get(handler: (req: Request) => Promise<Response>, token: string | null): Promise<Response> {
  const headers: Record<string, string> = token === null ? {} : { authorization: `Bearer ${token}` };
  return handler(new Request("http://x/api/account/x", { method: "GET", headers }));
}
async function json<T>(res: Response, status = 200): Promise<T> {
  const body: unknown = await res.json();
  expect(res.status, JSON.stringify(body)).toBe(status);
  return body as T;
}

/** Give one player an account. */
function signedIn(state: RoomState, playerId: string, userId: string): RoomState {
  return { ...state, players: state.players.map((p) => (p.id === playerId ? { ...p, userId, username: `u-${userId.slice(0, 6)}` } : p)) };
}

describe("recordResults and the account history routes", () => {
  it("writes one row per account player at the reveal, idempotently, and serves them with achievements", async () => {
    const crewUser = await newUser("crew");
    const changelingUser = await newUser("mask");
    // A dealt hall where the Changeling is neither the Cartographer nor the Oracle, so the crew's honest cards are theirs alone.
    let s = building();
    for (let seed = 2; imposter(s).seats.includes("tagger") || imposter(s).seats.includes("oracle"); seed++) s = building(5, seed);
    const tagger = holder(s, "tagger");
    const oracle = holder(s, "oracle");
    const runner = holder(s, "runner");
    const mask = imposter(s);
    s = signedIn(signedIn(s, tagger.id, crewUser.id), mask.id, changelingUser.id);
    const code = `H${run.toUpperCase()}`.slice(0, 5);
    s = { ...s, code };
    s = act(s, tagger.id, T_BUILD + 1, { type: "declareTags", tags: [...PROBLEM.tags] });
    s = act(s, oracle.id, T_BUILD + 2, { type: "revealHint", index: 0, text: "Nothing like the true hint." });
    s = act(s, runner.id, T_BUILD + 3, { type: "submit", verdict: "accepted" });
    expect(s.phase).toBe("reveal");

    await recordResults(s);
    await recordResults(s);
    const crewRows = await loadResults(crewUser.id);
    expect(crewRows).toHaveLength(1);
    const crewRow = crewRows[0];
    expect(crewRow).toMatchObject({
      user_id: crewUser.id,
      code,
      seats: ["tagger"],
      was_imposter: false,
      won: true,
      reason: "accepted",
      cards_played: 1,
      cards_altered: 0,
      ejected: false,
      players: 5,
    });
    const maskRows = await loadResults(changelingUser.id);
    expect(maskRows).toHaveLength(1);
    expect(maskRows[0]).toMatchObject({ code, seats: mask.seats, was_imposter: true, won: false, reason: "accepted", cards_played: 0, cards_altered: 0 });
    // Guests leave nothing behind.
    const guests = s.players.filter((p) => p.userId === null);
    expect(guests.length).toBeGreaterThan(0);
    const { count } = await supabase.from("game_results").select("id", { count: "exact", head: true }).eq("code", code);
    expect(count).toBe(2);

    // The altered hint counts against the Oracle when the Oracle has an account.
    const oracleUser = await newUser("orc");
    await recordResults(signedIn({ ...s, code: `${code.slice(0, 4)}2` }, oracle.id, oracleUser.id));
    expect((await loadResults(oracleUser.id))[0]).toMatchObject({ cards_played: 1, cards_altered: 1, seats: ["oracle"] });

    // The crew player sat through both halls; the second, recorded later, comes first.
    const history = await json<{ games: GameResultRow[] }>(await get(historyGet, crewUser.token));
    expect(history.games.map((g) => g.code)).toEqual([`${code.slice(0, 4)}2`, code]);
    expect(history.games[1]).toMatchObject({ code, won: true, seats: ["tagger"] });
    const earned = await json<{ achievements: Achievement[] }>(await get(achievementsGet, crewUser.token));
    const byId = Object.fromEntries(earned.achievements.map((a) => [a.id, a]));
    expect(byId["first-candle"]).toMatchObject({ earned: true, progress: { have: 2, need: 1 } });
    expect(byId["clean-hands"]).toMatchObject({ earned: false, progress: { have: 2, need: 3 } });
    expect(byId["silver-tongue"]?.earned).toBe(false);

    await expect(json<{ code: string }>(await get(historyGet, null), 401)).resolves.toMatchObject({ code: "unauthorized" });
    await expect(json<{ code: string }>(await get(achievementsGet, "not-a-token"), 401)).resolves.toMatchObject({ code: "unauthorized" });
  });

  it("orders newest first and stops at fifty", async () => {
    const user = await newUser("many");
    const rows = Array.from({ length: 51 }, (_, i) => ({
      user_id: user.id,
      code: `M${String(i).padStart(4, "0")}`,
      played_at: new Date(1_700_000_000_000 + i * 60_000).toISOString(),
      seats: ["bounds"],
      was_imposter: false,
      won: i % 2 === 0,
      reason: "time",
      cards_played: 0,
      cards_altered: 0,
      ejected: false,
      players: 4,
    }));
    const { error } = await supabase.from("game_results").insert(rows);
    if (error !== null) throw new Error(error.message);
    const games = await loadResults(user.id);
    expect(games).toHaveLength(50);
    expect(games[0]?.code).toBe("M0050");
    expect(games[49]?.code).toBe("M0001");
  });

  it("does nothing before the reveal or when nobody at the table has an account", async () => {
    const before = await supabase.from("game_results").select("id", { count: "exact", head: true });
    await recordResults(lobby(4));
    await recordResults({ ...building(), problem: null, outcome: { winner: "crew", reason: "time" } });
    await recordResults({ ...building(), outcome: { winner: "crew", reason: "time" } });
    const after = await supabase.from("game_results").select("id", { count: "exact", head: true });
    expect(after.count).toBe(before.count);
  });

  it("loadResults surfaces a database error instead of hiding it", async () => {
    await expect(loadResults("not-a-uuid")).rejects.toThrow(/loadResults not-a-uuid: .*uuid/);
  });

  it("logs and returns when the database refuses the rows, so the game path never throws", async () => {
    const errors = vi.spyOn(console, "error");
    const s = building();
    const stranger: Player["userId"] = "00000000-0000-4000-8000-000000000000";
    const state = signedIn({ ...s, outcome: { winner: "imposter", reason: "time" } }, imposter(s).id, stranger);
    await expect(recordResults(state)).resolves.toBeUndefined();
    const line = errors.mock.calls.map((c) => String(c[0])).find((l) => l.includes('"event":"results.failed"'));
    expect(line).toBeDefined();
    expect(line).toContain(state.code);
    errors.mockRestore();
  });
});
