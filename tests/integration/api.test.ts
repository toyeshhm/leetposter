import { afterAll, describe, expect, it, vi } from "vitest";
import { POST as actPost } from "@/app/api/rooms/[code]/act/route";
import { POST as joinPost } from "@/app/api/rooms/[code]/join/route";
import { GET as viewGet } from "@/app/api/rooms/[code]/route";
import { POST as createPost } from "@/app/api/rooms/route";
import type { Credentials } from "@/client/api";
import { GameError } from "@/game/errors";
import { DEFAULT_SETTINGS } from "@/game/types";
import type { Action, PlayerView, Problem, RoomState, Seat } from "@/game/types";
import { createRoomHandler, newCode, respond } from "@/server/handlers";
import { createRoom, loadRoom, withRoom } from "@/server/store";
import { supabase } from "@/server/supabase";

const PROBLEM: Problem = {
  title: "Two Sum",
  url: "https://example.test/two-sum",
  statement: "Find two numbers that add up to target.",
  tags: ["array", "hash-table"],
  hints: ["Try a map.", "One pass."],
  constraints: "2 <= n <= 1e4",
};
const TOKEN = "f".repeat(32);
const codes: string[] = [];

afterAll(async () => {
  const { error } = await supabase.from("rooms").delete().in("code", codes);
  if (error !== null) throw new Error(error.message);
});

function post(url: string, body: unknown): Request {
  return new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
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
  expect(body.message).toBeTypeOf("string");
}

function create(name = "Host"): Promise<Response> {
  return createPost(post("http://x/api/rooms", { name }));
}
function join(code: string, name: string): Promise<Response> {
  return joinPost(post(`http://x/api/rooms/${code}/join`, { name }), params(code));
}
function view(creds: Credentials): Promise<Response> {
  return viewGet(new Request(`http://x/api/rooms/${creds.code}`, { headers: { authorization: `Bearer ${creds.token}` } }), params(creds.code));
}
function act(creds: Credentials, action: unknown): Promise<Response> {
  return actPost(post(`http://x/api/rooms/${creds.code}/act`, { token: creds.token, action }), params(creds.code));
}
async function newRoom(players = 4): Promise<Credentials[]> {
  const host = await json<Credentials>(await create());
  codes.push(host.code);
  const crew = [host];
  for (let i = 1; i < players; i++) crew.push(await json<Credentials>(await join(host.code, `P${String(i)}`)));
  return crew;
}
/** Host sets a zero read timer so `start` itself answers from the building (apply ticks after the action). */
async function startGame(crew: Credentials[], settings: Action & { type: "setSettings" } = { type: "setSettings", settings: { readMs: 0 } }): Promise<Map<Seat, Credentials>> {
  const host = crew[0];
  if (host === undefined) throw new Error("no host");
  await json(await act(host, settings));
  await json(await act(host, { type: "setProblem", problem: PROBLEM }));
  const started = await json<PlayerView>(await act(host, { type: "start" }));
  expect(started.phase).toBe("building");
  const seats = new Map<Seat, Credentials>();
  for (const c of crew) {
    const v = await json<PlayerView>(await view(c));
    expect(v.phase).toBe("building");
    for (const s of v.me.seats) seats.set(s, c);
  }
  expect([...seats.keys()].sort()).toEqual(["bounds", "oracle", "runner", "tagger"]);
  return seats;
}
/** Discussions are fixed at 90 s / 60 s; move the persisted round back so its ballot is open now. */
function openBallot(s: RoomState): RoomState {
  return { ...s, votes: s.votes.map((r) => ({ ...r, startedAt: r.startedAt - r.discussionMs })) };
}
function seat(seats: Map<Seat, Credentials>, s: Seat): Credentials {
  const c = seats.get(s);
  if (c === undefined) throw new Error(`nobody holds ${s}`);
  return c;
}

