import { describe, expect, it } from "vitest";
import { GameError } from "@/game/errors";
import { personalize } from "@/game/view";
import { DEFAULT_SETTINGS } from "@/game/types";
import type { Player, Problem, RoomState, VoteRound } from "@/game/types";

const problem: Problem = {
  title: "Two Sum",
  url: "https://example.com/two-sum",
  statement: "Find two numbers that add to target.",
  tags: ["array", "hash-table"],
  hints: ["hash", "one pass", "done"],
  constraints: "2 <= n <= 10^4",
};

function player(id: string, seats: Player["seats"], extra: Partial<Player> = {}): Player {
  return {
    id,
    name: id.toUpperCase(),
    token: `token-${id}`,
    userId: null,
    username: null,
    seats,
    isImposter: false,
    ejected: false,
    freezeUsed: false,
    joinedAt: 1_000,
    ...extra,
  };
}

const T0 = 1_000_000;

function makeState(extra: Partial<RoomState> = {}): RoomState {
  return {
    code: "ABCDE",
    hostId: "a",
    phase: "building",
    players: [
      player("a", ["tagger"]),
      player("b", ["oracle"], { isImposter: true }),
      player("c", ["bounds"]),
      player("d", ["runner"]),
    ],
    problem,
    settings: DEFAULT_SETTINGS,
    clock: { phaseStartedAt: T0, buildElapsedMs: 0, buildRunningSince: T0 },
    cards: [],
    submissions: [],
    votes: [],
    outcome: null,
    createdAt: 0,
    ...extra,
  };
}

function round(extra: Partial<VoteRound> = {}): VoteRound {
  return {
    kind: "freeze",
    calledBy: "a",
    startedAt: T0 + 5 * 60_000,
    discussionMs: 90_000,
    voteMs: 15_000,
    votes: [{ voterId: "a", targetId: "b" }],
    result: null,
    ...extra,
  };
}

