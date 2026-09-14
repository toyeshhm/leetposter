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