describe("create", () => {
  it("answers with credentials and a lobby view for the host", async () => {
    const creds = await json<Credentials>(await create("  Ada "));
    codes.push(creds.code);
    expect(creds.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/);
    expect(creds.token).toMatch(/^[0-9a-f]{32}$/);
    const v = await json<PlayerView>(await view(creds));
    expect(v).toMatchObject({ code: creds.code, phase: "lobby", problem: null, problemReady: false, settings: DEFAULT_SETTINGS });
    expect(v.me).toMatchObject({ id: creds.playerId, isHost: true, seats: [] });
    expect(v.players.map((p) => p.name)).toEqual(["Ada"]);
    expect(JSON.stringify(v)).not.toContain(creds.token);
  });
  it("retries on a code collision and gives up after five", async () => {
    const taken = await json<Credentials>(await create());
    codes.push(taken.code);
    let calls = 0;
    const fresh = await createRoomHandler("Bob", null, () => (calls++ === 0 ? taken.code : newCode()));
    codes.push(fresh.code);
    expect(calls).toBe(2);
    expect(fresh.code).not.toBe(taken.code);
    await expect(createRoomHandler("Bob", null, () => taken.code)).rejects.toThrow(/no free room code/);
  });
});

describe("invalid input", () => {
  it("rejects bad bodies, codes and tokens with 400", async () => {
    await fail(await createPost(post("http://x/api/rooms", {})), 400, "invalid");
    await fail(await createPost(post("http://x/api/rooms", { name: "x".repeat(25) })), 400, "invalid");
    await fail(await createPost(new Request("http://x/api/rooms", { method: "POST", body: "{not json" })), 400, "invalid");
    await fail(await join("ABC", "Bob"), 400, "invalid");
    await fail(await viewGet(new Request("http://x/api/rooms/ABCDE"), params("ABCDE")), 400, "invalid");
    await fail(await viewGet(new Request("http://x/api/rooms/ABCDE", { headers: { authorization: "Basic abc" } }), params("ABCDE")), 400, "invalid");
    await fail(await viewGet(new Request(`http://x/api/rooms/ABCDE?token=${TOKEN}`), params("ABCDE")), 400, "invalid");
    await fail(await act({ code: "ABCDE", playerId: "", token: TOKEN }, { type: "nope" }), 400, "invalid");
    await fail(await act({ code: "ABCDE", playerId: "", token: "short" }, { type: "tick" }), 400, "invalid");
  });
  it("answers 404 for unknown rooms", async () => {
    const ghost = { code: "ZZZZZ", playerId: "", token: TOKEN };
    await fail(await view(ghost), 404, "not-found");
    await fail(await join(ghost.code, "Bob"), 404, "not-found");
    await fail(await act(ghost, { type: "tick" }), 404, "not-found");
  });
  it("answers 401 for a wrong token", async () => {
    const [host] = await newRoom(1);
    if (host === undefined) throw new Error("no host");
    await fail(await view({ ...host, token: TOKEN }), 401, "unauthorized");
    await fail(await act({ ...host, token: TOKEN }, { type: "tick" }), 401, "unauthorized");
  });
  it("answers 500 without leaking when a handler throws something else", async () => {
    const res = await respond(() => Promise.reject(new Error("db on fire")));
    const body = await json<{ code: string; message: string }>(res, 500);
    expect(body).toEqual({ code: "internal", message: "internal error" });
  });
});

describe("join", () => {
  it("appends players in the lobby, refuses a taken name, a 9th and anyone after start", async () => {
    const crew = await newRoom(7);
    const host = crew[0];
    if (host === undefined) throw new Error("no host");
    await fail(await join(host.code, "p1"), 400, "invalid");
    crew.push(await json<Credentials>(await join(host.code, "P8")));
    await fail(await join(host.code, "P9"), 409, "room-full");
    const v = await json<PlayerView>(await view(host));
    expect(v.players).toHaveLength(8);
    expect(v.players.map((p) => p.isImposter)).toEqual([false, null, null, null, null, null, null, null]);
    await startGame(crew);
    await fail(await join(host.code, "Late"), 409, "wrong-phase");
  });
});

