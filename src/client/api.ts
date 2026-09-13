import { z } from "zod";
import type { Action, PlayerView } from "@/game/types";

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

async function call<T>(path: string, init: RequestInit, token?: string): Promise<T> {
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

export function createRoom(name: string): Promise<Credentials> {
  return call<Credentials>("/api/rooms", { method: "POST", body: JSON.stringify({ name }) });
}

export function joinRoom(code: string, name: string): Promise<Credentials> {
  return call<Credentials>(`/api/rooms/${encodeURIComponent(code)}/join`, { method: "POST", body: JSON.stringify({ name }) });
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

/* Credentials live in localStorage, one entry per hall, so a second hall never evicts the first. */
const key = (code: string): string => `changeling.credentials.${code}`;
const PROBE_KEY = "changeling.probe";
const credentials: z.ZodType<Credentials> = z.object({ code: z.string(), playerId: z.string(), token: z.string() });

/** Call before taking a seat: without storage the room page could never find the seat again. */
export function assertStorage(): void {
  try {
    window.localStorage.setItem(PROBE_KEY, "1");
    window.localStorage.removeItem(PROBE_KEY);
  } catch (error: unknown) {
    throw new Error("This browser blocks site storage; Changeling needs it to keep your seat.", { cause: error });
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
