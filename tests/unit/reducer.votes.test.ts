import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/game/types";
import type { RoomState } from "@/game/types";
import { MIN, T_BUILD, act, active, building, buildingWhere, crew, everyoneVotes, fails, holder, imposter, rejected, tickAt } from "./fixtures";

const { buildMs, freezeDiscussionMs, freezeVoteMs, finalDiscussionMs, finalVoteMs } = DEFAULT_SETTINGS;
const FREEZE_WINDOW = freezeDiscussionMs + freezeVoteMs;
const FINAL_WINDOW = finalDiscussionMs + finalVoteMs;

describe("freeze", () => {
  const OPEN = T_BUILD + DEFAULT_SETTINGS.freezeOpensAfterMs;
  /** Ballots for a freeze called at OPEN open once its discussion ends. */
  const BALLOT = OPEN + freezeDiscussionMs;

  it("is only available inside the window and once per player", () => {
    const s = building();
    fails("freeze-unavailable", () => act(s, "p0", OPEN - 1, { type: "callFreeze" }));
    fails("freeze-unavailable", () => act(s, "p0", T_BUILD + buildMs - DEFAULT_SETTINGS.freezeClosesBeforeEndMs + 1, { type: "callFreeze" }));
    const f = act(s, "p0", OPEN, { type: "callFreeze" });
    expect(f.phase).toBe("freeze");
    expect(f.clock).toEqual({ phaseStartedAt: OPEN, buildElapsedMs: 3 * MIN, buildRunningSince: null });
    expect(f.votes).toEqual([
      { kind: "freeze", calledBy: "p0", startedAt: OPEN, discussionMs: freezeDiscussionMs, voteMs: freezeVoteMs, votes: [], result: null },
    ]);
    expect(f.players.find((p) => p.id === "p0")?.freezeUsed).toBe(true);
    fails("wrong-phase", () => act(f, "p1", OPEN + 1, { type: "callFreeze" }));
    const back = tickAt(f, OPEN + FREEZE_WINDOW);
    expect(back.phase).toBe("building");
    fails("freeze-unavailable", () => act(back, "p0", OPEN + FREEZE_WINDOW + 1, { type: "callFreeze" }));
    expect(act(back, "p1", OPEN + FREEZE_WINDOW + 1, { type: "callFreeze" }).phase).toBe("freeze");
  });

  it("takes no ballot while the discussion is still open", () => {
    const s = act(building(), "p0", OPEN, { type: "callFreeze" });
    fails("wrong-phase", () => act(s, "p0", OPEN + 1, { type: "vote", targetId: null }));
    fails("wrong-phase", () => act(s, "p0", BALLOT - 1, { type: "vote", targetId: "p1" }));
    expect(act(s, "p0", BALLOT, { type: "vote", targetId: "p1" }).votes[0]?.votes).toEqual([{ voterId: "p0", targetId: "p1" }]);
    const f = tickAt(building(), T_BUILD + buildMs);
    fails("wrong-phase", () => act(f, "p0", T_BUILD + buildMs + finalDiscussionMs - 1, { type: "vote", targetId: "p1" }));
    expect(act(f, "p0", T_BUILD + buildMs + finalDiscussionMs, { type: "vote", targetId: "p1" }).votes[0]?.votes).toHaveLength(1);
  });

  it("nobody is ejected on a tie or when skip leads; ballots can be replaced", () => {
    const s = act(building(), "p0", OPEN, { type: "callFreeze" });
    const [a, b, c, d, e] = s.players.map((p) => p.id);
    if (!a || !b || !c || !d || !e) throw new Error("players");
    let v = act(s, a, BALLOT + 1, { type: "vote", targetId: b });
    v = act(v, a, BALLOT + 2, { type: "vote", targetId: c });
    v = act(v, b, BALLOT + 3, { type: "vote", targetId: c });
    v = act(v, c, BALLOT + 4, { type: "vote", targetId: null });
    expect(v.phase).toBe("freeze");
    const round = v.votes[0];
    expect(round?.votes).toEqual([
      { voterId: a, targetId: c },
      { voterId: b, targetId: c },
      { voterId: c, targetId: null },
    ]);
    // c has 2, skip has 1 explicit + 2 non-voters = 3 -> nobody. Resolve on the deadline.
    const r = tickAt(v, OPEN + FREEZE_WINDOW + 30_000);
    expect(r.phase).toBe("building");
    expect(r.votes[0]?.result).toEqual({ ejectedId: null, resolvedAt: OPEN + FREEZE_WINDOW });
    expect(r.clock).toEqual({ phaseStartedAt: OPEN + FREEZE_WINDOW, buildElapsedMs: 3 * MIN, buildRunningSince: OPEN + FREEZE_WINDOW });
    expect(r.players.every((p) => !p.ejected)).toBe(true);

    // Exact tie between two players resolves to nobody when everyone has voted.
    let t = act(s, a, BALLOT + 1, { type: "vote", targetId: b });
    t = act(t, b, BALLOT + 1, { type: "vote", targetId: b });
    t = act(t, c, BALLOT + 1, { type: "vote", targetId: d });
    t = act(t, d, BALLOT + 1, { type: "vote", targetId: d });
    t = act(t, e, BALLOT + 1, { type: "vote", targetId: e });
    expect(t.phase).toBe("building");
    expect(t.votes[0]?.result).toEqual({ ejectedId: null, resolvedAt: BALLOT + 1 });
  });

  it("vote validation", () => {
    const s = act(building(), "p0", OPEN, { type: "callFreeze" });
    fails("invalid", () => act(s, "p0", BALLOT + 1, { type: "vote", targetId: "ghost" }));
    fails("unauthorized", () => act(s, "ghost", BALLOT + 1, { type: "vote", targetId: "p0" }));
    expect(act(s, "p0", BALLOT + 1, { type: "vote", targetId: "p0" }).votes[0]?.votes).toEqual([{ voterId: "p0", targetId: "p0" }]);
    fails("wrong-phase", () => act(s, "p1", BALLOT + 1, { type: "declareBound", text: "x" }));
  });

  it("ejects a crew runner and moves the runner seat to a random survivor", () => {
    const s = buildingWhere((b) => !holder(b, "runner").isImposter);
    const runner = holder(s, "runner");
    const f = act(s, runner.id, OPEN, { type: "callFreeze" });
    const r = everyoneVotes(f, runner.id, BALLOT + 10);
    expect(r.phase).toBe("building");
    expect(r.votes[0]?.result).toEqual({ ejectedId: runner.id, resolvedAt: BALLOT + 10 });
    const out = r.players.find((p) => p.id === runner.id);
    expect(out?.ejected).toBe(true);
    expect(out?.seats).toEqual([]);
    const heirs = r.players.filter((p) => p.seats.includes("runner"));
    expect(heirs).toHaveLength(1);
    expect(heirs[0]?.ejected).toBe(false);
    expect(heirs[0]?.seats).toHaveLength(2);
    expect(r.clock.buildRunningSince).toBe(BALLOT + 10);
    expect(s.players.find((p) => p.id === runner.id)?.ejected).toBe(false);
    fails("ejected", () => act(r, runner.id, BALLOT + 11, { type: "vote", targetId: null }));
    fails("ejected", () => act(r, runner.id, BALLOT + 11, { type: "callFreeze" }));
    expect(tickAt(r, BALLOT + 11)).toBe(r);
    // An ejected player is not a legal target in a later round.
    const caller = active(r).find((p) => !p.freezeUsed);
    if (!caller) throw new Error("caller");
    const f2 = act(r, caller.id, OPEN + 4 * MIN, { type: "callFreeze" });
    fails("invalid", () => act(f2, caller.id, OPEN + 4 * MIN + freezeDiscussionMs + 1, { type: "vote", targetId: runner.id }));
  });

  it("ejects a non-runner crewmate, who keeps their seat, without touching the runner seat", () => {
    const s = buildingWhere((b) => crew(b).some((p) => !p.seats.includes("runner")));
    const victim = crew(s).find((p) => !p.seats.includes("runner"));
    if (!victim) throw new Error("victim");
    const r = everyoneVotes(act(s, "p0", OPEN, { type: "callFreeze" }), victim.id, BALLOT + 5);
    expect(r.phase).toBe("building");
    expect(r.players.find((p) => p.id === victim.id)).toMatchObject({ ejected: true, seats: victim.seats });
    expect(holder(r, "runner").id).toBe(holder(s, "runner").id);
    expect(r.players.filter((p) => p.seats.includes("runner"))).toHaveLength(1);
    // A later round has one fewer eligible voter: 4 ballots resolve it.
    const caller = active(r).find((p) => !p.freezeUsed);
    if (!caller) throw new Error("caller");
    const f2 = act(r, caller.id, OPEN + 5 * MIN, { type: "callFreeze" });
    expect(active(f2)).toHaveLength(4);
    expect(everyoneVotes(f2, null, OPEN + 5 * MIN + freezeDiscussionMs + 1).phase).toBe("building");
  });

  it("ejecting the imposter ends the game", () => {
    const s = building();
    const r = everyoneVotes(act(s, "p0", OPEN, { type: "callFreeze" }), imposter(s).id, BALLOT + 5);
    expect(r.phase).toBe("reveal");
    expect(r.outcome).toEqual({ winner: "crew", reason: "imposter-ejected" });
    expect(r.players.find((p) => p.isImposter)?.ejected).toBe(true);
    expect(r.clock.buildRunningSince).toBeNull();
  });

  it("leaves the runner seat empty when nobody is left to inherit it (hand-built; the reducer cannot reach this)", () => {
    const s = building(4);
    const runner = holder(s, "runner");
    const others = s.players.filter((p) => p.id !== runner.id).map((p) => ({ ...p, ejected: true, isImposter: false }));
    const alone: RoomState = { ...s, players: [{ ...runner, isImposter: false }, ...others] };
    const r = act(act(alone, runner.id, OPEN, { type: "callFreeze" }), runner.id, BALLOT, { type: "vote", targetId: runner.id });
    expect(r.phase).toBe("building");
    expect(r.players.find((p) => p.id === runner.id)).toMatchObject({ ejected: true, seats: [] });
    expect(r.players.some((p) => p.seats.includes("runner"))).toBe(false);
  });
});

