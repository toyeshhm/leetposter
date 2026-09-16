import { afterAll, describe, expect, it } from "vitest";
import { GET as hallsGet } from "@/app/api/halls/route";
import { GET as listedGet, POST as listedPost } from "@/app/api/rooms/[code]/listed/route";
import { GET as spectateGet } from "@/app/api/rooms/[code]/spectate/route";
import type { Credentials } from "@/client/api";
import { GameError } from "@/game/errors";
import { DEFAULT_SETTINGS } from "@/game/types";
import type { Problem, RoomState, SpectatorView } from "@/game/types";
import { actHandler, createRoomHandler, joinHandler, newCode } from "@/server/handlers";
import { createRoom, isListed, listHalls, setListed as storeSetListed } from "@/server/store";
import type { HallRow } from "@/server/store";
import { supabase } from "@/server/supabase";

const PROBLEM: Problem = {
  title: "Two Sum",
  url: "https://example.test/two-sum",
  statement: "Find two numbers that add up to target.",
  tags: ["array", "hash-table"],
  hints: ["Try a map.", "One pass."],
  constraints: "2 <= n <= 1e4",
  rating: 1300,
};
const TOKEN = "f".repeat(32);
const codes: string[] = [];

afterAll(async () => {
  const { error } = await supabase.from("rooms").delete().in("code", codes);
  if (error !== null) throw new Error(error.message);
});

function params(code: string): { params: Promise<{ code: string }> } {
  return { params: Promise.resolve({ code }) };
}
async function json<T>(res: Response, status = 200): Promise<T> {
  const body: unknown = await res.json();
  expect(res.status, JSON.stringify(body)).toBe(status);
  return body as T;
}
async function fail(res: Response, status: number, code: string): Promise<void> {
  const body = await json<{ code: string; message: string }>(res, status);
  expect(body.code).toBe(code);
}
function setListed(creds: Credentials, listed: unknown): Promise<Response> {
  const req = new Request(`http://x/api/rooms/${creds.code}/listed`, { method: "POST", body: JSON.stringify({ token: creds.token, listed }) });
  return listedPost(req, params(creds.code));
}
function getListed(code: string): Promise<Response> {
  return listedGet(new Request(`http://x/api/rooms/${code}/listed`), params(code));
}
function spectate(code: string): Promise<Response> {
  return spectateGet(new Request(`http://x/api/rooms/${code}/spectate`), params(code));
}
async function board(): Promise<HallRow[]> {
  return (await json<{ halls: HallRow[] }>(await hallsGet())).halls;
}
async function newHall(players: number): Promise<Credentials[]> {
  const host = await createRoomHandler("Ada", null);
  codes.push(host.code);
  const crew = [host];
  for (let i = 1; i < players; i++) crew.push(await joinHandler(host.code, `P${String(i)}`, null));
  return crew;
}

