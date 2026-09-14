import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as acceptPost } from "@/app/api/friends/[username]/accept/route";
import { DELETE as removeDelete } from "@/app/api/friends/[username]/route";
import { GET as friendsGet, POST as friendsPost } from "@/app/api/friends/route";
import { GameError } from "@/game/errors";
import { acceptFriend, listFriends, recentHallsWithFriends, removeFriend, requestFriend } from "@/server/friends";
import type { FriendsPage } from "@/server/friends";
import { supabase } from "@/server/supabase";

interface User {
  id: string;
  username: string;
  token: string;
}

const suffix = crypto.randomUUID().slice(0, 8);
const users: Record<"ada" | "brin" | "cass", User> = {
  ada: { id: "", username: `ada_${suffix}`, token: "" },
  brin: { id: "", username: `brin_${suffix}`, token: "" },
  cass: { id: "", username: `cass_${suffix}`, token: "" },
};
const PASSWORD = "correct-horse-battery";

function env(name: string): string {
  const value = process.env[name];
  if (value === undefined) throw new Error(`${name} is not set`);
  return value;
}

beforeAll(async () => {
  // A second client signs in so the server client keeps its service role for every query.
  const signer = createClient(env("SUPABASE_URL"), env("SUPABASE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  for (const user of Object.values(users)) {
    const email = `${user.username}@friends.test`;
    const created = await supabase.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (created.error !== null) throw new Error(created.error.message);
    user.id = created.data.user.id;
    const profile = await supabase.from("profiles").insert({ id: user.id, username: user.username });
    if (profile.error !== null) throw new Error(profile.error.message);
    const signedIn = await signer.auth.signInWithPassword({ email, password: PASSWORD });
    if (signedIn.error !== null) throw new Error(signedIn.error.message);
    user.token = signedIn.data.session.access_token;
  }
});

afterAll(async () => {
  // Deleting the auth user cascades to the profile, its friendships and its game_results.
  for (const user of Object.values(users)) {
    if (user.id === "") continue;
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error !== null) throw new Error(error.message);
  }
});

async function gameError(work: Promise<unknown>, code: string): Promise<void> {
  const error: unknown = await work.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(GameError);
  expect((error as GameError).code).toBe(code);
}

describe("friends", () => {
  const { ada, brin, cass } = users;

  it("starts empty and refuses self and strangers", async () => {
    expect(await listFriends(ada.id)).toEqual({ friends: [], incoming: [], outgoing: [] });
    await gameError(requestFriend(ada.id, ada.username), "invalid");
    await gameError(requestFriend(ada.id, `nobody_${suffix}`), "not-found");
    await gameError(acceptFriend(ada.id, `nobody_${suffix}`), "not-found");
    await gameError(removeFriend(ada.id, `nobody_${suffix}`), "not-found");
  });

  it("requests, repeats harmlessly, and accepts", async () => {
    await requestFriend(ada.id, brin.username);
    await requestFriend(ada.id, brin.username);
    expect((await listFriends(ada.id)).outgoing.map((r) => r.username)).toEqual([brin.username]);
    expect((await listFriends(brin.id)).incoming.map((r) => r.username)).toEqual([ada.username]);

    await gameError(acceptFriend(brin.id, cass.username), "not-found");
    await acceptFriend(brin.id, ada.username);
    await acceptFriend(brin.id, ada.username);
    // Asking someone who already accepted you changes nothing.
    await requestFriend(brin.id, ada.username);
    const mine = await listFriends(ada.id);
    expect(mine.friends.map((f) => f.username)).toEqual([brin.username]);
    expect(mine.outgoing).toEqual([]);
    expect((await listFriends(brin.id)).friends.map((f) => f.username)).toEqual([ada.username]);
  });

  it("auto-accepts a mutual request", async () => {
    await requestFriend(cass.id, ada.username);
    await requestFriend(ada.id, cass.username);
    const mine = await listFriends(ada.id);
    expect(mine.friends.map((f) => f.username).sort()).toEqual([brin.username, cass.username].sort());
    expect(mine.incoming).toEqual([]);
    expect((await listFriends(cass.id)).friends.map((f) => f.username)).toEqual([ada.username]);
  });

  it("lists the friends' recent halls, newest first, and nothing for the friendless", async () => {
    expect(await recentHallsWithFriends(brin.id)).toEqual([]);
    const inserted = await supabase.from("game_results").insert([
      { user_id: brin.id, code: "KANEP", seats: ["oracle"], was_imposter: false, won: true, reason: "accepted", cards_played: 2, cards_altered: 0, ejected: false, players: 4 },
      { user_id: cass.id, code: "QRSTV", seats: ["runner"], was_imposter: true, won: false, reason: "imposter-ejected", cards_played: 0, cards_altered: 0, ejected: true, players: 5 },
    ]);
    if (inserted.error !== null) throw new Error(inserted.error.message);
    const halls = await recentHallsWithFriends(ada.id);
    expect(halls.map((h) => h.code).sort()).toEqual(["KANEP", "QRSTV"]);
    const kanep = halls.find((h) => h.code === "KANEP");
    expect(kanep).toMatchObject({ username: brin.username, seats: ["oracle"], wasImposter: false, won: true, reason: "accepted" });
    expect(Date.parse(kanep?.playedAt ?? "")).toBeGreaterThan(0);
    // brin's only friend is ada, who has no recorded halls.
    expect(await recentHallsWithFriends(brin.id)).toEqual([]);
  });

  it("removes in either direction and declines a request", async () => {
    await removeFriend(ada.id, cass.username);
    expect((await listFriends(ada.id)).friends.map((f) => f.username)).toEqual([brin.username]);
    expect((await listFriends(cass.id)).friends).toEqual([]);

    await requestFriend(cass.id, brin.username);
    expect((await listFriends(brin.id)).incoming.map((r) => r.username)).toEqual([cass.username]);
    await removeFriend(brin.id, cass.username);
    expect((await listFriends(brin.id)).incoming).toEqual([]);
    expect((await listFriends(cass.id)).outgoing).toEqual([]);
    // Nothing left to remove is not an error.
    await removeFriend(brin.id, cass.username);
  });

  it("surfaces database errors", async () => {
    await expect(listFriends("not-a-uuid")).rejects.toThrow(/^friendships not-a-uuid:/);
  });
});

