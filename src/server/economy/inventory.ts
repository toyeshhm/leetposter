import { LOADOUT_SLOTS, type Loadout } from "@/client/api";
import { CATALOG } from "@/economy/catalog";
import { GameError } from "@/game/errors";
import { syncCatalog } from "@/server/economy/items";
import { supabase, unwrap, type InventorySource } from "@/server/supabase";

/**
 * What everyone wears before they own anything. These three are owned implicitly (nobody buys the
 * hood the Company issues), so they are the one thing `inventoryOf` reports without a row behind it.
 * A slot whose default is null shows nothing at all until something is equipped.
 */
export const DEFAULT_LOADOUT: Loadout = { avatar: "avatar-plain-hood", frame: null, title: null, theme: "theme-ember", caret: "caret-bone", badge: null };

const FREE: readonly string[] = Object.values(DEFAULT_LOADOUT).filter((id): id is string => id !== null);

/** Put an item in someone's hands. Idempotent: owning it twice is owning it once. */
export async function grantItem(userId: string, itemId: string, source: InventorySource): Promise<void> {
  await syncCatalog();
  unwrap(
    `grant ${itemId} to ${userId}`,
    await supabase.from("inventory").upsert({ user_id: userId, item_id: itemId, source }, { onConflict: "user_id,item_id", ignoreDuplicates: true }),
  );
}

/** Every catalog id the account may equip: their inventory rows plus the free defaults. */
export async function inventoryOf(userId: string): Promise<string[]> {
  const rows = unwrap(`inventory ${userId}`, await supabase.from("inventory").select("item_id").eq("user_id", userId).order("acquired_at"));
  return [...new Set([...FREE, ...rows.map((row) => row.item_id)])];
}

/** The stored row, slots never chosen left null. */
async function chosen(userId: string): Promise<Loadout> {
  const row = unwrap(`loadout ${userId}`, await supabase.from("loadouts").select("avatar, frame, title, theme, caret, badge").eq("user_id", userId).maybeSingle());
  return row ?? { avatar: null, frame: null, title: null, theme: null, caret: null, badge: null };
}

/** What the account is wearing; a slot it never set falls back to the default. */
export async function loadoutOf(userId: string): Promise<Loadout> {
  const worn = await chosen(userId);
  for (const slot of LOADOUT_SLOTS) worn[slot] ??= DEFAULT_LOADOUT[slot];
  return worn;
}

/** Equip one slot, or clear it back to the default with null. The item must exist, fit the slot, and be owned. */
export async function setLoadout(userId: string, slot: (typeof LOADOUT_SLOTS)[number], itemId: string | null): Promise<Loadout> {
  if (itemId !== null) {
    const item = CATALOG.find((candidate) => candidate.id === itemId);
    if (item?.kind !== slot) throw new GameError("invalid", `Nothing called ${itemId} goes in the ${slot} slot.`);
    if (!(await inventoryOf(userId)).includes(itemId)) throw new GameError("invalid", `You do not own ${item.name}.`);
  }
  const worn = await chosen(userId);
  worn[slot] = itemId;
  unwrap(`equip ${slot} for ${userId}`, await supabase.from("loadouts").upsert({ user_id: userId, ...worn, updated_at: new Date().toISOString() }, { onConflict: "user_id" }));
  return loadoutOf(userId);
}
