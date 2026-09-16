import { GameError } from "@/game/errors";
import type { RoomState } from "@/game/types";
import { supabase } from "@/server/supabase";
import { parse, roomState } from "@/server/validate";

const UNIQUE_VIOLATION = "23505";
const ATTEMPTS = 8;
const BACKOFF_MS = 25;

/** Insert a new room at version 0. Returns false when the code is already taken. */
export async function createRoom(state: RoomState): Promise<boolean> {
  const { error } = await supabase.from("rooms").insert({ code: state.code, state, version: 0 });
  if (error === null) return true;
  if (error.code === UNIQUE_VIOLATION) return false;
  throw new Error(`createRoom ${state.code}: ${error.message}`);
}

export async function loadRoom(code: string): Promise<{ state: RoomState; version: number } | null> {
  const { data, error } = await supabase.from("rooms").select("state, version").eq("code", code).maybeSingle();
  if (error !== null) throw new Error(`loadRoom ${code}: ${error.message}`);
  if (data === null) return null;
  return { state: parse(roomState, data.state), version: data.version };
}

/**
 * Load, apply `fn`, save with optimistic concurrency on `version`; retried with a little jitter
 * on a conflict (eight voters in the last second). Returning the very same object from `fn`
 * skips the write (a no-op tick).
 * ponytail: move `fn` into a Postgres function if the retry budget ever shows up in practice.
 */
export async function withRoom(code: string, fn: (state: RoomState) => RoomState | Promise<RoomState>): Promise<RoomState> {
  for (let attempt = 1; ; attempt++) {
    const row = await loadRoom(code);
    if (row === null) throw new GameError("not-found", `No hall called ${code}.`);
    const next = await fn(row.state);
    if (next === row.state || (await saveRoom(code, next, row.version))) return next;
    if (attempt >= ATTEMPTS) throw new Error(`withRoom ${code}: version conflict after ${String(ATTEMPTS)} attempts`);
    await new Promise((resolve) => setTimeout(resolve, Math.random() * BACKOFF_MS));
  }
}

/** UPDATE ... WHERE code = ? AND version = ?; false when someone else wrote first. */
async function saveRoom(code: string, state: RoomState, version: number): Promise<boolean> {
  const { data, error } = await supabase
    .from("rooms")
    .update({ state, version: version + 1, updated_at: new Date().toISOString() })
    .eq("code", code)
    .eq("version", version)
    .select("code");
  if (error !== null) throw new Error(`saveRoom ${code}: ${error.message}`);
  return data.length === 1;
}

/** The shared editor's last saved Yjs state (base64); null before the first save. */
export async function loadDoc(code: string): Promise<string | null> {
  const { data, error } = await supabase.from("rooms").select("doc").eq("code", code).maybeSingle();
  if (error !== null) throw new Error(`loadDoc ${code}: ${error.message}`);
  if (data === null) throw new GameError("not-found", `No hall called ${code}.`);
  return data.doc;
}

/** Overwrite the saved editor state. ponytail: last writer wins; the state is a full CRDT snapshot, so nothing is lost that the writer had seen. */
export async function saveDoc(code: string, doc: string): Promise<void> {
  const { data, error } = await supabase.from("rooms").update({ doc }).eq("code", code).select("code");
  if (error !== null) throw new Error(`saveDoc ${code}: ${error.message}`);
  if (data.length !== 1) throw new GameError("not-found", `No hall called ${code}.`);
}

/** Put the hall on (or take it off) the public board. Bumps updated_at so a freshly listed lobby shows at once. */
export async function setListed(code: string, listed: boolean): Promise<void> {
  const { data, error } = await supabase.from("rooms").update({ listed, updated_at: new Date().toISOString() }).eq("code", code).select("code");
  if (error !== null) throw new Error(`setListed ${code}: ${error.message}`);
  if (data.length !== 1) throw new GameError("not-found", `No hall called ${code}.`);
}

export async function isListed(code: string): Promise<boolean> {
  const { data, error } = await supabase.from("rooms").select("listed").eq("code", code).maybeSingle();
  if (error !== null) throw new Error(`isListed ${code}: ${error.message}`);
  if (data === null) throw new GameError("not-found", `No hall called ${code}.`);
  return data.listed;
}

/** One line of the halls board. `watchable` is false in the lobby, where the door is still open and joining beats watching. */
export interface HallRow {
  code: string;
  host: string;
  phase: RoomState["phase"];
  players: number;
  rating: number | null;
  watchable: boolean;
}

const BOARD_WINDOW_MS = 15 * 60_000;
const BOARD_LIMIT = 50;

/** Listed halls that moved since `since` (fifteen minutes ago by default; injectable so the failure path is testable), newest first. */
export async function listHalls(since: string = new Date(Date.now() - BOARD_WINDOW_MS).toISOString()): Promise<HallRow[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("state")
    .eq("listed", true)
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(BOARD_LIMIT);
  if (error !== null) throw new Error(`listHalls: ${error.message}`);
  return data.map((row) => {
    const state = parse(roomState, row.state);
    return {
      code: state.code,
      host: state.players.find((p) => p.id === state.hostId)?.name ?? "someone",
      phase: state.phase,
      players: state.players.length,
      rating: state.problem?.rating ?? null,
      watchable: state.phase !== "lobby",
    };
  });
}