describe("friends routes", () => {
  const { ada, brin, cass } = users;

  function req(method: string, path: string, token: string | null, body?: unknown): Request {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token !== null) headers.authorization = `Bearer ${token}`;
    return new Request(`http://x${path}`, { method, headers, body: body === undefined ? null : JSON.stringify(body) });
  }
  function params(username: string): { params: Promise<{ username: string }> } {
    return { params: Promise.resolve({ username }) };
  }
  async function json<T>(res: Response, status = 200): Promise<T> {
    const body: unknown = await res.json();
    expect(res.status, JSON.stringify(body)).toBe(status);
    return body as T;
  }
  async function fail(res: Response, status: number, code: string): Promise<void> {
    const body = await json<{ code: string }>(res, status);
    expect(body.code).toBe(code);
  }

  it("wants a signed-in caller", async () => {
    await fail(await friendsGet(req("GET", "/api/friends", null)), 401, "unauthorized");
    await fail(await friendsPost(req("POST", "/api/friends", "not-a-token", { username: brin.username })), 401, "unauthorized");
    await fail(await acceptPost(req("POST", `/api/friends/${brin.username}/accept`, null), params(brin.username)), 401, "unauthorized");
    await fail(await removeDelete(req("DELETE", `/api/friends/${brin.username}`, null), params(brin.username)), 401, "unauthorized");
  });

  it("validates the username in the body and the path", async () => {
    await fail(await friendsPost(req("POST", "/api/friends", cass.token, { username: "No Spaces" })), 400, "invalid");
    await fail(await friendsPost(req("POST", "/api/friends", cass.token, { username: cass.username })), 400, "invalid");
    await fail(await friendsPost(req("POST", "/api/friends", cass.token, { username: `ghost_${suffix}` })), 404, "not-found");
    await fail(await acceptPost(req("POST", "/api/friends/x/accept", cass.token), params("x")), 400, "invalid");
    await fail(await removeDelete(req("DELETE", "/api/friends/x", cass.token), params("x")), 400, "invalid");
    await fail(await acceptPost(req("POST", `/api/friends/${ada.username}/accept`, cass.token), params(ada.username)), 404, "not-found");
  });

  it("runs the whole exchange over HTTP", async () => {
    const asked = await json<FriendsPage>(await friendsPost(req("POST", "/api/friends", cass.token, { username: brin.username })));
    expect(asked.outgoing.map((r) => r.username)).toEqual([brin.username]);
    expect(asked.recent).toEqual([]);

    const seen = await json<FriendsPage>(await friendsGet(req("GET", "/api/friends", brin.token)));
    expect(seen.incoming.map((r) => r.username)).toEqual([cass.username]);
    expect(seen.friends.map((f) => f.username)).toEqual([ada.username]);

    const accepted = await json<FriendsPage>(await acceptPost(req("POST", `/api/friends/${cass.username}/accept`, brin.token), params(cass.username)));
    expect(accepted.friends.map((f) => f.username).sort()).toEqual([ada.username, cass.username].sort());
    expect(accepted.recent.map((h) => h.code)).toEqual(["QRSTV"]);

    const removed = await json<FriendsPage>(await removeDelete(req("DELETE", `/api/friends/${cass.username}`, brin.token), params(cass.username)));
    expect(removed.friends.map((f) => f.username)).toEqual([ada.username]);
    expect(removed.recent).toEqual([]);
  });
});
