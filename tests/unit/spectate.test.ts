import { describe, expect, it } from "vitest";
import { spectate } from "@/game/spectate";
import { DEFAULT_SETTINGS } from "@/game/types";
import type { RoomState } from "@/game/types";
import { MIN, PROBLEM, T0, T_BUILD, act, active, building, everyoneVotes, holder, imposter, lobby, rejected, started, tickAt } from "./fixtures";

/** Every player's secrets, joined so one `not.toContain` covers them all. */
function secrets(state: RoomState): string[] {
  return state.players.map((p) => p.token);
}

function withFreeze(): RoomState {
  const s = tickAt(building(), T_BUILD + 3 * MIN);
  return act(s, "p1", T_BUILD + 3 * MIN, { type: "callFreeze" });
}

function withReveal(): RoomState {
  const s = building();
  return act(s, holder(s, "runner").id, T_BUILD + MIN, { type: "submit", verdict: "accepted" });
}

describe("spectate", () => {
  it("shows nothing but the roster in an empty lobby, and never a token", () => {
    const v = spectate(lobby(3), T0);
    expect(v).toMatchObject({ code: "ABCDE", phase: "lobby", problem: null, outcome: null, reveal: null, activeVote: null, votes: [] });
    expect(v.panel).toEqual({ tags: null, hints: null, constraints: null, title: null, url: null });
    expect(v.players.map((p) => p.isHost)).toEqual([true, false, false]);
    expect(v.players.every((p) => p.isImposter === null)).toBe(true);
    expect(v.clock).toEqual({ serverNow: T0, phaseEndsAt: null, buildRemainingMs: DEFAULT_SETTINGS.buildMs, buildPaused: true });
    expect(v.submissionsLeft).toBe(DEFAULT_SETTINGS.maxSubmissions);
    const json = JSON.stringify(v);
    for (const token of secrets(lobby(3))) expect(json).not.toContain(token);
    expect(json).not.toContain("token");
  });

  it("opens every seat panel once the problem is set, with the rating when there is one", () => {
    const withProblem = act(lobby(2), "p0", T0, { type: "setProblem", problem: { ...PROBLEM, rating: 1500, bankId: "two-sum" } });
    const v = spectate(withProblem, T0);
    expect(v.panel).toEqual({ tags: PROBLEM.tags, hints: PROBLEM.hints, constraints: PROBLEM.constraints, title: PROBLEM.title, url: PROBLEM.url });
    expect(v.problem).toEqual({ statement: PROBLEM.statement, tagCount: 2, hintCount: 2, rating: 1500, bankId: "two-sum" });
    expect(spectate(act(lobby(2), "p0", T0, { type: "setProblem", problem: PROBLEM }), T0).problem).toMatchObject({ rating: null, bankId: null });
  });

  it("hides the Changeling while reading and building, and runs the clock", () => {
    const reading = spectate(started(), T0 + MIN);
    expect(reading.phase).toBe("reading");
    expect(reading.clock.phaseEndsAt).toBe(T0 + DEFAULT_SETTINGS.readMs);
    expect(reading.players.every((p) => p.isImposter === null)).toBe(true);
    expect(reading.players.every((p) => p.seats.length === 1)).toBe(true);

    const work = spectate(building(), T_BUILD + MIN);
    expect(work.phase).toBe("building");
    expect(work.clock).toEqual({ serverNow: T_BUILD + MIN, phaseEndsAt: T_BUILD + DEFAULT_SETTINGS.buildMs, buildRemainingMs: DEFAULT_SETTINGS.buildMs - MIN, buildPaused: false });
    expect(JSON.stringify(work)).not.toContain('"isImposter":true');
    for (const token of secrets(building())) expect(JSON.stringify(work)).not.toContain(token);
  });

  it("keeps ballots hidden during a tribunal and shows them once it resolves", () => {
    const frozen = withFreeze();
    const at = T_BUILD + 3 * MIN;
    const v = spectate(frozen, at + 1000);
    expect(v.phase).toBe("freeze");
    expect(v.activeVote).toMatchObject({ kind: "freeze", calledBy: "p1", votedIds: [], votes: null, result: null });
    expect(v.clock.phaseEndsAt).toBe(v.activeVote?.voteEndsAt);
    expect(v.clock.buildPaused).toBe(true);

    const open = at + DEFAULT_SETTINGS.freezeDiscussionMs;
    const oneBallot = act(frozen, "p1", open, { type: "vote", targetId: null });
    const mid = spectate(oneBallot, open);
    expect(mid.activeVote?.votedIds).toEqual(["p1"]);
    expect(mid.activeVote?.votes).toBeNull();
    expect(JSON.stringify(mid)).not.toContain("targetId");

    const resolved = everyoneVotes(oneBallot, null, open);
    const after = spectate(resolved, open);
    expect(after.phase).toBe("building");
    expect(after.activeVote).toBeNull();
    expect(after.votes[0]?.votes).toHaveLength(active(resolved).length);
    expect(after.votes[0]?.result).toEqual({ ejectedId: null, resolvedAt: open });
  });

  it("has no deadline for a frozen row that lost its round", () => {
    expect(spectate({ ...withFreeze(), votes: [] }, T_BUILD).clock.phaseEndsAt).toBeNull();
  });

  it("points the clock at the final vote after the fourth rejection", () => {
    let s = building();
    const runner = holder(s, "runner").id;
    for (let n = 1; n <= 4; n++) s = act(s, runner, T_BUILD + n * 1000, rejected(`case ${String(n)}`));
    const v = spectate(s, T_BUILD + 5000);
    expect(v.phase).toBe("finalVote");
    expect(v.submissionsLeft).toBe(0);
    expect(v.submissions.map((x) => x.verdict)).toEqual(["rejected", "rejected", "rejected", "rejected"]);
    expect(v.cards.filter((c) => c.card.kind === "report")).toHaveLength(4);
    expect(v.activeVote?.kind).toBe("final");
    expect(v.clock.phaseEndsAt).toBe(v.activeVote?.voteEndsAt);
    expect(v.players.every((p) => p.isImposter === null)).toBe(true);
  });

  it("names the Changeling and hands over the full truth at the reveal", () => {
    const s = withReveal();
    const v = spectate(s, T_BUILD + 2 * MIN);
    expect(v.phase).toBe("reveal");
    expect(v.outcome).toEqual({ winner: "crew", reason: "accepted" });
    expect(v.clock.phaseEndsAt).toBeNull();
    expect(v.players.filter((p) => p.isImposter === true).map((p) => p.id)).toEqual([imposter(s).id]);
    expect(v.players.filter((p) => p.isImposter === false)).toHaveLength(s.players.length - 1);
    expect(v.reveal).toEqual({
      problem: PROBLEM,
      imposterIds: [imposter(s).id],
      players: s.players.map((p) => ({ id: p.id, seats: p.seats, isImposter: p.isImposter })),
    });
    for (const token of secrets(s)) expect(JSON.stringify(v)).not.toContain(token);
  });

  it("gives no reveal when a revealed row somehow has no problem", () => {
    const v = spectate({ ...withReveal(), problem: null }, T_BUILD);
    expect(v.reveal).toBeNull();
    expect(v.panel.tags).toBeNull();
  });
});