describe("clock", () => {
  it("build time excludes the pause, and the final vote starts at the exact boundary", () => {
    const s = building();
    const freezeAt = T_BUILD + 10 * MIN;
    const f = act(s, "p0", freezeAt, { type: "callFreeze" });
    const resumedAt = freezeAt + FREEZE_WINDOW;
    const b = tickAt(f, resumedAt + 1);
    expect(b.clock).toEqual({ phaseStartedAt: resumedAt, buildElapsedMs: 10 * MIN, buildRunningSince: resumedAt });
    const boundary = resumedAt + 30 * MIN;
    expect(tickAt(b, boundary - 1).phase).toBe("building");
    const fv = tickAt(b, boundary + 5_000);
    expect(fv.phase).toBe("finalVote");
    expect(fv.clock).toEqual({ phaseStartedAt: boundary, buildElapsedMs: buildMs, buildRunningSince: null });
    expect(fv.votes[1]).toEqual({ kind: "final", calledBy: null, startedAt: boundary, discussionMs: finalDiscussionMs, voteMs: finalVoteMs, votes: [], result: null });
    // One giant tick from building runs all the way through an unvoted final into reveal.
    const end = tickAt(b, boundary + 60 * MIN);
    expect(end.phase).toBe("reveal");
    expect(end.outcome).toEqual({ winner: "imposter", reason: "time" });
    expect(end.votes[1]?.result).toEqual({ ejectedId: null, resolvedAt: boundary + FINAL_WINDOW });
  });

  it("a tick from reading can land directly in the final vote", () => {
    const fv = tickAt(building(), T_BUILD + buildMs);
    expect(fv.phase).toBe("finalVote");
    expect(fv.votes[0]?.startedAt).toBe(T_BUILD + buildMs);
  });
});

