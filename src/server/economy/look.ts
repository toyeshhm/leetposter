import type { EquippedLook } from "@/game/types";
import type { AccountUser } from "@/server/auth";
import { supabase, unwrap } from "@/server/supabase";

/**
 * What an account is wearing right now. Read once, when the seat is taken, and carried in the room
 * state beside the username; the view is a pure function and cannot go to the database itself.
 * A guest, and an account that has never equipped anything, wear nothing.
 */
export async function equippedLook(account: AccountUser | null): Promise<EquippedLook | null> {
  if (account === null) return null;
  const row = unwrap(`loadouts ${account.id}`, await supabase.from("loadouts").select("avatar, frame, title, badge").eq("user_id", account.id).maybeSingle());
  return row === null ? null : { avatar: row.avatar, frame: row.frame, title: row.title, badge: row.badge };
}
