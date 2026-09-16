import { z } from "zod";
import { GameError } from "@/game/errors";
import { supabase } from "@/server/supabase";

export const username = z.string().regex(/^[a-z0-9_]{3,20}$/, "A name is 3 to 20 lowercase letters, digits or underscores.");
const UNIQUE_VIOLATION = "23505";

/** The profile's username for an auth user id; null when the user never claimed a name. */
export async function findProfile(id: string): Promise<string | null> {
  const { data, error } = await supabase.from("profiles").select("username").eq("id", id).maybeSingle();
  if (error !== null) throw new Error(`profiles ${id}: ${error.message}`);
  return data?.username ?? null;
}

/** Claim a username for an auth user. GameError("taken") when the name, or the account's name, already exists. */
export async function createProfile(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("profiles").insert({ id, username: name });
  if (error === null) return;
  // The unique index on username, or the primary key when this account already picked a name.
  if (error.code === UNIQUE_VIOLATION) throw new GameError("taken", error.message.includes("username") ? "That name is taken." : "This account already has a name.");
  throw new Error(`profiles insert ${id}: ${error.message}`);
}

/**
 * Change the name on an existing profile. Every screen that shows a username joins `profiles` on
 * the account id rather than storing the name, so a rename follows the player through the
 * leaderboard, their ledger and their friends without touching a recorded hall.
 */
export async function renameProfile(id: string, name: string): Promise<void> {
  const { data, error } = await supabase.from("profiles").update({ username: name }).eq("id", id).select("id").maybeSingle();
  if (error !== null) {
    if (error.code === UNIQUE_VIOLATION) throw new GameError("taken", "That name is taken.");
    throw new Error(`profiles rename ${id}: ${error.message}`);
  }
  // No row updated: this account never reached the "choose your name" step, so there is nothing to rename.
  if (data === null) throw new GameError("not-found", "No name chosen yet.");
}
