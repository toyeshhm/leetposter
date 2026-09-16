import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { GameError } from "@/game/errors";
import { DEFAULT_SETTINGS } from "@/game/types";
import type { Action, Problem, RoomState } from "@/game/types";
import { actBody, action, nameBody, parse, playerName, problem, roomCode, roomState, token } from "@/server/validate";

const PROBLEM: Problem = {
  title: "Two Sum",
  url: "https://example.test/two-sum",
  statement: "Find two numbers that add up to target.",
  tags: ["array", "hash-table"],
  hints: ["Try a map.", "One pass."],
  constraints: "2 <= n <= 1e4",
};

const TOKEN = "f".repeat(32);

function invalid<T>(schema: z.ZodType<T>, value: unknown): void {
  let caught: unknown;
  try {
    parse(schema, value);
  } catch (error: unknown) {
    caught = error;
  }
  if (!(caught instanceof GameError)) throw new Error(`expected GameError(invalid), got ${String(caught)}`);
  expect(caught.code).toBe("invalid");
}

describe("parse", () => {
  it("returns the parsed value", () => {
    expect(parse(playerName, "  Ada ")).toBe("Ada");
  });
  it("throws GameError(invalid) with the issue in the message", () => {
    expect(() => parse(playerName, "")).toThrow(/Too small|at least/);
    invalid(playerName, 42);
  });
});

describe("playerName", () => {
  it("accepts 1..24 chars after trimming", () => {
    expect(parse(playerName, "a")).toBe("a");
    expect(parse(playerName, "x".repeat(24))).toBe("x".repeat(24));
  });
  it("rejects blank and too long", () => {
    invalid(playerName, "   ");
    invalid(playerName, "x".repeat(25));
  });
});

describe("roomCode", () => {
  it("uppercases and accepts five letters without I or O", () => {
    expect(parse(roomCode, " abcde ")).toBe("ABCDE");
    expect(parse(roomCode, "ZYXWV")).toBe("ZYXWV");
  });
  it("rejects I, O, digits, and wrong lengths", () => {
    invalid(roomCode, "ABCDI");
    invalid(roomCode, "ABCDO");
    invalid(roomCode, "ABCD1");
    invalid(roomCode, "ABCD");
    invalid(roomCode, "ABCDEF");
  });
});

describe("token", () => {
  it("is exactly 32 lowercase hex chars", () => {
    expect(parse(token, TOKEN)).toBe(TOKEN);
    invalid(token, "f".repeat(31));
    invalid(token, "f".repeat(33));
    invalid(token, "F".repeat(32));
    invalid(token, "g".repeat(32));
    invalid(token, null);
    invalid(token, undefined);
  });
});

describe("problem", () => {
  it("accepts a full problem and empty optional-ish text, trimming what goes on the record", () => {
    expect(parse(problem, PROBLEM)).toEqual(PROBLEM);
    expect(parse(problem, { ...PROBLEM, constraints: "", tags: [], hints: [] }).tags).toEqual([]);
    expect(parse(problem, { ...PROBLEM, title: " Two Sum ", tags: [" array "], hints: [" Try a map. "] })).toMatchObject({
      title: "Two Sum",
      tags: ["array"],
      hints: ["Try a map."],
    });
  });
  it("rejects every bad field", () => {
    invalid(problem, { ...PROBLEM, title: "" });
    invalid(problem, { ...PROBLEM, title: "   " });
    invalid(problem, { ...PROBLEM, title: "t".repeat(201) });
    invalid(problem, { ...PROBLEM, url: "ftp://example.test/x" });
    invalid(problem, { ...PROBLEM, url: "not a url" });
    invalid(problem, { ...PROBLEM, statement: "" });
    invalid(problem, { ...PROBLEM, statement: " \n " });
    invalid(problem, { ...PROBLEM, statement: "s".repeat(30001) });
    invalid(problem, { ...PROBLEM, tags: Array.from({ length: 21 }, () => "t") });
    invalid(problem, { ...PROBLEM, tags: [""] });
    invalid(problem, { ...PROBLEM, tags: ["  "] });
    invalid(problem, { ...PROBLEM, tags: ["t".repeat(41)] });
    invalid(problem, { ...PROBLEM, hints: Array.from({ length: 21 }, () => "h") });
    invalid(problem, { ...PROBLEM, hints: [""] });
    invalid(problem, { ...PROBLEM, hints: ["  "] });
    invalid(problem, { ...PROBLEM, hints: ["h".repeat(2001)] });
    invalid(problem, { ...PROBLEM, constraints: "c".repeat(5001) });
    invalid(problem, null);
  });
});