describe("a full game", () => {
  it("runs from lobby through a freeze, a rejected submission and the final vote to the reveal", async () => {
    const crew = await newRoom(4);
    const [host, p1] = crew;
    if (host === undefined || p1 === undefined) throw new Error("no players");
    await fail(await act(p1, { type: "setProblem", problem: PROBLEM }), 409, "not-host");
    await fail(await act(host, { type: "setSettings", settings: { readMs: -1 } }), 400, "invalid");
    await fail(await act(host, { type: "start" }), 400, "invalid");
    const seats = await startGame(crew, { type: "setSettings", settings: { readMs: 0, maxSubmissions: 1 } });
    const tagger = seat(seats, "tagger");
    const oracle = seat(seats, "oracle");
    const bounds = seat(seats, "bounds");
    const runner = seat(seats, "runner");

    await fail(await act(oracle, { type: "declareTags", tags: ["a", "b"] }), 409, "not-your-seat");
    await fail(await act(tagger, { type: "declareTags", tags: ["a"] }), 400, "invalid");
    let v = await json<PlayerView>(await act(tagger, { type: "declareTags", tags: ["dp", "graph"] }));
    expect(v.cards.map((c) => c.card.kind)).toEqual(["tags"]);
    expect(v.panel.tags).toEqual(PROBLEM.tags);
    await fail(await act(oracle, { type: "revealHint", index: 0 }), 400, "invalid");
    v = await json<PlayerView>(await act(oracle, { type: "revealHint", index: 0, text: "Sort it first." }));
    expect(v.cards.at(-1)?.card).toEqual({ kind: "hint", index: 0, text: "Sort it first." });
    v = await json<PlayerView>(await act(bounds, { type: "declareBound", text: "n <= 1e4" }));
    expect(v.cards).toHaveLength(3);
    await fail(await act(host, { type: "callFreeze" }), 409, "freeze-unavailable");
    await fail(await act(host, { type: "vote", targetId: null }), 409, "wrong-phase");

    // The freeze window opens three build-minutes in; move the persisted clock instead of waiting.
    await withRoom(host.code, (s) => ({ ...s, clock: { ...s.clock, buildElapsedMs: s.settings.freezeOpensAfterMs } }));
    v = await json<PlayerView>(await view(host));
    expect(v.canCallFreeze).toBe(true);
    v = await json<PlayerView>(await act(host, { type: "callFreeze" }));
    expect(v.phase).toBe("freeze");
    expect(v.activeVote?.kind).toBe("freeze");
    expect(v.clock.buildPaused).toBe(true);
    await fail(await act(p1, { type: "vote", targetId: null }), 409, "wrong-phase");
    await withRoom(host.code, openBallot);
    await fail(await act(p1, { type: "vote", targetId: "nobody" }), 400, "invalid");
    for (const c of crew) v = await json<PlayerView>(await act(c, { type: "vote", targetId: null }));
    expect(v.phase).toBe("building");
    expect(v.votes[0]?.result).toEqual({ ejectedId: null, resolvedAt: expect.any(Number) as number });
    await fail(await act(host, { type: "callFreeze" }), 409, "freeze-unavailable");

    await fail(await act(tagger, { type: "submit", verdict: "accepted" }), 409, "not-your-seat");
    v = await json<PlayerView>(await act(runner, { type: "submit", verdict: "rejected", category: "wrong-answer", failingCase: "[]" }));
    expect(v.phase).toBe("finalVote");
    expect(v.submissionsLeft).toBe(0);
    expect(v.cards.at(-1)?.card).toEqual({ kind: "report", category: "wrong-answer", failingCase: "[]" });
    await fail(await act(runner, { type: "submit", verdict: "accepted" }), 409, "wrong-phase");
    await fail(await act(host, { type: "vote", targetId: host.playerId }), 409, "wrong-phase");
    await withRoom(host.code, openBallot);
    await fail(await act(host, { type: "vote", targetId: null }), 400, "invalid");
    for (const c of crew) v = await json<PlayerView>(await act(c, { type: "vote", targetId: host.playerId }));
    expect(v.phase).toBe("reveal");
    expect(v.reveal?.problem).toEqual(PROBLEM);
    expect(v.reveal?.imposterIds).toHaveLength(1);
    expect(v.outcome).not.toBeNull();
    const ejected = v.players.find((p) => p.id === host.playerId);
    expect(ejected?.ejected).toBe(true);
    await fail(await act(p1, { type: "declareBound", text: "late" }), 409, "wrong-phase");
    v = await json<PlayerView>(await view(host));
    expect(v.players.every((p) => p.isImposter !== null)).toBe(true);
  });

  it("ends immediately on an accepted submission", async () => {
    const crew = await newRoom(5);
    const seats = await startGame(crew);
    const v = await json<PlayerView>(await act(seat(seats, "runner"), { type: "submit", verdict: "accepted" }));
    expect(v.phase).toBe("reveal");
    expect(v.outcome).toEqual({ winner: "crew", reason: "accepted" });
  });
});

