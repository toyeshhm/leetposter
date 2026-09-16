import type { StorePage } from "@/client/api";
import { CATALOG } from "@/economy/catalog";
import { GameError } from "@/game/errors";
import type { AccountUser } from "@/server/auth";
import { inventoryOf, loadoutOf } from "@/server/economy/inventory";
import { syncCatalog } from "@/server/economy/items";
import { ensureWallet } from "@/server/economy/wallet";
import { log } from "@/server/log";
import { supabase, unwrap } from "@/server/supabase";

/** The shelf as one account sees it. A guest sees the prices (they are in the catalog) and owns nothing. */
export async function storePage(user: AccountUser | null): Promise<StorePage> {
  await syncCatalog();
  if (user === null) return { candles: null, owned: [], loadout: null };
  const [wallet, owned, loadout] = await Promise.all([ensureWallet(user.id), inventoryOf(user.id), loadoutOf(user.id)]);
  return { candles: wallet.candles, owned, loadout };
}

/**
 * Spend candles on one item. The spend is the guard: `candles >= price` keeps the balance from going
 * under, and `candles = <what we just read>` means a second buy landing at the same moment cannot be
 * paid for twice. If the inventory row is then refused the candles go straight back.
 */
export async function buy(user: AccountUser, itemId: string): Promise<StorePage> {
  await syncCatalog();
  const item = CATALOG.find((candidate) => candidate.id === itemId);
  if (item === undefined) throw new GameError("invalid", "Nothing on the shelf is called that.");
  if (item.price === null) throw new GameError("invalid", `${item.name} is not for sale; it is earned.`);
  if ((await inventoryOf(user.id)).includes(itemId)) throw new GameError("invalid", `You already have ${item.name}.`);
  const wallet = await ensureWallet(user.id);
  const spent = unwrap(
    `buy ${itemId} for ${user.id}`,
    await supabase
      .from("wallets")
      .update({ candles: wallet.candles - item.price, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("candles", wallet.candles)
      .gte("candles", item.price)
      .select("candles")
      .maybeSingle(),
  );
  if (spent === null) throw new GameError("invalid", `${item.name} costs ${String(item.price)} candles; you have ${String(wallet.candles)}.`);
  const kept = await supabase.from("inventory").insert({ user_id: user.id, item_id: itemId, source: "store" });
  if (kept.error !== null) {
    unwrap(
      `refund ${itemId} to ${user.id}`,
      await supabase.from("wallets").update({ candles: wallet.candles, updated_at: new Date().toISOString() }).eq("user_id", user.id).eq("candles", spent.candles),
    );
    log.error("store.buy.failed", { user: user.id, item: itemId, error: kept.error.message });
    throw new GameError("invalid", `${item.name} is not on the shelf. Your candles are back.`);
  }
  return storePage(user);
}