describe("action", () => {
  const good: Action[] = [
    { type: "setProblem", problem: PROBLEM },
    { type: "setSettings", settings: {} },
    { type: "setSettings", settings: { readMs: 0, buildMs: 300_000, maxSubmissions: 2 } },
    { type: "start" },
    { type: "declareTags", tags: ["a", "b"] },
    { type: "revealHint", index: 0, text: "Try a map." },
    { type: "declareBound", text: "n <= 10" },
    { type: "submit", verdict: "accepted" },
    { type: "submit", verdict: "rejected", category: "wrong-answer", failingCase: "[1]" },
    { type: "callFreeze" },
    { type: "vote", targetId: null },
    { type: "vote", targetId: "p1" },
    { type: "tick" },
  ];
  it.each(good)("accepts %j", (a) => {
    expect(parse(action, a)).toEqual(a);
  });
  it("drops unknown keys and rejects unknown or malformed actions", () => {
    expect(parse(action, { type: "start", extra: 1 })).toEqual({ type: "start" });
    invalid(action, { type: "nope" });
    invalid(action, { type: "setProblem", problem: { ...PROBLEM, url: "x" } });
    invalid(action, { type: "setSettings", settings: { readMs: "0" } });
    invalid(action, { type: "setSettings" });
    invalid(action, { type: "declareTags", tags: "a" });
    invalid(action, { type: "declareTags", tags: [""] });
    invalid(action, { type: "declareTags", tags: [" ", " "] });
    expect(parse(action, { type: "declareTags", tags: [" dp "] })).toEqual({ type: "declareTags", tags: ["dp"] });
    invalid(action, { type: "revealHint", index: -1, text: "h" });
    invalid(action, { type: "revealHint", index: 0.5, text: "h" });
    invalid(action, { type: "revealHint", index: 0 });
    invalid(action, { type: "revealHint", index: 0, text: "" });
    invalid(action, { type: "revealHint", index: 0, text: " \t" });
    invalid(action, { type: "revealHint", index: 0, text: "h".repeat(2001) });
    expect(parse(action, { type: "revealHint", index: 0, text: " as said " })).toEqual({ type: "revealHint", index: 0, text: "as said" });
    invalid(action, { type: "declareBound", text: "" });
    invalid(action, { type: "declareBound", text: "   " });
    invalid(action, { type: "declareBound", text: "b".repeat(2001) });
    invalid(action, { type: "submit", verdict: "maybe" });
    invalid(action, { type: "submit", verdict: "rejected", category: "bad", failingCase: "[]" });
    invalid(action, { type: "submit", verdict: "rejected", category: "wrong-answer", failingCase: "" });
    invalid(action, { type: "submit", verdict: "rejected", category: "compile-error", failingCase: " \t" });
    invalid(action, { type: "submit", verdict: "rejected", category: "wrong-answer", failingCase: "f".repeat(5001) });
    invalid(action, { type: "vote", targetId: 3 });
    invalid(action, { type: "vote" });
    invalid(action, "tick");
  });
});

describe("bodies", () => {
  it("nameBody and actBody", () => {
    expect(parse(nameBody, { name: " Ada " })).toEqual({ name: "Ada" });
    expect(parse(nameBody, {})).toEqual({});
    invalid(nameBody, { name: "   " });
    expect(parse(actBody, { token: TOKEN, action: { type: "tick" } })).toEqual({ token: TOKEN, action: { type: "tick" } });
    invalid(actBody, { token: "short", action: { type: "tick" } });
    invalid(actBody, { token: TOKEN });
  });
});

describe("roomState", () => {
  const state: RoomState = {
    code: "ABCDE",
    hostId: "p0",
    phase: "reveal",
    players: [
      { id: "p0", name: "P0", token: TOKEN, userId: null, username: null, look: null, seats: ["runner", "oracle"], isImposter: true, ejected: false, freezeUsed: true, joinedAt: 1 },
    ],
    problem: PROBLEM,
    settings: DEFAULT_SETTINGS,
    clock: { phaseStartedAt: 1, buildElapsedMs: 2, buildRunningSince: null },
    cards: [
      { id: "c1", playerId: "p0", seat: "tagger", at: 3, card: { kind: "tags", tags: ["a"] } },
      { id: "c2", playerId: "p0", seat: "oracle", at: 4, card: { kind: "hint", index: 0, text: "h" } },
      { id: "c3", playerId: "p0", seat: "bounds", at: 5, card: { kind: "bound", text: "b" } },
      { id: "c4", playerId: "p0", seat: "runner", at: 6, card: { kind: "report", category: "time-limit", failingCase: "big" } },
    ],
    submissions: [{ n: 1, at: 7, verdict: "rejected" }],
    votes: [
      {
        kind: "freeze",
        calledBy: "p0",
        startedAt: 8,
        discussionMs: 9,
        voteMs: 10,
        votes: [{ voterId: "p0", targetId: null }],
        result: { ejectedId: null, resolvedAt: 11 },
      },
      { kind: "final", calledBy: null, startedAt: 12, discussionMs: 13, voteMs: 14, votes: [], result: null },
    ],
    outcome: { winner: "imposter", reason: "time" },
    createdAt: 0,
  };
  it("round-trips a full state and a bare lobby", () => {
    expect(parse(roomState, JSON.parse(JSON.stringify(state)))).toEqual(state);
    const lobby: RoomState = { ...state, phase: "lobby", problem: null, cards: [], submissions: [], votes: [], outcome: null };
    expect(parse(roomState, lobby)).toEqual(lobby);
  });
  it("rejects corrupt rows", () => {
    invalid(roomState, {});
    invalid(roomState, { ...state, phase: "limbo" });
    invalid(roomState, { ...state, players: [{ ...state.players[0], seats: ["jester"] }] });
    invalid(roomState, { ...state, cards: [{ ...state.cards[0], card: { kind: "joker" } }] });
    invalid(roomState, { ...state, outcome: { winner: "nobody", reason: "time" } });
  });
});
