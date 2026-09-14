import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_IDS, achievements, type GameResultRow } from "@/server/achievements";

let n = 0;
/** A crew win on an accepted submission with two honest cards; override what the rule under test cares about. */
function row(over: Partial<GameResultRow> = {}): GameResultRow {
  n += 1;
  return {
    id: `r${String(n)}`,
    user_id: "u1",
    code: `H${String(n)}`,
    played_at: new Date(n * 1000).toISOString(),
    seats: ["tagger"],
    was_imposter: false,
    won: true,
    reason: "accepted",
    cards_played: 2,
    cards_altered: 0,
    ejected: false,
    players: 5,
    ...over,
  };
}

function get(rows: GameResultRow[], id: (typeof ACHIEVEMENT_IDS)[number]): { earned: boolean; have: number; need: number } {
  const a = achievements(rows).find((x) => x.id === id);
  if (a === undefined) throw new Error(`no achievement ${id}`);
  return { earned: a.earned, have: a.progress.have, need: a.progress.need };
}

describe("achievements", () => {
  it("lists every achievement, unearned with zero progress, for a player with no games", () => {
    const all = achievements([]);
    expect(all.map((a) => a.id)).toEqual([...ACHIEVEMENT_IDS]);
    for (const a of all) {
      expect(a.earned).toBe(false);
      expect(a.progress.have).toBe(0);
      expect(a.name).toBeTypeOf("string");
      expect(a.description).toBeTypeOf("string");
    }
  });

  it("First Candle, Company of Five and Long Night count games played, won or lost", () => {
    const lost = row({ won: false });
    expect(get([lost], "first-candle")).toEqual({ earned: true, have: 1, need: 1 });
    const four = [lost, row(), row(), row()];
    expect(get(four, "company-of-five")).toEqual({ earned: false, have: 4, need: 5 });
    expect(get([...four, row()], "company-of-five")).toEqual({ earned: true, have: 5, need: 5 });
    const nine = Array.from({ length: 9 }, () => row({ won: false, was_imposter: true }));
    expect(get(nine, "long-night")).toEqual({ earned: false, have: 9, need: 10 });
    expect(get([...nine, row()], "long-night")).toEqual({ earned: true, have: 10, need: 10 });
  });

  it("Unmasked needs a crew win by ejecting the Changeling, while crew", () => {
    expect(get([row({ reason: "imposter-ejected" })], "unmasked").earned).toBe(true);
    expect(get([row({ reason: "accepted" })], "unmasked").earned).toBe(false);
    expect(get([row({ reason: "imposter-ejected", won: false })], "unmasked").earned).toBe(false);
    expect(get([row({ reason: "imposter-ejected", was_imposter: true, won: false })], "unmasked").earned).toBe(false);
  });

  it("Silver Tongue is any win as the Changeling", () => {
    expect(get([row({ was_imposter: true, won: true, reason: "time" })], "silver-tongue").earned).toBe(true);
    expect(get([row({ was_imposter: true, won: false })], "silver-tongue").earned).toBe(false);
    expect(get([row({ was_imposter: false, won: true })], "silver-tongue").earned).toBe(false);
  });

  it("Clean Hands is three crew wins with at least one card and none altered", () => {
    const clean = row({ cards_played: 1, cards_altered: 0 });
    expect(get([clean, clean], "clean-hands")).toEqual({ earned: false, have: 2, need: 3 });
    expect(get([clean, clean, clean], "clean-hands")).toEqual({ earned: true, have: 3, need: 3 });
    expect(get([clean, clean, row({ cards_played: 0 })], "clean-hands").have).toBe(2);
    expect(get([clean, clean, row({ cards_altered: 1 })], "clean-hands").have).toBe(2);
    expect(get([clean, clean, row({ won: false })], "clean-hands").have).toBe(2);
    expect(get([clean, clean, row({ was_imposter: true })], "clean-hands").have).toBe(2);
  });

  it("Cast Out is being ejected while crew, once", () => {
    expect(get([row({ ejected: true, won: false, reason: "final-vote" })], "cast-out")).toEqual({ earned: true, have: 1, need: 1 });
    expect(get([row({ ejected: true, was_imposter: true, won: false })], "cast-out").earned).toBe(false);
    expect(get([row({ ejected: false })], "cast-out").earned).toBe(false);
  });

  it("Two Faces is a Changeling win with two or more cards altered", () => {
    expect(get([row({ was_imposter: true, won: true, cards_played: 3, cards_altered: 2 })], "two-faces").earned).toBe(true);
    expect(get([row({ was_imposter: true, won: true, cards_played: 3, cards_altered: 1 })], "two-faces").earned).toBe(false);
    expect(get([row({ was_imposter: true, won: false, cards_played: 3, cards_altered: 2 })], "two-faces").earned).toBe(false);
    expect(get([row({ was_imposter: false, won: true, cards_played: 3, cards_altered: 2 })], "two-faces").earned).toBe(false);
  });

  it("progress keeps counting past the need", () => {
    expect(get(Array.from({ length: 12 }, () => row()), "long-night")).toEqual({ earned: true, have: 12, need: 10 });
  });
});
