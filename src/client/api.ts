import { z } from "zod";
import type { Action, PlayerView } from "@/game/types";
import type { Achievement, GameResultRow } from "@/server/achievements";
import type { FriendsPage } from "@/server/friends";

export interface Credentials {
  code: string;
  playerId: string;
  token: string;
}

/**
 * Every failure the client shows. `code` is the server's GameErrorCode ("internal" for a 500),
 * or "network" / "http" / "unknown" when no proper answer came back. `message` is what the
 * player reads; the server writes its messages in the game's voice.
 */
export class ApiError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

/** The message to show inline for a failed request. */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const failureBody = z.object({ code: z.string(), message: z.string() });

/** One authed JSON call; every route wrapper below and the account pages go through it. */
export async function call<T>(path: string, init: RequestInit, token?: string): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token !== undefined) headers.authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch (error: unknown) {
    throw new ApiError("network", `The hall did not answer. Check the connection and try again. (${errorMessage(error)})`);
  }
  const body: unknown = res.headers.get("content-type")?.startsWith("application/json") === true ? await res.json() : null;
  if (res.ok) return body as T;
  const failure = failureBody.safeParse(body);
  if (failure.success) throw new ApiError(failure.data.code, failure.data.message);
  // A gateway page or an empty body: say what came back without pretending it was the game.
  throw new ApiError("http", `The hall did not answer properly (${String(res.status)} ${res.statusText}).`);
}

/** `accessToken` is the signed-in account's Supabase token: the seat is then attached to the account. */
export function createRoom(name: string, accessToken?: string): Promise<Credentials> {
  return call<Credentials>("/api/rooms", { method: "POST", body: JSON.stringify({ name }) }, accessToken);
}

export function joinRoom(code: string, name: string, accessToken?: string): Promise<Credentials> {
  return call<Credentials>(`/api/rooms/${encodeURIComponent(code)}/join`, { method: "POST", body: JSON.stringify({ name }) }, accessToken);
}

/** The signed-in account behind an access token. */
export function fetchAccount(accessToken: string): Promise<{ id: string; username: string; email?: string }> {
  return call<{ id: string; username: string; email?: string }>("/api/account", { method: "GET" }, accessToken);
}

/** Claim a username for a signed-in account that has none yet. */
export function createAccount(username: string, accessToken: string): Promise<{ id: string; username: string }> {
  return call<{ id: string; username: string }>("/api/account", { method: "POST", body: JSON.stringify({ username }) }, accessToken);
}

/** The token travels in the Authorization header, never in the URL (logs, history, Referer). */
export function fetchView(creds: Credentials): Promise<PlayerView> {
  return call<PlayerView>(`/api/rooms/${encodeURIComponent(creds.code)}`, { method: "GET" }, creds.token);
}

export function act(creds: Credentials, action: Action): Promise<PlayerView> {
  return call<PlayerView>(`/api/rooms/${encodeURIComponent(creds.code)}/act`, {
    method: "POST",
    body: JSON.stringify({ token: creds.token, action }),
  });
}

/** The shared editor's last saved state (base64 Yjs update), null before the first save. */
export function loadDoc(creds: Credentials): Promise<{ doc: string | null }> {
  return call<{ doc: string | null }>(`/api/rooms/${encodeURIComponent(creds.code)}/doc`, { method: "GET" }, creds.token);
}

/** Save the full editor state. `keepalive` lets the request outlive a closing tab (64 KiB cap in browsers). */
export function saveDoc(creds: Credentials, doc: string, keepalive: boolean): Promise<{ ok: true }> {
  return call<{ ok: true }>(`/api/rooms/${encodeURIComponent(creds.code)}/doc`, { method: "POST", body: JSON.stringify({ doc }), keepalive }, creds.token);
}

/** The signed-in player's recorded games, newest first. `token` is the Supabase access token. */
export function fetchHistory(token: string): Promise<{ games: GameResultRow[] }> {
  return call<{ games: GameResultRow[] }>("/api/account/history", { method: "GET" }, token);
}

export function fetchAchievements(token: string): Promise<{ achievements: Achievement[] }> {
  return call<{ achievements: Achievement[] }>("/api/account/achievements", { method: "GET" }, token);
}

/* Friends. Every call answers with the whole page again, so the screen just replaces its state. */
export function fetchFriends(token: string): Promise<FriendsPage> {
  return call<FriendsPage>("/api/friends", { method: "GET" }, token);
}
export function requestFriend(token: string, username: string): Promise<FriendsPage> {
  return call<FriendsPage>("/api/friends", { method: "POST", body: JSON.stringify({ username }) }, token);
}
export function acceptFriend(token: string, username: string): Promise<FriendsPage> {
  return call<FriendsPage>(`/api/friends/${encodeURIComponent(username)}/accept`, { method: "POST" }, token);
}
export function removeFriend(token: string, username: string): Promise<FriendsPage> {
  return call<FriendsPage>(`/api/friends/${encodeURIComponent(username)}`, { method: "DELETE" }, token);
}

/* Credentials live in localStorage, one entry per hall, so a second hall never evicts the first. */
const key = (code: string): string => `leetposter.credentials.${code}`;
const PROBE_KEY = "leetposter.probe";
const credentials: z.ZodType<Credentials> = z.object({ code: z.string(), playerId: z.string(), token: z.string() });

/** Call before taking a seat: without storage the room page could never find the seat again. */
export function assertStorage(): void {
  try {
    window.localStorage.setItem(PROBE_KEY, "1");
    window.localStorage.removeItem(PROBE_KEY);
  } catch (error: unknown) {
    throw new Error("This browser blocks site storage; Leetposter needs it to keep your seat.", { cause: error });
  }
}

export function saveCredentials(creds: Credentials): void {
  window.localStorage.setItem(key(creds.code), JSON.stringify(creds));
}

export function removeCredentials(code: string): void {
  window.localStorage.removeItem(key(code));
}

export function loadCredentials(code: string): Credentials | null {
  try {
    const raw = window.localStorage.getItem(key(code));
    const data: unknown = raw === null ? null : JSON.parse(raw);
    const parsed = credentials.safeParse(data);
    return parsed.success && parsed.data.code === code ? parsed.data : null;
  } catch (error: unknown) {
    // Corrupt JSON (SyntaxError) or blocked storage (DOMException) both mean "no seat here": the join
    // form is the recovery path, and assertStorage reports a blocked store before a seat is taken.
    if (!(error instanceof SyntaxError || error instanceof DOMException)) throw error;
    return null;
  }
}
