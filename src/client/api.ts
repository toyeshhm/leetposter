import { z } from "zod";
import type { Action, PlayerView } from "@/game/types";
import type { Achievement, GameResultRow } from "@/server/achievements";
import type { FriendsPage } from "@/server/friends";
import type { ProblemTests } from "@/server/problems";

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

/** A bank problem's samples and hidden tests. The server hands these to the Herald of this hall only. */
export function fetchProblemTests(creds: Credentials, id: string): Promise<ProblemTests> {
  return call<ProblemTests>(`/api/problems/${encodeURIComponent(id)}/tests?code=${encodeURIComponent(creds.code)}`, { method: "GET" }, creds.token);
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

/* Economy. Like friends, every call answers with the whole page again, so a screen just replaces its state. */

/** The six equippable slots. `emote` is not one: `loadouts` (migration 0006) has no column for it. */
export const LOADOUT_SLOTS = ["avatar", "frame", "title", "theme", "caret", "badge"] as const;

/** One equipped catalog id per slot, or null for the default. */
export interface Loadout {
  avatar: string | null;
  frame: string | null;
  title: string | null;
  theme: string | null;
  caret: string | null;
  badge: string | null;
}

/** `candles` and `loadout` are null for a guest, who sees the shelf and the prices but owns nothing. */
export interface StorePage {
  candles: number | null;
  owned: string[];
  loadout: Loadout | null;
}

export interface PassPage {
  /** The season running now, or null between seasons. */
  seasonId: string | null;
  xp: number;
  paid: boolean;
  /** Tiers already claimed. */
  claimed: number[];
  candles: number;
}

/** One quest as the server counts it; the name, goal and rewards come from QUEST_POOL by id. */
export interface QuestProgress {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface QuestsPage {
  daily: QuestProgress[];
  weekly: QuestProgress[];
  candles: number;
}

/** The shelf. No token means a guest: prices, no wallet. */
export function fetchStore(token: string | null): Promise<StorePage> {
  return call<StorePage>("/api/store", { method: "GET" }, token ?? undefined);
}

export function buyItem(token: string, itemId: string): Promise<StorePage> {
  return call<StorePage>("/api/store/buy", { method: "POST", body: JSON.stringify({ itemId }) }, token);
}

export function fetchLoadout(token: string): Promise<Loadout> {
  return call<Loadout>("/api/account/loadout", { method: "GET" }, token);
}

/** `itemId` null clears the slot back to the default. */
export function equipItem(token: string, slot: (typeof LOADOUT_SLOTS)[number], itemId: string | null): Promise<Loadout> {
  return call<Loadout>("/api/account/loadout", { method: "POST", body: JSON.stringify({ slot, itemId }) }, token);
}

export function fetchPass(token: string): Promise<PassPage> {
  return call<PassPage>("/api/pass", { method: "GET" }, token);
}

export function claimTier(token: string, tier: number): Promise<PassPage> {
  return call<PassPage>("/api/pass/claim", { method: "POST", body: JSON.stringify({ tier }) }, token);
}

/** The Stripe Checkout url to send the buyer to. Without keys the route answers "The store has no till yet." */
export function passCheckout(token: string): Promise<{ url: string }> {
  return call<{ url: string }>("/api/pass/checkout", { method: "POST" }, token);
}

export function fetchQuests(token: string): Promise<QuestsPage> {
  return call<QuestsPage>("/api/quests", { method: "GET" }, token);
}

export function claimQuest(token: string, questId: string): Promise<QuestsPage> {
  return call<QuestsPage>("/api/quests/claim", { method: "POST", body: JSON.stringify({ questId }) }, token);
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