describe("personalize", () => {
  it("throws not-found for a stranger", () => {
    expect(() => personalize(makeState(), "zzz", T0)).toThrow(GameError);
    expect(() => personalize(makeState(), "zzz", T0)).toThrow(/not in hall ABCDE/);
  });

  it("never mutates the state", () => {
    const state = makeState();
    const snapshot = JSON.stringify(state);
    personalize(state, "b", T0 + 1);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("leaks no tokens and no other player's imposter flag to crew mid-game", () => {
    const state = makeState({ cards: [{ id: "c1", playerId: "b", seat: "oracle", at: T0, card: { kind: "hint", index: 0, text: "x" } }] });
    const json = JSON.stringify(personalize(state, "a", T0 + 1));
    for (const p of state.players) expect(json).not.toContain(p.token);
    expect(json).not.toContain('"isImposter":true');
    expect(json).not.toContain("token");
  });

  it("shows an account player's username to everyone but never the user id", () => {
    const state = makeState({ players: [player("a", ["tagger"], { userId: "11111111-2222-3333-4444-555555555555", username: "ada_l" }), player("b", ["oracle"])] });
    const view = personalize(state, "b", T0);
    expect(view.players.map((p) => p.username)).toEqual(["ada_l", null]);
    const json = JSON.stringify(view);
    expect(json).not.toContain("11111111-2222-3333-4444-555555555555");
    expect(json).not.toContain("userId");
  });

  it("shows crew only their own imposter flag and panel", () => {
    const view = personalize(makeState(), "a", T0 + 1);
    expect(view.me).toEqual({ id: "a", seats: ["tagger"], isImposter: false, isHost: true, ejected: false, freezeUsed: false });
    expect(view.players.map((p) => p.isImposter)).toEqual([false, null, null, null]);
    expect(view.players.map((p) => p.isHost)).toEqual([true, false, false, false]);
    expect(view.panel).toEqual({ tags: problem.tags, hints: null, constraints: null, title: null, url: null });
    expect(view.problem).toEqual({ statement: problem.statement, tagCount: 2, hintCount: 3, rating: null, bankId: null });
    expect(view.problemReady).toBe(true);
    expect(view.reveal).toBeNull();
  });

  it("shows a solo host, who holds every seat, all four panels", () => {
    const solo = makeState({ players: [player("a", ["tagger", "oracle", "bounds", "runner"], { isImposter: true })] });
    expect(personalize(solo, "a", T0).panel).toEqual({ tags: problem.tags, hints: problem.hints, constraints: problem.constraints, title: problem.title, url: problem.url });
  });

  it("gives each seat its own panel slice", () => {
    expect(personalize(makeState(), "c", T0).panel).toEqual({ tags: null, hints: null, constraints: problem.constraints, title: null, url: null });
    expect(personalize(makeState(), "d", T0).panel).toEqual({ tags: null, hints: null, constraints: null, title: problem.title, url: problem.url });
  });

  it("gives the imposter only the panel of the seat they hold, and no other seat's secrets", () => {
    const view = personalize(makeState(), "b", T0);
    expect(view.me.isImposter).toBe(true);
    expect(view.me.isHost).toBe(false);
    expect(view.players.map((p) => p.isImposter)).toEqual([false, true, false, false]);
    expect(view.panel).toEqual({ tags: null, hints: problem.hints, constraints: null, title: null, url: null });
    const json = JSON.stringify(view);
    for (const tag of problem.tags) expect(json).not.toContain(tag);
    expect(json).not.toContain(problem.constraints);
    expect(json).not.toContain(problem.title);
    expect(json).not.toContain(problem.url);
  });

  it("hides everything before the problem is set", () => {
    const view = personalize(makeState({ phase: "lobby", problem: null, clock: { phaseStartedAt: T0, buildElapsedMs: 0, buildRunningSince: null } }), "b", T0);
    expect(view.problem).toBeNull();
    expect(view.problemReady).toBe(false);
    expect(view.panel).toEqual({ tags: null, hints: null, constraints: null, title: null, url: null });
    expect(view.clock).toEqual({ serverNow: T0, phaseEndsAt: null, buildRemainingMs: DEFAULT_SETTINGS.buildMs, buildPaused: true });
    expect(view.canCallFreeze).toBe(false);
    expect(view.canSubmit).toBe(false);
  });

  it("shows the full truth at reveal", () => {
    const outcome = { winner: "crew", reason: "imposter-ejected" } as const;
    const view = personalize(makeState({ phase: "reveal", outcome }), "a", T0);
    expect(view.players.map((p) => p.isImposter)).toEqual([false, true, false, false]);
    expect(view.panel.hints).toEqual(problem.hints);
    expect(view.panel.url).toBe(problem.url);
    expect(view.outcome).toEqual(outcome);
    expect(view.clock.phaseEndsAt).toBeNull();
    expect(view.reveal).toEqual({
      problem,
      imposterIds: ["b"],
      players: [
        { id: "a", seats: ["tagger"], isImposter: false },
        { id: "b", seats: ["oracle"], isImposter: true },
        { id: "c", seats: ["bounds"], isImposter: false },
        { id: "d", seats: ["runner"], isImposter: false },
      ],
    });
  });

  it("has no reveal block when a reveal-phase state somehow lacks a problem", () => {
    expect(personalize(makeState({ phase: "reveal", problem: null }), "a", T0).reveal).toBeNull();
  });

  it("computes the reading deadline", () => {
    const view = personalize(makeState({ phase: "reading", clock: { phaseStartedAt: T0, buildElapsedMs: 0, buildRunningSince: null } }), "a", T0 + 10);
    expect(view.clock).toEqual({ serverNow: T0 + 10, phaseEndsAt: T0 + DEFAULT_SETTINGS.readMs, buildRemainingMs: DEFAULT_SETTINGS.buildMs, buildPaused: true });
  });

  it("computes the running build clock and clamps at zero", () => {
    const now = T0 + 10 * 60_000;
    const view = personalize(makeState({ clock: { phaseStartedAt: T0, buildElapsedMs: 60_000, buildRunningSince: T0 } }), "a", now);
    expect(view.clock).toEqual({ serverNow: now, phaseEndsAt: now + 29 * 60_000, buildRemainingMs: 29 * 60_000, buildPaused: false });

    const late = personalize(makeState(), "a", T0 + 2 * DEFAULT_SETTINGS.buildMs);
    expect(late.clock.buildRemainingMs).toBe(0);
    expect(late.clock.phaseEndsAt).toBe(T0 + 2 * DEFAULT_SETTINGS.buildMs);
  });

  it("reports a paused build clock during a freeze and points phaseEndsAt at the vote deadline", () => {
    const r = round();
    const view = personalize(
      makeState({ phase: "freeze", votes: [r], clock: { phaseStartedAt: r.startedAt, buildElapsedMs: 5 * 60_000, buildRunningSince: null } }),
      "c",
      r.startedAt + 1,
    );
    expect(view.clock).toEqual({ serverNow: r.startedAt + 1, phaseEndsAt: r.startedAt + 105_000, buildRemainingMs: 35 * 60_000, buildPaused: true });
    expect(view.activeVote).toEqual({
      kind: "freeze",
      calledBy: "a",
      startedAt: r.startedAt,
      discussionEndsAt: r.startedAt + 90_000,
      voteEndsAt: r.startedAt + 105_000,
      votedIds: ["a"],
      votes: null,
      result: null,
    });
    expect(view.votes).toEqual([view.activeVote]);
    expect(view.canCallFreeze).toBe(false);
  });

  it("has a null deadline in a vote phase with no open round", () => {
    const resolved = round({ result: { ejectedId: null, resolvedAt: T0 } });
    const view = personalize(makeState({ phase: "finalVote", votes: [resolved] }), "a", T0);
    expect(view.clock.phaseEndsAt).toBeNull();
    expect(view.activeVote).toBeNull();
    expect(personalize(makeState({ phase: "finalVote" }), "a", T0).activeVote).toBeNull();
  });

  it("reveals ballots only once a round resolves", () => {
    const resolved = round({ result: { ejectedId: "b", resolvedAt: T0 + 6 * 60_000 } });
    const open = round({ kind: "final", calledBy: null, startedAt: T0 + 20 * 60_000, discussionMs: 60_000, votes: [] });
    const view = personalize(makeState({ phase: "finalVote", votes: [resolved, open] }), "a", T0);
    expect(view.votes[0]?.votes).toEqual(resolved.votes);
    expect(view.votes[0]?.result).toEqual(resolved.result);
    expect(view.votes[1]?.votes).toBeNull();
    expect(view.votes[1]?.votedIds).toEqual([]);
    expect(view.activeVote).toEqual(view.votes[1]);
  });

  it("passes cards, submissions and submissionsLeft through", () => {
    const submissions = [{ n: 1, at: T0, verdict: "rejected" as const }];
    const cards = [{ id: "c1", playerId: "d", seat: "runner" as const, at: T0, card: { kind: "report" as const, category: "wrong-answer" as const, failingCase: "[]" } }];
    const view = personalize(makeState({ submissions, cards }), "d", T0);
    expect(view.cards).toEqual(cards);
    expect(view.submissions).toEqual(submissions);
    expect(view.submissionsLeft).toBe(3);
  });

  describe("canCallFreeze", () => {
    const opensAt = T0 + DEFAULT_SETTINGS.freezeOpensAfterMs;
    const closesAt = T0 + DEFAULT_SETTINGS.buildMs - DEFAULT_SETTINGS.freezeClosesBeforeEndMs;

    it("opens exactly at the window and closes exactly at its end", () => {
      expect(personalize(makeState(), "a", opensAt - 1).canCallFreeze).toBe(false);
      expect(personalize(makeState(), "a", opensAt).canCallFreeze).toBe(true);
      expect(personalize(makeState(), "a", closesAt).canCallFreeze).toBe(true);
      expect(personalize(makeState(), "a", closesAt + 1).canCallFreeze).toBe(false);
    });

    it("is refused to ejected players and repeat callers", () => {
      const ejected = makeState({ players: [player("a", ["tagger"], { ejected: true }), player("b", ["oracle"])] });
      expect(personalize(ejected, "a", opensAt).canCallFreeze).toBe(false);
      const used = makeState({ players: [player("a", ["tagger"], { freezeUsed: true }), player("b", ["oracle"])] });
      expect(personalize(used, "a", opensAt).canCallFreeze).toBe(false);
    });
  });

  describe("canSubmit", () => {
    it("is only for an un-ejected runner with submissions left", () => {
      expect(personalize(makeState(), "d", T0).canSubmit).toBe(true);
      expect(personalize(makeState(), "a", T0).canSubmit).toBe(false);
      const spent = makeState({ submissions: [1, 2, 3, 4].map((n) => ({ n, at: T0, verdict: "rejected" as const })) });
      expect(personalize(spent, "d", T0).canSubmit).toBe(false);
      expect(personalize(spent, "d", T0).submissionsLeft).toBe(0);
      const ejected = makeState({ players: [player("d", ["runner"], { ejected: true }), player("a", ["tagger", "runner"])] });
      expect(personalize(ejected, "d", T0).canSubmit).toBe(false);
      expect(personalize(ejected, "a", T0).canSubmit).toBe(true);
    });
  });
});