describe("listing", () => {
  it("is the host's call, in the lobby or during the Work, and shows on the board", async () => {
    const [host, guest] = await newHall(2);
    if (host === undefined || guest === undefined) throw new Error("two players");
    expect(await json<{ listed: boolean }>(await getListed(host.code))).toEqual({ listed: false });
    expect((await board()).some((h) => h.code === host.code)).toBe(false);

    await fail(await setListed(guest, true), 409, "not-host");
    await fail(await setListed({ ...host, token: TOKEN }, true), 401, "unauthorized");
    await fail(await setListed(host, "yes"), 400, "invalid");
    expect(await json<{ listed: boolean }>(await setListed(host, true))).toEqual({ listed: true });
    expect(await json<{ listed: boolean }>(await getListed(host.code))).toEqual({ listed: true });

    const lobbyRow = (await board()).find((h) => h.code === host.code);
    expect(lobbyRow).toEqual({ code: host.code, host: "Ada", phase: "lobby", players: 2, rating: null, watchable: false });

    await actHandler(host.code, host.token, { type: "setProblem", problem: PROBLEM });
    await actHandler(host.code, host.token, { type: "start" });
    const readingRow = (await board()).find((h) => h.code === host.code);
    expect(readingRow).toMatchObject({ phase: "reading", rating: 1300, watchable: true });
    await fail(await setListed(host, false), 409, "wrong-phase");
  });

  it("can be undone during the Work, and a hall that stopped moving drops off after fifteen minutes", async () => {
    const [host] = await newHall(1);
    if (host === undefined) throw new Error("host");
    await actHandler(host.code, host.token, { type: "setSettings", settings: { readMs: 0 } });
    await actHandler(host.code, host.token, { type: "setProblem", problem: PROBLEM });
    const view = await actHandler(host.code, host.token, { type: "start" });
    expect(view.phase).toBe("building");
    expect(await json<{ listed: boolean }>(await setListed(host, true))).toEqual({ listed: true });
    expect((await board()).some((h) => h.code === host.code)).toBe(true);
    expect(await json<{ listed: boolean }>(await setListed(host, false))).toEqual({ listed: false });
    expect((await board()).some((h) => h.code === host.code)).toBe(false);
    await json(await setListed(host, true));

    const stale = new Date(Date.now() - 16 * 60_000).toISOString();
    const { error } = await supabase.from("rooms").update({ updated_at: stale }).eq("code", host.code);
    expect(error).toBeNull();
    expect((await board()).some((h) => h.code === host.code)).toBe(false);
  });

  it("answers 404 for an unknown hall and 400 for a bad code", async () => {
    await fail(await setListed({ code: "ZZZZZ", playerId: "", token: TOKEN }, true), 404, "not-found");
    await fail(await getListed("ZZZZZ"), 404, "not-found");
    await fail(await getListed("abc"), 400, "invalid");
  });

  it("surfaces database errors instead of swallowing them", async () => {
    const tooLong = "A".repeat(20_000);
    await expect(storeSetListed(tooLong, true)).rejects.toThrow(/setListed .*URI too long/);
    await expect(isListed(tooLong)).rejects.toThrow(/isListed .*URI too long/);
    await expect(listHalls("not a date")).rejects.toThrow(/listHalls: .*/);
    await expect(storeSetListed("ZZZZZ", true)).rejects.toThrow(GameError);
  });

  it("names a hostless row 'someone' rather than dropping the board", async () => {
    const code = newCode();
    codes.push(code);
    const state: RoomState = {
      code,
      hostId: "nobody",
      phase: "lobby",
      players: [],
      problem: null,
      settings: DEFAULT_SETTINGS,
      clock: { phaseStartedAt: Date.now(), buildElapsedMs: 0, buildRunningSince: null },
      cards: [],
      submissions: [],
      votes: [],
      outcome: null,
      createdAt: Date.now(),
    };
    expect(await createRoom(state)).toBe(true);
    const { error } = await supabase.from("rooms").update({ listed: true }).eq("code", code);
    expect(error).toBeNull();
    expect((await listHalls()).find((h) => h.code === code)).toMatchObject({ host: "someone", players: 0 });
  });
});

describe("spectate", () => {
  it("serves listed and unlisted halls alike by code, without a token, and hides the Changeling until the reveal", async () => {
    const crew = await newHall(4);
    const host = crew[0];
    if (host === undefined) throw new Error("host");
    await actHandler(host.code, host.token, { type: "setSettings", settings: { readMs: 0 } });
    await actHandler(host.code, host.token, { type: "setProblem", problem: PROBLEM });
    await actHandler(host.code, host.token, { type: "start" });

    const unlisted = await json<SpectatorView>(await spectate(host.code));
    expect(unlisted.phase).toBe("building");
    expect(unlisted.panel).toEqual({ tags: PROBLEM.tags, hints: PROBLEM.hints, constraints: PROBLEM.constraints, title: PROBLEM.title, url: PROBLEM.url });
    expect(unlisted.players.every((p) => p.isImposter === null)).toBe(true);
    const raw = JSON.stringify(unlisted);
    for (const c of crew) expect(raw).not.toContain(c.token);

    await json(await setListed(host, true));
    const listed = await json<SpectatorView>(await spectate(host.code));
    expect(listed.problem?.statement).toBe(PROBLEM.statement);

    const views = await Promise.all(crew.map((c) => actHandler(host.code, c.token, { type: "tick" })));
    const runner = crew[views.findIndex((v) => v.me.seats.includes("runner"))];
    if (runner === undefined) throw new Error("no runner");
    await actHandler(host.code, runner.token, { type: "submit", verdict: "accepted" });
    const revealed = await json<SpectatorView>(await spectate(host.code));
    expect(revealed.phase).toBe("reveal");
    expect(revealed.outcome).toEqual({ winner: "crew", reason: "accepted" });
    expect(revealed.players.filter((p) => p.isImposter === true)).toHaveLength(1);
    expect(revealed.reveal?.imposterIds).toHaveLength(1);
  });

  it("answers 404 for an unknown hall and 400 for a bad code", async () => {
    await fail(await spectate("ZZZZZ"), 404, "not-found");
    await fail(await spectate("nope"), 400, "invalid");
  });
});
