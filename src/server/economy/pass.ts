import type { PassPage } from "@/client/api";
import { seasonFor, TIER_COUNT, type Reward } from "@/economy/seasons";
import { GameError } from "@/game/errors";
import type { AccountUser } from "@/server/auth";
import { grantItem } from "@/server/economy/inventory";
import { seedSeasons } from "@/server/economy/items";
import { ensureWallet, grantCandles } from "@/server/economy/wallet";
import { supabase, unwrap } from "@/server/supabase";

interface Progress {
  xp: number;
  paid: boolean;
  claimed: number[];
}

/** This account's row for a season, opened empty the first time anyone asks. */
async function ensurePass(userId: string, seasonId: string): Promise<Progress> {
  await seedSeasons();
  // Only the key columns are named, so an existing row keeps its xp, paid flag and claimed tiers.
  return unwrap(
    `pass ${userId} ${seasonId}`,
    await supabase.from("pass_progress").upsert({ user_id: userId, season_id: seasonId }, { onConflict: "user_id,season_id" }).select("xp, paid, claimed").single(),
  );
}

/**
 * XP is kept twice on purpose: a lifetime total on the wallet, and the running season's total on the
 * pass, which is what the tiers are unlocked against. XP earned between seasons only counts on the wallet.
 * ponytail: read then write, like every other grant here; a Postgres function is the upgrade.
 */
export async function grantXp(userId: string, xp: number, now = new Date()): Promise<void> {
  const wallet = await ensureWallet(userId);
  unwrap(`grant xp ${userId}`, await supabase.from("wallets").update({ xp: wallet.xp + xp, updated_at: new Date().toISOString() }).eq("user_id", userId));
  const season = seasonFor(now);
  if (season === null) return;
  const progress = await ensurePass(userId, season.id);
  unwrap(`pass xp ${userId}`, await supabase.from("pass_progress").update({ xp: progress.xp + xp }).eq("user_id", userId).eq("season_id", season.id));
}

/** The season running now (null between seasons), this account's standing in it, and their candles. */
export async function passPage(user: AccountUser, now = new Date()): Promise<PassPage> {
  const season = seasonFor(now);
  const wallet = await ensureWallet(user.id);
  if (season === null) return { seasonId: null, xp: 0, paid: false, claimed: [], candles: wallet.candles };
  const progress = await ensurePass(user.id, season.id);
  return { seasonId: season.id, xp: progress.xp, paid: progress.paid, claimed: progress.claimed, candles: wallet.candles };
}

/** Take one tier's rewards: the free track always, the paid track as well once the pass is bought. */
export async function claimTier(user: AccountUser, tier: number, now = new Date()): Promise<PassPage> {
  const season = seasonFor(now);
  if (season === null) throw new GameError("invalid", "No season is running.");
  const step = season.tiers[tier - 1];
  if (step === undefined) throw new GameError("invalid", `The season has ${String(TIER_COUNT)} tiers.`);
  const progress = await ensurePass(user.id, season.id);
  if (progress.claimed.includes(tier)) throw new GameError("invalid", "You have taken that one already.");
  if (progress.xp < step.xp) throw new GameError("invalid", `Tier ${String(tier)} opens at ${String(step.xp)} XP.`);
  for (const reward of [step.free, progress.paid ? step.paid : null]) await give(user.id, reward);
  unwrap(
    `claim tier ${String(tier)} ${user.id}`,
    await supabase.from("pass_progress").update({ claimed: [...progress.claimed, tier] }).eq("user_id", user.id).eq("season_id", season.id),
  );
  return passPage(user, now);
}

async function give(userId: string, reward: Reward): Promise<void> {
  if (reward === null) return;
  if ("item" in reward) await grantItem(userId, reward.item, "pass");
  else await grantCandles(userId, reward.candles);
}
