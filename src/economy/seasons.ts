/**
 * The four seeded seasons of the pass. Pure data plus `seasonFor`; the `seasons` table is a
 * mirror of this list. Tier t costs 100 + 20t XP on top of tier t-1, so `xp` is the cumulative
 * total needed to reach it and tier 30 sits at 12,300 XP.
 */

export type Reward = { item: string } | { candles: number } | null;

export interface Tier {
  tier: number;
  /** Cumulative XP needed to unlock this tier. */
  xp: number;
  free: Reward;
  paid: Reward;
}

export interface Season {
  id: string;
  name: string;
  /** Inclusive, ISO 8601 UTC. */
  startsAt: string;
  /** Exclusive: the next season starts here. */
  endsAt: string;
  tiers: readonly Tier[];
}

export const TIER_COUNT = 30;

/** Cumulative XP to reach tier t: the sum of 100 + 20i for i in 1..t. */
export function xpForTier(tier: number): number {
  return 100 * tier + 10 * tier * (tier + 1);
}

const FREE_ITEM_TIERS = new Set([1, 5, 10, 15, 20, 25, 30]);
const PAID_ITEM_TIERS = new Set([1, 10, 20, 30]);
const FREE_CANDLES = 20;
const PAID_CANDLES = 50;

/**
 * Lay a season's items over the fixed tier shape: free items on 1, 5, 10, 15, 20, 25, 30 and
 * paid items on 1, 10, 20, 30, candles on every other tier. `free` and `paid` list catalog ids
 * in ascending tier order, seven and four of them (the test pins every seasonal item to a tier).
 */
function tiers(free: readonly string[], paid: readonly string[]): Tier[] {
  const freeIds = [...free];
  const paidIds = [...paid];
  const out: Tier[] = [];
  for (let tier = 1; tier <= TIER_COUNT; tier += 1) {
    const freeItem = FREE_ITEM_TIERS.has(tier) ? freeIds.shift() : undefined;
    const paidItem = PAID_ITEM_TIERS.has(tier) ? paidIds.shift() : undefined;
    out.push({
      tier,
      xp: xpForTier(tier),
      free: freeItem === undefined ? { candles: FREE_CANDLES } : { item: freeItem },
      paid: paidItem === undefined ? { candles: PAID_CANDLES } : { item: paidItem },
    });
  }
  return out;
}

export const SEASONS: readonly Season[] = [
  {
    id: "2026-10",
    name: "The Long Night",
    startsAt: "2026-10-01T00:00:00.000Z",
    endsAt: "2026-11-01T00:00:00.000Z",
    tiers: tiers(
      ["badge-season-long-night", "title-reads-hints-verbatim", "caret-candle", "frame-wax-seal", "avatar-wide-hat", "avatar-veiled", "title-of-the-long-night"],
      ["emote-raised-cup", "caret-guttering", "title-warden-of-the-north-gate", "avatar-warden"],
    ),
  },
  {
    id: "2026-11",
    name: "The Frost Watch",
    startsAt: "2026-11-01T00:00:00.000Z",
    endsAt: "2026-12-01T00:00:00.000Z",
    tiers: tiers(
      ["badge-season-frost-watch", "caret-soot", "caret-rust", "frame-brambles", "theme-frost", "avatar-tall-hat", "title-frost-watcher"],
      ["emote-slow-clap", "frame-chain", "title-unbroken-chain", "avatar-dov"],
    ),
  },
  {
    id: "2026-12",
    name: "The Hushed Feast",
    startsAt: "2026-12-01T00:00:00.000Z",
    endsAt: "2027-01-01T00:00:00.000Z",
    tiers: tiers(
      ["emote-bell", "title-twice-masked", "caret-moss", "frame-iron", "avatar-half-mask", "avatar-beaked-mask", "title-keeper-of-the-ledger"],
      ["emote-mask-slip", "theme-gilt", "frame-gilded", "avatar-cat"],
    ),
  },
  {
    id: "2027-01",
    name: "The First Thaw",
    startsAt: "2027-01-01T00:00:00.000Z",
    endsAt: "2027-02-01T00:00:00.000Z",
    tiers: tiers(
      ["emote-broken-seal", "title-never-cast-out", "caret-oxblood", "avatar-deep-hood", "avatar-raven", "frame-cracked-stone", "title-first-thaw"],
      ["avatar-candle-bearer", "caret-wisp", "avatar-lantern-hood", "frame-candle-ring"],
    ),
  },
];

/** The season running at `date`, or null between seeded seasons. */
export function seasonFor(date: Date): Season | null {
  const at = date.toISOString();
  return SEASONS.find((s) => s.startsAt <= at && at < s.endsAt) ?? null;
}