describe("final vote", () => {
  function finalByTime(): RoomState {
    return tickAt(building(), T_BUILD + buildMs);
  }
  /** One millisecond into the final ballot. */
  const AT = T_BUILD + buildMs + finalDiscussionMs + 1;

  it("skip is illegal", () => {
    fails("invalid", () => act(finalByTime(), "p0", AT, { type: "vote", targetId: null }));
  });

  it("a tie lets the imposter win by time", () => {
    const s = finalByTime();
    const [a, b] = crew(s);
    if (!a || !b) throw new Error("crew");
    // 2 for a, 2 for b, the fifth player abstains: a tie among cast ballots.
    const ids = s.players.map((p) => p.id).slice(0, 4);
    const r = ids.reduce((st, id, i) => act(st, id, AT, { type: "vote", targetId: i < 2 ? a.id : b.id }), s);
    expect(r.phase).toBe("finalVote");
    const done = tickAt(r, T_BUILD + buildMs + FINAL_WINDOW);
    expect(done.phase).toBe("reveal");
    expect(done.outcome).toEqual({ winner: "imposter", reason: "time" });
    expect(done.players.every((p) => !p.ejected)).toBe(true);
  });

  it("ejecting a crewmate: imposter wins by final-vote", () => {
    const s = finalByTime();
    const victim = crew(s)[0];
    if (!victim) throw new Error("crew");
    const r = everyoneVotes(s, victim.id, AT);
    expect(r.phase).toBe("reveal");
    expect(r.outcome).toEqual({ winner: "imposter", reason: "final-vote" });
    expect(r.players.find((p) => p.id === victim.id)).toMatchObject({ ejected: true, seats: victim.seats });
    expect(r.votes[0]?.result).toEqual({ ejectedId: victim.id, resolvedAt: AT });
  });

  it("ejecting the imposter: crew win", () => {
    const s = finalByTime();
    const r = everyoneVotes(s, imposter(s).id, AT);
    expect(r.outcome).toEqual({ winner: "crew", reason: "imposter-ejected" });
  });

  it("after four rejections, an unresolved vote is an imposter win by submissions", () => {
    let s = building();
    const runner = holder(s, "runner").id;
    for (let i = 1; i <= 4; i++) s = act(s, runner, T_BUILD + i, rejected(`c${String(i)}`));
    const r = tickAt(s, T_BUILD + 4 + FINAL_WINDOW);
    expect(r.phase).toBe("reveal");
    expect(r.outcome).toEqual({ winner: "imposter", reason: "submissions" });
    expect(r.votes[0]?.result).toEqual({ ejectedId: null, resolvedAt: T_BUILD + 4 + FINAL_WINDOW });
    expect(r.clock.buildElapsedMs).toBe(4);
  });

  it("plurality among cast ballots ejects even if some abstain", () => {
    let s = building();
    const runner = holder(s, "runner").id;
    for (let i = 1; i <= 4; i++) s = act(s, runner, T_BUILD + i, rejected(`c${String(i)}`));
    const target = imposter(s).id;
    const open = T_BUILD + 4 + finalDiscussionMs + 1;
    const v = act(act(s, "p0", open, { type: "vote", targetId: target }), "p1", open, { type: "vote", targetId: target });
    const r = tickAt(v, T_BUILD + 4 + FINAL_WINDOW);
    expect(r.outcome).toEqual({ winner: "crew", reason: "imposter-ejected" });
  });
});
