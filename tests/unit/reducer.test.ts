import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/game/types";
import type { Action, RoomState } from "@/game/types";
import { MIN, PROBLEM, T0, T_BUILD, act, building, fails, holder, lcg, lobby, rejected, started, tickAt } from "./fixtures";

const { finalDiscussionMs, finalVoteMs } = DEFAULT_SETTINGS;

describe("lobby", () => {
  it("host sets the problem and settings, tick is a no-op", () => {
    const s0 = lobby(4);
    expect(tickAt(s0, T0 + MIN)).toBe(s0);
    const s1 = act(s0, "p0", T0, { type: "setProblem", problem: PROBLEM });
    expect(s1.problem).toEqual(PROBLEM);
    expect(s0.problem).toBeNull();
    const s2 = act(s1, "p0", T0, { type: "setSettings", settings: { readMs: 0, buildMs: 5 * MIN, maxSubmissions: 1 } });
    expect(s2.settings).toEqual({ ...DEFAULT_SETTINGS, readMs: 0, buildMs: 5 * MIN, maxSubmissions: 1 });
    const s3 = act(s2, "p0", T0, { type: "setSettings", settings: { buildMs: 120 * MIN } });
    expect(s3.settings).toEqual({ ...s2.settings, buildMs: 120 * MIN });
    expect(act(s3, "p0", T0, { type: "setSettings", settings: {} }).settings).toEqual(s3.settings);
  });

  it.each<Extract<Action, { type: "setSettings" }>["settings"]>([
    { readMs: -1 },
    { readMs: 30 * MIN + 1 },
    { readMs: Number.NaN },
    { buildMs: 5 * MIN - 1 },
    { buildMs: 120 * MIN + 1 },
    { maxSubmissions: 0 },
    { maxSubmissions: 11 },
    { maxSubmissions: 2.5 },
  ])("rejects settings %o", (settings) => {
    fails("invalid", () => act(lobby(4), "p0", T0, { type: "setSettings", settings }));
  });

  it("only the host may configure, only in the lobby", () => {
    fails("not-host", () => act(lobby(4), "p1", T0, { type: "setProblem", problem: PROBLEM }));
    fails("not-host", () => act(lobby(4), "p1", T0, { type: "setSettings", settings: {} }));
    fails("not-host", () => act(lobby(4), "p1", T0, { type: "start" }));
    const s = started();
    fails("wrong-phase", () => act(s, "p0", T0, { type: "setProblem", problem: PROBLEM }));
    fails("wrong-phase", () => act(s, "p0", T0, { type: "setSettings", settings: {} }));
    fails("wrong-phase", () => act(s, "p0", T0, { type: "start" }));
  });

  it("start needs a problem and 4..8 players", () => {
    fails("invalid", () => act(lobby(4), "p0", T0, { type: "start" }));
    const withProblem = (n: number): RoomState => act(lobby(n), "p0", T0, { type: "setProblem", problem: PROBLEM });
    fails("too-few-players", () => act(withProblem(3), "p0", T0, { type: "start" }));
    fails("room-full", () => act(withProblem(9), "p0", T0, { type: "start" }));
    const s = act(withProblem(8), "p0", T0 + 5, { type: "start" });
    expect(s.phase).toBe("reading");
    expect(s.clock).toEqual({ phaseStartedAt: T0 + 5, buildElapsedMs: 0, buildRunningSince: null });
    expect(s.players.filter((p) => p.isImposter)).toHaveLength(1);
    expect(s.players.every((p) => p.seats.length === 1)).toBe(true);
  });

  it("with a zero read timer, start answers with the building already open", () => {
    const l = act(act(lobby(4), "p0", T0, { type: "setProblem", problem: PROBLEM }), "p0", T0, { type: "setSettings", settings: { readMs: 0 } });
    const s = act(l, "p0", T0 + 5, { type: "start" });
    expect(s.phase).toBe("building");
    expect(s.clock).toEqual({ phaseStartedAt: T0 + 5, buildElapsedMs: 0, buildRunningSince: T0 + 5 });
  });

  it("unknown actors are rejected for every action, including tick", () => {
    fails("unauthorized", () => act(lobby(4), "ghost", T0, { type: "tick" }));
    fails("unauthorized", () => act(lobby(4), "ghost", T0, { type: "setProblem", problem: PROBLEM }));
  });
});

