import { CATALOG } from "@/economy/catalog";
import { SEASONS } from "@/economy/seasons";
import { supabase, unwrap } from "@/server/supabase";

/**
 * The two mirrors of code into Postgres: CATALOG into `items`, SEASONS into `seasons`.
 * The code is the source of truth either way; the tables exist so inventory, loadout,
 * pass and purchase rows can carry foreign keys. Both run lazily, once per process, from
 * whichever route needs the rows to be there (and from the tests).
 */

let itemsSynced = false;
let seasonsSeeded = false;

export async function syncCatalog(): Promise<void> {
  if (itemsSynced) return;
  unwrap(
    "items sync",
    await supabase.from("items").upsert(
      CATALOG.map((item) => ({
        id: item.id,
        kind: item.kind,
        name: item.name,
        description: item.description,
        rarity: item.rarity,
        price_candles: item.price,
        season_id: item.season,
        tier: item.tier,
      })),
      { onConflict: "id" },
    ),
  );
  itemsSynced = true;
}

export async function seedSeasons(): Promise<void> {
  if (seasonsSeeded) return;
  unwrap(
    "seasons seed",
    await supabase.from("seasons").upsert(
      SEASONS.map((season) => ({ id: season.id, name: season.name, starts_at: season.startsAt, ends_at: season.endsAt, tiers: season.tiers })),
      { onConflict: "id" },
    ),
  );
  seasonsSeeded = true;
}
