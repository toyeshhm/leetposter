import { expect } from "vitest";
import { GameError } from "@/game/errors";
import { apply } from "@/game/reducer";
import { DEFAULT_SETTINGS } from "@/game/types";
import type { Action, ActionContext, GameErrorCode, Player, Problem, RoomState, Seat } from "@/game/types";

/** Shared fixtures for the reducer tests (reducer.test.ts, reducer.votes.test.ts). */

export function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export const T0 = 1_700_000_000_000;
export const MIN = 60_000;
export const T_BUILD = T0 + DEFAULT_SETTINGS.readMs;

export const PROBLEM: Problem = {
  title: "Two Sum",
  url: "https://example.test/two-sum",
  statement: "Find two numbers that add up to target.",
  examples: "[2,7,11,15], 9 -> [0,1]",
  tags: ["array", "hash-table"],
  hints: ["Try a map.", "One pass."],
  constraints: "2 <= n <= 1e4",
};

export function player(i: number): Player {
  return {
    id: `p${String(i)}`,
    name: `P${String(i)}`,
    token: `t${String(i)}`,
    seats: [],
    isImposter: false,
    ejected: false,
    freezeUsed: false,
    joinedAt: T0 + i,
  };
}

export function lobby(n: number): RoomState {
  return {
    code: "ABCDE",
    hostId: "p0",
    phase: "lobby",
    players: Array.from({ length: n }, (_, i) => player(i)),
    problem: null,
    settings: DEFAULT_SETTINGS,
    clock: { phaseStartedAt: T0, buildElapsedMs: 0, buildRunningSince: null },
    cards: [],
    submissions: [],
    votes: [],
    outcome: null,
    createdAt: T0,
  };
}

let nextId = 0;
export function ctx(actorId: string, now: number, random: () => number = lcg(1)): ActionContext {
  return { actorId, now, random, newId: () => `card${String(++nextId)}` };
}

export function act(state: RoomState, actorId: string, now: number, action: Action, random?: () => number): RoomState {
  return apply(state, action, ctx(actorId, now, random));
}

export function tickAt(state: RoomState, now: number): RoomState {
  return act(state, "p0", now, { type: "tick" });
}

export function fails(code: GameErrorCode, fn: () => unknown): void {
  let caught: unknown = null;
  try {
    fn();
  } catch (e: unknown) {
    caught = e;
  }
  if (!(caught instanceof GameError)) throw new Error(`expected GameError(${code}), got ${String(caught)}`);
  expect(caught.code).toBe(code);
}

export function started(n = 5, seed = 1): RoomState {
  const withProblem = act(lobby(n), "p0", T0, { type: "setProblem", problem: PROBLEM });
  return act(withProblem, "p0", T0, { type: "start" }, lcg(seed));
}

export function building(n = 5, seed = 1): RoomState {
  return tickAt(started(n, seed), T_BUILD);
}

export function holder(state: RoomState, seat: Seat): Player {
  const p = state.players.find((x) => !x.ejected && x.seats.includes(seat));
  if (p === undefined) throw new Error(`no ${seat}`);
  return p;
}

export function imposter(state: RoomState): Player {
  const p = state.players.find((x) => x.isImposter);
  if (p === undefined) throw new Error("no imposter");
  return p;
}

export function crew(state: RoomState): Player[] {
  return state.players.filter((p) => !p.isImposter && !p.ejected);
}

export function active(state: RoomState): Player[] {
  return state.players.filter((p) => !p.ejected);
}

/** Every active player votes for `targetId` (or skips); returns the resolved state. */
export function everyoneVotes(state: RoomState, targetId: string | null, now: number): RoomState {
  return active(state).reduce((s, p) => act(s, p.id, now, { type: "vote", targetId }), state);
}

export function rejected(failingCase: string): Action {
  return { type: "submit", verdict: "rejected", category: "wrong-answer", failingCase };
}

/** A building state with `pred` true, found by scanning seeds so tests never depend on one dealer roll. */
export function buildingWhere(pred: (s: RoomState) => boolean, n = 5): RoomState {
  for (let seed = 1; seed < 100; seed++) {
    const s = building(n, seed);
    if (pred(s)) return s;
  }
  throw new Error("no seed satisfies predicate");
}