describe("reading -> building", () => {
  it("moves to building at exactly the read boundary and starts the build clock there", () => {
    const s = started();
    expect(tickAt(s, T_BUILD - 1).phase).toBe("reading");
    const b = tickAt(s, T_BUILD + 12_345);
    expect(b.phase).toBe("building");
    expect(b.clock).toEqual({ phaseStartedAt: T_BUILD, buildElapsedMs: 0, buildRunningSince: T_BUILD });
  });

  it("cards and submissions are wrong-phase while reading", () => {
    const s = started();
    fails("wrong-phase", () => act(s, holder(s, "tagger").id, T0, { type: "declareTags", tags: ["a", "b"] }));
    fails("wrong-phase", () => act(s, holder(s, "oracle").id, T0, { type: "revealHint", index: 0, text: "Try a map." }));
    fails("wrong-phase", () => act(s, holder(s, "bounds").id, T0, { type: "declareBound", text: "n" }));
    fails("wrong-phase", () => act(s, holder(s, "runner").id, T0, { type: "submit", verdict: "accepted" }));
    fails("wrong-phase", () => act(s, "p0", T0, { type: "callFreeze" }));
    fails("wrong-phase", () => act(s, "p0", T0, { type: "vote", targetId: null }));
  });

  it("a non-tick action applies tick first", () => {
    const s = started();
    const tagger = holder(s, "tagger");
    const b = act(s, tagger.id, T_BUILD + 1, { type: "declareTags", tags: ["x", "y"] });
    expect(b.phase).toBe("building");
    expect(b.cards).toHaveLength(1);
  });
});

describe("cards", () => {
  it("records tags, hints in order, and bounds", () => {
    let s = building();
    const tagger = holder(s, "tagger");
    const oracle = holder(s, "oracle");
    const bounds = holder(s, "bounds");
    s = act(s, tagger.id, T_BUILD + 1, { type: "declareTags", tags: ["lie", "graph"] });
    s = act(s, oracle.id, T_BUILD + 2, { type: "revealHint", index: 0, text: "Try a map." });
    s = act(s, oracle.id, T_BUILD + 3, { type: "revealHint", index: 1, text: "One pass." });
    s = act(s, bounds.id, T_BUILD + 4, { type: "declareBound", text: "n up to 1e4" });
    s = act(s, bounds.id, T_BUILD + 5, { type: "declareBound", text: "values fit int" });
    expect(s.cards.map((c) => c.card)).toEqual([
      { kind: "tags", tags: ["lie", "graph"] },
      { kind: "hint", index: 0, text: "Try a map." },
      { kind: "hint", index: 1, text: "One pass." },
      { kind: "bound", text: "n up to 1e4" },
      { kind: "bound", text: "values fit int" },
    ]);
    expect(s.cards.map((c) => c.seat)).toEqual(["tagger", "oracle", "oracle", "bounds", "bounds"]);
    expect(s.cards.map((c) => c.at)).toEqual([1, 2, 3, 4, 5].map((d) => T_BUILD + d));
    expect(new Set(s.cards.map((c) => c.id)).size).toBe(5);
    fails("already-played", () => act(s, tagger.id, T_BUILD + 6, { type: "declareTags", tags: ["a", "b"] }));
    fails("invalid", () => act(s, oracle.id, T_BUILD + 6, { type: "revealHint", index: 2, text: "Three." }));
  });

  it("a hint card stores what the Oracle said, trimmed, never empty", () => {
    const s = building();
    const oracle = holder(s, "oracle");
    const lied = act(s, oracle.id, T_BUILD, { type: "revealHint", index: 0, text: "  Sort it first.  " });
    expect(lied.cards.map((c) => c.card)).toEqual([{ kind: "hint", index: 0, text: "Sort it first." }]);
    fails("invalid", () => act(s, oracle.id, T_BUILD, { type: "revealHint", index: 0, text: " \n " }));
  });

  it("validates seat, tag count and hint order", () => {
    const s = building();
    const tagger = holder(s, "tagger");
    const oracle = holder(s, "oracle");
    const notTagger = s.players.find((p) => !p.seats.includes("tagger"));
    const notOracle = s.players.find((p) => !p.seats.includes("oracle"));
    const notBounds = s.players.find((p) => !p.seats.includes("bounds"));
    const notRunner = s.players.find((p) => !p.seats.includes("runner"));
    if (!notTagger || !notOracle || !notBounds || !notRunner) throw new Error("seat lookup");
    fails("not-your-seat", () => act(s, notTagger.id, T_BUILD, { type: "declareTags", tags: ["a", "b"] }));
    fails("not-your-seat", () => act(s, notOracle.id, T_BUILD, { type: "revealHint", index: 0, text: "Try a map." }));
    fails("not-your-seat", () => act(s, notBounds.id, T_BUILD, { type: "declareBound", text: "x" }));
    fails("not-your-seat", () => act(s, notRunner.id, T_BUILD, { type: "submit", verdict: "accepted" }));
    fails("invalid", () => act(s, tagger.id, T_BUILD, { type: "declareTags", tags: ["a"] }));
    fails("invalid", () => act(s, oracle.id, T_BUILD, { type: "revealHint", index: 1, text: "One pass." }));
  });

  it("each oracle has their own hint order", () => {
    const s = building(5);
    const oracles = s.players.filter((p) => p.seats.includes("oracle"));
    expect(oracles).toHaveLength(2);
    const [a, b] = oracles;
    if (!a || !b) throw new Error("oracles");
    let t = act(s, a.id, T_BUILD, { type: "revealHint", index: 0, text: "Try a map." });
    t = act(t, b.id, T_BUILD, { type: "revealHint", index: 0, text: "Try a map." });
    fails("invalid", () => act(t, a.id, T_BUILD, { type: "revealHint", index: 0, text: "Try a map." }));
    expect(act(t, a.id, T_BUILD, { type: "revealHint", index: 1, text: "One pass." }).cards).toHaveLength(3);
  });
});

