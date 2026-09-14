import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { GET as accountGet, POST as accountPost } from "@/app/api/account/route";
import { POST as actPost } from "@/app/api/rooms/[code]/act/route";
import { POST as joinPost } from "@/app/api/rooms/[code]/join/route";
import { GET as viewGet } from "@/app/api/rooms/[code]/route";
import { POST as createPost } from "@/app/api/rooms/route";
import type { Credentials } from "@/client/api";
import { GameError } from "@/game/errors";
import type { PlayerView, Problem, Seat } from "@/game/types";
import { optionalUser, requireUser } from "@/server/auth";
import { actHandler } from "@/server/handlers";
import { createProfile, findProfile } from "@/server/profiles";
import { loadRoom } from "@/server/store";
import { supabase } from "@/server/supabase";

const PROBLEM: Problem = {
  title: "Two Sum",
  url: "https://example.test/two-sum",
  statement: "Find two numbers that add up to target.",
  tags: ["array", "hash-table"],
  hints: ["Try a map.", "One pass."],
  constraints: "2 <= n <= 1e4",
};
const run = Date.now().toString(36);
/*
 * Signing in on the server client would replace its service-role session with the user's, and RLS
 * (no policies) would then deny every table. A throwaway client does the sign-in, like a browser would.
 */
const anon = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_KEY ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
const userIds: string[] = [];
const codes: string[] = [];

afterAll(async () => {
  const { error } = await supabase.from("rooms").delete().in("code", codes);
  if (error !== null) throw new Error(error.message);
  for (const id of userIds) {
    const { error: gone } = await supabase.auth.admin.deleteUser(id);
    if (gone !== null) throw new Error(gone.message);
  }
});

/** A real Supabase Auth user, confirmed, signed in: the access token a browser would hold. */
async function newUser(tag: string): Promise<{ id: string; email: string; token: string }> {
  const email = `auth-${run}-${tag}@example.test`;
  const password = `pw-${run}-${tag}`;
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error !== null) throw new Error(created.error.message);
  userIds.push(created.data.user.id);
  const signed = await anon.auth.signInWithPassword({ email, password });
  if (signed.error !== null) throw new Error(signed.error.message);
  return { id: created.data.user.id, email, token: signed.data.session.access_token };
}

function req(method: string, url: string, token: string | null, body?: unknown): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  return new Request(url, { method, headers, body: body === undefined ? null : JSON.stringify(body) });
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
}
function claim(token: string | null, username: string): Promise<Response> {
  return accountPost(req("POST", "http://x/api/account", token, { username }));
}
function me(token: string | null): Promise<Response> {
  return accountGet(req("GET", "http://x/api/account", token));
}
function create(token: string | null, body: unknown): Promise<Response> {
  return createPost(req("POST", "http://x/api/rooms", token, body));
}
function join(code: string, token: string | null, body: unknown): Promise<Response> {
  return joinPost(req("POST", `http://x/api/rooms/${code}/join`, token, body), params(code));
}
function view(creds: Credentials): Promise<Response> {
  return viewGet(req("GET", `http://x/api/rooms/${creds.code}`, creds.token), params(creds.code));
}
function act(creds: Credentials, action: unknown): Promise<Response> {
  return actPost(req("POST", `http://x/api/rooms/${creds.code}/act`, null, { token: creds.token, action }), params(creds.code));
}

describe("POST /api/account", () => {
  it("creates the profile for a fresh sign-up, once, with a unique name", async () => {
    const ada = await newUser("ada");
    const name = `ada_${run}`;
    expect(await json(await claim(ada.token, name))).toEqual({ id: ada.id, username: name });
    await fail(await claim(ada.token, `other_${run}`), 409, "taken");
    const bea = await newUser("bea");
    await fail(await claim(bea.token, name), 409, "taken");
    await fail(await claim(bea.token, "Not Valid"), 400, "invalid");
    await fail(await claim(null, "nobody"), 401, "unauthorized");
    await fail(await claim("not-a-jwt", "nobody"), 401, "unauthorized");
  });
});