describe("store", () => {
  it("lands both of two concurrent writes via the version retry", async () => {
    const [host] = await newRoom(1);
    if (host === undefined) throw new Error("no host");
    const bound = (id: string) => (s: RoomState) => ({
      ...s,
      cards: [...s.cards, { id, playerId: host.playerId, seat: "bounds" as const, at: 1, card: { kind: "bound" as const, text: id } }],
    });
    await Promise.all([withRoom(host.code, bound("a")), withRoom(host.code, bound("b"))]);
    const row = await loadRoom(host.code);
    expect(row?.state.cards.map((c) => c.id).sort()).toEqual(["a", "b"]);
    expect(row?.version).toBe(2);
  });
  it("retries a conflicting write, then gives up after eight attempts", async () => {
    const [host] = await newRoom(1);
    if (host === undefined) throw new Error("no host");
    const bump = (): Promise<RoomState> => withRoom(host.code, (s) => ({ ...s, createdAt: s.createdAt + 1 }));
    let calls = 0;
    const state = await withRoom(host.code, async (s) => {
      if (calls++ === 0) await bump();
      return { ...s, hostId: s.hostId };
    });
    expect(calls).toBe(2);
    expect(state.createdAt).toBe((await loadRoom(host.code))?.state.createdAt);
    calls = 0;
    await expect(
      withRoom(host.code, async (s) => {
        calls++;
        await bump();
        return { ...s };
      }),
    ).rejects.toThrow(/version conflict after 8 attempts/);
    expect(calls).toBe(8);
  });
  it("skips the write when the reducer returns the same state", async () => {
    const [host] = await newRoom(1);
    if (host === undefined) throw new Error("no host");
    const before = await loadRoom(host.code);
    expect(await withRoom(host.code, (s) => s)).toEqual(before?.state);
    expect((await loadRoom(host.code))?.version).toBe(before?.version);
  });
  it("refuses a corrupt row instead of feeding it to the reducer", async () => {
    const code = newCode();
    codes.push(code);
    const { error } = await supabase.from("rooms").insert({ code, state: { code } as RoomState, version: 0 });
    expect(error).toBeNull();
    await expect(loadRoom(code)).rejects.toThrow(GameError);
  });
  it("surfaces real database errors from every query", async () => {
    const [host] = await newRoom(1);
    if (host === undefined) throw new Error("no host");
    const row = await loadRoom(host.code);
    if (row === null) throw new Error("no row");
    // Postgres jsonb cannot hold U+0000, and the gateway refuses a 20k-char filter: real errors, no mocks.
    const poisoned: RoomState = { ...row.state, code: newCode(), hostId: "\u0000" };
    await expect(createRoom(poisoned)).rejects.toThrow(/createRoom .*Unicode/);
    await expect(withRoom(host.code, (s) => ({ ...s, hostId: "\u0000" }))).rejects.toThrow(/saveRoom .*Unicode/);
    await expect(loadRoom("A".repeat(20_000))).rejects.toThrow(/loadRoom .*URI too long/);
  });
});

describe("supabase client guard", () => {
  it("refuses to start without credentials or inside a browser", async () => {
    const { SUPABASE_URL: url = "", SUPABASE_KEY: key = "" } = process.env;
    try {
      delete process.env.SUPABASE_URL;
      vi.resetModules();
      await expect(import("@/server/supabase")).rejects.toThrow(/SUPABASE_URL and SUPABASE_KEY/);
      process.env.SUPABASE_URL = url;
      process.env.SUPABASE_KEY = "";
      vi.resetModules();
      await expect(import("@/server/supabase")).rejects.toThrow(/SUPABASE_URL and SUPABASE_KEY/);
      process.env.SUPABASE_KEY = key;
      Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
      vi.resetModules();
      await expect(import("@/server/supabase")).rejects.toThrow(/browser/);
    } finally {
      delete (globalThis as { window?: unknown }).window;
      process.env.SUPABASE_URL = url;
      process.env.SUPABASE_KEY = key;
      vi.resetModules();
    }
  });
});
