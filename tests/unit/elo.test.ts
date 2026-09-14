import { describe, expect, it } from "vitest";
import { DEFAULT_RATING, K, expected, rateHall, type HallPlayer, type RatingChange } from "@/server/elo";

const rating = (overall: number, crew = overall, changeling = overall): HallPlayer["rating"] => ({ overall, crew, changeling });

/** The table under test: an account Changeling, two account crew (one already above 1200), one guest crew. */
const TABLE: HallPlayer[] = [
  { userId: "mask", isImposter: true, rating: rating(1200, 1200, 1250) },
  { userId: "c1", isImposter: false, rating: rating(1200) },
  { userId: "c2", isImposter: false, rating: rating(1300, 1280, 1400) },
  { userId: null, isImposter: false, rating: rating(2000) },
];

const find = (changes: RatingChange[], userId: string, ladder: RatingChange["ladder"]): RatingChange => {
  const c = changes.find((x) => x.userId === userId && x.ladder === ladder);
  if (c === undefined) throw new Error(`no change for ${userId} on ${ladder}`);
  return c;
};

describe("expected", () => {
  it("is one half between equals and symmetric otherwise", () => {
    expect(expected(1200, 1200)).toBe(0.5);
    expect(expected(1300, 1200) + expected(1200, 1300)).toBeCloseTo(1, 12);
    expect(expected(1600, 1200)).toBeCloseTo(0.9090909, 6);
  });
});

describe("rateHall", () => {
  it("moves the crew against the Changeling and the Changeling against the crew's mean on a crew win", () => {
    const changes = rateHall(TABLE, "crew");
    // The mean counts the guest at 1200, not the 2000 on their (ignored) row: (1200 + 1300 + 1200) / 3.
    expect(changes).toHaveLength(6);
    expect(find(changes, "c1", "overall")).toMatchObject({ rating: 1216, won: true });
    expect(find(changes, "c1", "crew")).toMatchObject({ rating: 1216, won: true });
    expect(find(changes, "c2", "overall")).toMatchObject({ rating: 1312, won: true });
    expect(find(changes, "c2", "crew")).toMatchObject({ rating: 1292, won: true });
    expect(find(changes, "mask", "overall")).toMatchObject({ rating: 1186, won: false });
    expect(find(changes, "mask", "changeling")).toMatchObject({ rating: 1233, won: false });
  });

  it("reverses the scores on a Changeling win", () => {
    const changes = rateHall(TABLE, "imposter");
    expect(find(changes, "c1", "overall")).toMatchObject({ rating: 1184, won: false });
    expect(find(changes, "c2", "overall")).toMatchObject({ rating: 1280, won: false });
    expect(find(changes, "c2", "crew")).toMatchObject({ rating: 1260, won: false });
    expect(find(changes, "mask", "overall")).toMatchObject({ rating: 1218, won: true });
    expect(find(changes, "mask", "changeling")).toMatchObject({ rating: 1265, won: true });
  });

  it("touches only the overall and own-role ladders, and never a guest", () => {
    const changes = rateHall(TABLE, "crew");
    expect(changes.filter((c) => c.userId === "mask").map((c) => c.ladder).sort()).toEqual(["changeling", "overall"]);
    expect(changes.filter((c) => c.userId === "c1").map((c) => c.ladder).sort()).toEqual(["crew", "overall"]);
    expect(changes.some((c) => c.ladder === "changeling" && c.userId !== "mask")).toBe(false);
    expect(changes.every((c) => Number.isInteger(c.rating))).toBe(true);
  });

  it("weighs a guest Changeling at 1200 whatever their row says", () => {
    const changes = rateHall(
      [
        { userId: null, isImposter: true, rating: rating(2000) },
        { userId: "c1", isImposter: false, rating: rating(1200) },
      ],
      "crew",
    );
    expect(changes).toEqual([
      { userId: "c1", ladder: "overall", rating: 1216, won: true },
      { userId: "c1", ladder: "crew", rating: 1216, won: true },
    ]);
  });

  it("rounds to the nearest integer", () => {
    const changes = rateHall(
      [
        { userId: "mask", isImposter: true, rating: rating(1000) },
        { userId: "c1", isImposter: false, rating: rating(1200) },
      ],
      "crew",
    );
    // 1200 + 32 * (1 - 0.7597) = 1207.69; 1000 + 32 * (0 - 0.2403) = 992.31
    expect(find(changes, "c1", "overall").rating).toBe(1208);
    expect(find(changes, "mask", "overall").rating).toBe(992);
  });

  it("falls back to 1200 for a missing Changeling or an empty crew", () => {
    const onlyCrew = rateHall([{ userId: "c1", isImposter: false, rating: rating(1200) }], "crew");
    expect(find(onlyCrew, "c1", "overall").rating).toBe(DEFAULT_RATING + K / 2);
    const onlyMask = rateHall([{ userId: "mask", isImposter: true, rating: rating(1200) }], "imposter");
    expect(find(onlyMask, "mask", "changeling").rating).toBe(DEFAULT_RATING + K / 2);
    expect(rateHall([], "crew")).toEqual([]);
  });
});
