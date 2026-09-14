import { describe, expect, it } from "vitest";
import { EXTRA_SEATS, deal } from "@/game/deal";
import { GameError } from "@/game/errors";
import { SEATS } from "@/game/types";
import type { Player } from "@/game/types";
import { at, buildElapsed } from "@/game/util";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function players(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${String(i)}`,
    name: `P${String(i)}`,
    token: `t${String(i)}`,
    userId: null,
    username: null,
    seats: [],
    isImposter: false,
    ejected: false,
    freezeUsed: false,
    joinedAt: i,
  }));
}

describe("deal", () => {
  it("is deterministic for a seeded random and does not mutate its input", () => {
    const input = players(5);
    const a = deal(input, lcg(7));
    const b = deal(input, lcg(7));
    expect(a).toEqual(b);
    expect(input.every((p) => p.seats.length === 0 && !p.isImposter)).toBe(true);
    expect(a.map((p) => p.id)).toEqual(input.map((p) => p.id));
  });

  it("gives four players one of each seat and exactly one imposter", () => {
    const dealt = deal(players(4), lcg(3));
    expect(dealt.flatMap((p) => p.seats).sort()).toEqual([...SEATS].sort());
    expect(dealt.filter((p) => p.isImposter)).toHaveLength(1);
  });

  it.each([5, 6, 7, 8])("gives %i players the extra seats in order", (n) => {
    const dealt = deal(players(n), lcg(n));
    const expected = [...SEATS, ...EXTRA_SEATS.slice(0, n - 4)].sort();
    expect(dealt.flatMap((p) => p.seats).sort()).toEqual(expected);
    expect(dealt.every((p) => p.seats.length === 1)).toBe(true);
  });

  it("varies seats and imposter with the seed", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const d = deal(players(5), lcg(seed));
      seen.add(d.map((p) => `${p.seats.join("")}${p.isImposter ? "!" : ""}`).join(","));
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it("rejects more than eight players (no seat to deal)", () => {
    expect(() => deal(players(9), lcg(1))).toThrow(GameError);
  });
});

describe("util", () => {
  it("at throws on out-of-range", () => {
    expect(at([1, 2], 1)).toBe(2);
    expect(() => at([], 0)).toThrow(GameError);
  });

  it("buildElapsed freezes while paused", () => {
    expect(buildElapsed({ phaseStartedAt: 0, buildElapsedMs: 100, buildRunningSince: null }, 500)).toBe(100);
    expect(buildElapsed({ phaseStartedAt: 0, buildElapsedMs: 100, buildRunningSince: 400 }, 500)).toBe(200);
  });
});