describe("submissions", () => {
  it("accepted ends the game: crew win, build clock paused", () => {
    const s = building();
    const now = T_BUILD + 7 * MIN;
    const r = act(s, holder(s, "runner").id, now, { type: "submit", verdict: "accepted" });
    expect(r.phase).toBe("reveal");
    expect(r.outcome).toEqual({ winner: "crew", reason: "accepted" });
    expect(r.submissions).toEqual([{ n: 1, at: now, verdict: "accepted" }]);
    expect(r.clock).toEqual({ phaseStartedAt: now, buildElapsedMs: 7 * MIN, buildRunningSince: null });
    fails("wrong-phase", () => act(r, holder(s, "runner").id, now + 1, { type: "submit", verdict: "accepted" }));
    expect(tickAt(r, now + 3 * 60 * MIN)).toBe(r);
  });

  it("rejections add a report card; the last one starts the final vote", () => {
    let s = building();
    const runner = holder(s, "runner").id;
    s = act(s, runner, T_BUILD + 1, rejected("case 1"));
    s = act(s, runner, T_BUILD + 2, rejected("case 2"));
    s = act(s, runner, T_BUILD + 3, rejected("case 3"));
    expect(s.phase).toBe("building");
    expect(s.cards.map((c) => c.card)).toEqual([1, 2, 3].map((i) => ({ kind: "report", category: "wrong-answer", failingCase: `case ${String(i)}` })));
    expect(s.submissions.map((x) => x.n)).toEqual([1, 2, 3]);
    const f = act(s, runner, T_BUILD + 4, rejected("case 4"));
    expect(f.phase).toBe("finalVote");
    expect(f.submissions).toHaveLength(4);
    expect(f.clock).toEqual({ phaseStartedAt: T_BUILD + 4, buildElapsedMs: 4, buildRunningSince: null });
    expect(f.votes).toEqual([
      { kind: "final", calledBy: null, startedAt: T_BUILD + 4, discussionMs: finalDiscussionMs, voteMs: finalVoteMs, votes: [], result: null },
    ]);
    fails("wrong-phase", () => act(f, runner, T_BUILD + 5, rejected("case 5")));
  });

  it("no-submissions-left when the cap is reached with a smaller cap", () => {
    const l = act(act(lobby(4), "p0", T0, { type: "setProblem", problem: PROBLEM }), "p0", T0, { type: "setSettings", settings: { maxSubmissions: 1 } });
    const s = tickAt(act(l, "p0", T0, { type: "start" }, lcg(2)), T_BUILD);
    const runner = holder(s, "runner").id;
    const f = act(s, runner, T_BUILD + 1, rejected("x"));
    expect(f.phase).toBe("finalVote");
    // The last rejection always starts the final vote, so the guard only fires on a state that
    // somehow stayed in building at the cap. Hand-built on purpose: the reducer cannot produce it.
    fails("no-submissions-left", () => act({ ...f, phase: "building", clock: { ...f.clock, buildRunningSince: T_BUILD + 1 }, votes: [] }, runner, T_BUILD + 2, rejected("y")));
  });
});