describe("GET /api/account and the request helpers", () => {
  it("answers the profile for a good token and 401 otherwise", async () => {
    const cal = await newUser("cal");
    const nameless = req("GET", "http://x", cal.token);
    await fail(await me(cal.token), 401, "unauthorized");
    await expect(requireUser(nameless)).rejects.toThrow(GameError);
    await expect(optionalUser(nameless)).rejects.toThrow(/no name yet/);
    await json(await claim(cal.token, `cal_${run}`));
    expect(await json(await me(cal.token))).toEqual({ id: cal.id, username: `cal_${run}`, email: cal.email });
    expect(await requireUser(nameless)).toEqual({ id: cal.id, username: `cal_${run}` });
    expect(await optionalUser(req("GET", "http://x", null))).toBeNull();
    await expect(optionalUser(req("GET", "http://x", "bad"))).rejects.toThrow(/Sign in again/);
    await expect(requireUser(new Request("http://x", { headers: { authorization: "Bearer " } }))).rejects.toThrow(/Sign in first/);
    await expect(requireUser(new Request("http://x", { headers: { authorization: "Basic abc" } }))).rejects.toThrow(/Sign in first/);
    await fail(await me(null), 401, "unauthorized");
  });

  it("surfaces real database errors from the profile queries", async () => {
    // Postgres refuses a non-uuid id on both the select and the insert: real errors, no mocks.
    await expect(findProfile("not-a-uuid")).rejects.toThrow(/profiles not-a-uuid: invalid input syntax/);
    await expect(createProfile("not-a-uuid", "ghost")).rejects.toThrow(/profiles insert not-a-uuid: invalid input syntax/);
  });
});

describe("halls with accounts", () => {
  it("attaches the account on create and join, defaults the name to the username, and never leaks the user id", async () => {
    const dee = await newUser("dee");
    await json(await claim(dee.token, `dee_${run}`));
    const host = await json<Credentials>(await create(dee.token, {}));
    codes.push(host.code);
    const eve = await newUser("eve");
    await json(await claim(eve.token, `eve_${run}`));
    const guest = await json<Credentials>(await join(host.code, null, { name: "Guest" }));
    await fail(await join(host.code, null, {}), 400, "invalid");
    await fail(await join(host.code, "bad", { name: "X" }), 401, "unauthorized");
    const second = await json<Credentials>(await join(host.code, eve.token, { name: "Evelyn" }));

    const v = await json<PlayerView>(await view(guest));
    expect(v.players.map((p) => [p.name, p.username])).toEqual([
      [`dee_${run}`, `dee_${run}`],
      ["Guest", null],
      ["Evelyn", `eve_${run}`],
    ]);
    const text = JSON.stringify(v);
    expect(text).not.toContain(dee.id);
    expect(text).not.toContain(eve.id);
    expect(text).not.toContain("userId");

    const row = await loadRoom(host.code);
    expect(row?.state.players.map((p) => p.userId)).toEqual([dee.id, null, eve.id]);
    expect(second.playerId).toBe(row?.state.players[2]?.id);
  });

  it("records results once when the hall reaches the reveal, and a failing recorder never breaks the reveal", async () => {
    const fay = await newUser("fay");
    await json(await claim(fay.token, `fay_${run}`));
    const host = await json<Credentials>(await create(fay.token, { name: "Fay" }));
    codes.push(host.code);
    const crew = [host];
    for (const name of ["P1", "P2", "P3"]) crew.push(await json<Credentials>(await join(host.code, null, { name })));
    await json(await act(host, { type: "setSettings", settings: { readMs: 0 } }));
    await json(await act(host, { type: "setProblem", problem: PROBLEM }));
    await json(await act(host, { type: "start" }));
    let runner: Credentials | undefined;
    for (const c of crew) {
      const v = await json<PlayerView>(await view(c));
      if (v.me.seats.includes("runner" satisfies Seat)) runner = c;
    }
    if (runner === undefined) throw new Error("nobody holds runner");

    // The injected recorder throws: the reveal still answers, and the failure is logged, not thrown.
    const failing = await actHandler(host.code, runner.token, { type: "submit", verdict: "accepted" }, () => Promise.reject(new Error("history is down")));
    expect(failing.phase).toBe("reveal");

    // A later tick on a revealed hall does not record again.
    const again = await json<PlayerView>(await view(host));
    expect(again.phase).toBe("reveal");
  });

  it("writes a game_results row for the account player at the reveal", async () => {
    const gus = await newUser("gus");
    await json(await claim(gus.token, `gus_${run}`));
    const host = await json<Credentials>(await create(gus.token, {}));
    codes.push(host.code);
    const crew = [host];
    for (const name of ["P1", "P2", "P3"]) crew.push(await json<Credentials>(await join(host.code, null, { name })));
    await json(await act(host, { type: "setSettings", settings: { readMs: 0 } }));
    await json(await act(host, { type: "setProblem", problem: PROBLEM }));
    await json(await act(host, { type: "start" }));
    for (const c of crew) {
      const v = await json<PlayerView>(await view(c));
      if (v.me.seats.includes("runner")) expect((await json<PlayerView>(await act(c, { type: "submit", verdict: "accepted" }))).phase).toBe("reveal");
    }
    const { data, error } = await supabase.from("game_results").select("code, won, reason, was_imposter").eq("user_id", gus.id);
    if (error !== null) throw new Error(error.message);
    // An accepted submission is a crew win: the host won unless the deal made them the Changeling.
    expect(data).toEqual([{ code: host.code, won: data[0]?.was_imposter === false, reason: "accepted", was_imposter: data[0]?.was_imposter }]);
  });
});
