import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_IDS } from "@/server/achievements";
import { badgeForAchievement, CATALOG, itemById, PRICE_BY_RARITY, THEME_TOKENS } from "@/economy/catalog";
import { SEASONS, seasonFor, TIER_COUNT, xpForTier } from "@/economy/seasons";
import { isoWeek, QUEST_POOL, questsFor } from "@/economy/quests";

describe("catalog", () => {
  it("has 64 items with unique ids and art ids", () => {
    expect(CATALOG).toHaveLength(64);
    expect(new Set(CATALOG.map((i) => i.id)).size).toBe(64);
    expect(new Set(CATALOG.map((i) => i.art)).size).toBe(64);
  });

  it("has the planned count per kind", () => {
    const counts = new Map<string, number>();
    for (const item of CATALOG) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
    expect(Object.fromEntries(counts)).toEqual({ avatar: 14, frame: 8, title: 12, theme: 6, caret: 8, badge: 10, emote: 6 });
  });

  it("prices store items by rarity and nothing else", () => {
    for (const item of CATALOG) {
      const sold = item.season === null && item.kind !== "badge" && item.id !== "theme-ember";
      expect(item.price, item.id).toBe(sold ? PRICE_BY_RARITY[item.rarity] : null);
      expect(item.season === null, item.id).toBe(item.tier === null);
      if (item.rarity === "legendary") expect(item.tier, item.id).toBe(TIER_COUNT);
    }
  });

  it("has a badge for every achievement and tokens for every theme", () => {
    for (const id of ACHIEVEMENT_IDS) expect(itemById(badgeForAchievement(id)).kind).toBe("badge");
    const themes = CATALOG.filter((i) => i.kind === "theme").map((i) => i.id);
    expect(Object.keys(THEME_TOKENS).sort()).toEqual([...themes].sort());
    expect(THEME_TOKENS["theme-ember"]).toEqual({});
  });

  it("throws on an unknown id", () => {
    expect(() => itemById("avatar-nobody")).toThrow("No catalog item avatar-nobody");
  });
});

describe("seasons", () => {
  it("covers four consecutive months", () => {
    expect(SEASONS.map((s) => s.id)).toEqual(["2026-10", "2026-11", "2026-12", "2027-01"]);
    for (let i = 1; i < SEASONS.length; i += 1) expect(SEASONS[i]?.startsAt).toBe(SEASONS[i - 1]?.endsAt);
  });

  it("has 30 tiers on a monotonic curve with the documented cost", () => {
    expect(xpForTier(30)).toBe(12_300);
    for (const season of SEASONS) {
      expect(season.tiers).toHaveLength(TIER_COUNT);
      let last = 0;
      for (const t of season.tiers) {
        expect(t.xp - last).toBe(100 + 20 * t.tier);
        last = t.xp;
      }
    }
  });

  it("references catalog items of the same season, each exactly once, on the fixed tiers", () => {
    const seen = new Set<string>();
    for (const season of SEASONS) {
      for (const t of season.tiers) {
        for (const [track, reward] of [
          ["free", t.free],
          ["paid", t.paid],
        ] as const) {
          expect(reward).not.toBeNull();
          if (reward === null || !("item" in reward)) continue;
          const item = itemById(reward.item);
          expect(item.season, reward.item).toBe(season.id);
          expect(item.tier, reward.item).toBe(t.tier);
          expect(seen.has(item.id), `${item.id} rewarded twice`).toBe(false);
          seen.add(item.id);
          if (track === "free") expect([1, 5, 10, 15, 20, 25, 30]).toContain(t.tier);
          else expect([1, 10, 20, 30]).toContain(t.tier);
        }
      }
    }
    const seasonal = CATALOG.filter((i) => i.season !== null).map((i) => i.id);
    expect([...seen].sort()).toEqual(seasonal.sort());
  });

  it("finds the season for a date", () => {
    expect(seasonFor(new Date("2026-10-01T00:00:00Z"))?.name).toBe("The Long Night");
    expect(seasonFor(new Date("2026-11-30T23:59:59Z"))?.name).toBe("The Frost Watch");
    expect(seasonFor(new Date("2027-01-15T12:00:00Z"))?.name).toBe("The First Thaw");
    expect(seasonFor(new Date("2027-02-01T00:00:00Z"))).toBeNull();
    expect(seasonFor(new Date("2026-09-14T00:00:00Z"))).toBeNull();
  });
});

describe("quests", () => {
  it("has 12 daily and 8 weekly quests with unique ids", () => {
    expect(QUEST_POOL.filter((q) => q.cadence === "daily")).toHaveLength(12);
    expect(QUEST_POOL.filter((q) => q.cadence === "weekly")).toHaveLength(8);
    expect(new Set(QUEST_POOL.map((q) => q.id)).size).toBe(QUEST_POOL.length);
  });

  it("computes ISO weeks", () => {
    expect(isoWeek(new Date("2026-01-01T00:00:00Z"))).toBe("2026-W01");
    expect(isoWeek(new Date("2027-01-03T00:00:00Z"))).toBe("2026-W53");
    expect(isoWeek(new Date("2027-01-04T00:00:00Z"))).toBe("2027-W01");
    expect(isoWeek(new Date("2026-09-14T23:59:59Z"))).toBe("2026-W38");
  });

  it("picks 3+3 without duplicates, deterministically, for 60 consecutive days", () => {
    const start = Date.UTC(2026, 9, 1);
    const dailySets = new Set<string>();
    for (let d = 0; d < 60; d += 1) {
      const date = new Date(start + d * 86_400_000);
      const a = questsFor(date);
      const b = questsFor(new Date(date.getTime() + 3_600_000));
      expect(a).toEqual(b);
      expect(a.daily).toHaveLength(3);
      expect(a.weekly).toHaveLength(3);
      expect(new Set(a.daily.map((q) => q.id)).size).toBe(3);
      expect(new Set(a.weekly.map((q) => q.id)).size).toBe(3);
      for (const q of a.daily) expect(q.cadence).toBe("daily");
      for (const q of a.weekly) expect(q.cadence).toBe("weekly");
      expect(a.period.daily).toBe(date.toISOString().slice(0, 10));
      expect(a.period.weekly).toBe(isoWeek(date));
      dailySets.add(a.daily.map((q) => q.id).join(","));
    }
    expect(dailySets.size).toBeGreaterThan(20);
  });
});
