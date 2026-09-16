import { describe, expect, it } from "vitest";
import { QUEST_POOL, type QuestRule } from "@/economy/quests";
import type { Problem } from "@/game/types";
import type { GameResultRow } from "@/server/achievements";
import { xpForHall } from "@/server/economy/hall";
import { satisfies, type Hall } from "@/server/economy/quests";
import { PROBLEM } from "./fixtures";

/** One recorded hall, crew, won on an accepted submission, two cards both true, never cast out. */
function row(patch: Partial<GameResultRow> = {}): GameResultRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    user_id: "00000000-0000-4000-8000-000000000002",
    code: "ABCDE",
    played_at: "2026-10-02T00:00:00.000Z",
    seats: ["oracle"],
    was_imposter: false,
    won: true,
    reason: "accepted",
    cards_played: 2,
    cards_altered: 0,
    ejected: false,
    players: 5,
    ...patch,
  };
}

const rated = (rating: number): Problem => ({ ...PROBLEM, rating });
const hall = (patch: Partial<Hall> = {}): Hall => ({ problem: PROBLEM, tribunal: false, ...patch });

describe("satisfies", () => {
  const cases: { name: string; rule: QuestRule; yes: [GameResultRow, Hall]; no: [GameResultRow, Hall][] }[] = [
    { name: "halls", rule: { kind: "halls" }, yes: [row(), hall()], no: [] },
    { name: "win any", rule: { kind: "win", as: "any" }, yes: [row(), hall()], no: [[row({ won: false }), hall()]] },
    { name: "win crew", rule: { kind: "win", as: "crew" }, yes: [row(), hall()], no: [[row({ was_imposter: true }), hall()]] },
    {
      name: "win changeling",
      rule: { kind: "win", as: "changeling" },
      yes: [row({ was_imposter: true }), hall()],
      no: [
        [row(), hall()],
        [row({ was_imposter: true, won: false }), hall()],
      ],
    },
    { name: "cards true", rule: { kind: "cards-true", n: 2 }, yes: [row(), hall()], no: [[row({ cards_altered: 1 }), hall()]] },
    { name: "tribunal", rule: { kind: "tribunal-called" }, yes: [row(), hall({ tribunal: true })], no: [[row(), hall()]] },
    {
      name: "accepted",
      rule: { kind: "accepted" },
      yes: [row(), hall()],
      no: [
        [row({ was_imposter: true }), hall()],
        [row({ reason: "time" }), hall()],
      ],
    },
    {
      name: "rating",
      rule: { kind: "rating-at-least", rating: 1400 },
      yes: [row(), hall({ problem: rated(1400) })],
      no: [
        [row(), hall({ problem: null })],
        [row(), hall()],
        [row(), hall({ problem: rated(1399) })],
        [row({ reason: "time" }), hall({ problem: rated(1700) })],
      ],
    },
    { name: "seat", rule: { kind: "seat", seat: "oracle" }, yes: [row(), hall()], no: [[row({ seats: ["runner"] }), hall()]] },
    {
      name: "cast out changeling",
      rule: { kind: "cast-out-changeling" },
      yes: [row({ reason: "imposter-ejected" }), hall()],
      no: [
        [row({ was_imposter: true, reason: "imposter-ejected" }), hall()],
        [row(), hall()],
      ],
    },
    {
      name: "survive",
      rule: { kind: "survive" },
      yes: [row({ was_imposter: true, won: true, ejected: false }), hall()],
      no: [
        [row(), hall()],
        [row({ was_imposter: true, won: false }), hall()],
        [row({ was_imposter: true, won: true, ejected: true }), hall()],
      ],
    },
  ];

  it("covers every rule in the pool", () => {
    expect(new Set(cases.map((c) => c.rule.kind))).toEqual(new Set(QUEST_POOL.map((q) => q.rule.kind)));
  });

  for (const { name, rule, yes, no } of cases) {
    it(`${name}: counts the halls it should and no others`, () => {
      expect(satisfies(rule, yes[0], yes[1]), "the qualifying hall").toBe(true);
      for (const [other, where] of no) expect(satisfies(rule, other, where), JSON.stringify(other)).toBe(false);
    });
  }
});

describe("xpForHall", () => {
  it("pays 40 for the sitting, 30 for the win, 20 for the green mark and 10 a card played true", () => {
    expect(xpForHall(row({ cards_played: 0, cards_altered: 0 }))).toBe(90);
    expect(xpForHall(row())).toBe(110);
    expect(xpForHall(row({ cards_played: 3, cards_altered: 1 }))).toBe(110);
    expect(xpForHall(row({ won: false, reason: "time", cards_played: 0, cards_altered: 0 }))).toBe(40);
    expect(xpForHall(row({ won: true, reason: "imposter-ejected", cards_played: 1, cards_altered: 0 }))).toBe(80);
  });
});
