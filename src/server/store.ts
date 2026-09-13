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
