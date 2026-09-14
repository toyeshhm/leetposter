import { deal } from "./deal";
import { GameError } from "./errors";
import { MAX_PLAYERS } from "./types";
import type { Action, ActionContext, CardEntry, Player, Problem, RoomState, Seat, VoteRound } from "./types";
import { at, buildElapsed } from "./util";

/**
 * Pure game reducer. Returns a NEW state (never mutates). Throws GameError on any illegal action.
 * Time-based transitions (reading -> building, build clock expiry, vote windows) happen on
 * `tick`. Every action ticks first so state is never stale, and ticks again after so a change
 * that lands on a boundary (a zero read timer) is answered with the phase it opened.
 */
export function apply(state: RoomState, action: Action, ctx: ActionContext): RoomState {
  const s = tick(state, ctx.now, ctx.random);
  const actor = s.players.find((p) => p.id === ctx.actorId);
  if (actor === undefined) throw new GameError("unauthorized", "not a player in this hall");
  if (action.type === "tick") return s;
  if (actor.ejected) throw new GameError("ejected", "ejected players may not act");
  return tick(step(s, actor, action, ctx), ctx.now, ctx.random);
}

function step(s: RoomState, actor: Player, action: Exclude<Action, { type: "tick" }>, ctx: ActionContext): RoomState {
  switch (action.type) {
    case "setProblem":
      requireHostInLobby(s, actor);
      return { ...s, problem: action.problem };
    case "setSettings":
      requireHostInLobby(s, actor);
      return { ...s, settings: mergeSettings(s, action.settings) };
    case "start":
      return start(s, actor, ctx);
    case "declareTags": {
      requirePhase(s, "building");
      requireSeat(actor, "tagger");
      if (s.cards.some((c) => c.playerId === actor.id && c.card.kind === "tags")) {
        throw new GameError("already-played", "tags already declared");
      }
      const expected = requireProblem(s).tags.length;
      if (action.tags.length !== expected) throw new GameError("invalid", `declare exactly ${String(expected)} tags`);
      return withCard(s, actor, "tagger", { kind: "tags", tags: action.tags }, ctx);
    }
    case "revealHint": {
      requirePhase(s, "building");
      requireSeat(actor, "oracle");
      const hints = requireProblem(s).hints;
      if (action.index >= hints.length) throw new GameError("invalid", "no such hint");
      const revealed = s.cards.filter((c) => c.playerId === actor.id && c.card.kind === "hint").length;
      if (action.index !== revealed) throw new GameError("invalid", `next hint is ${String(revealed)}`);
      // The card records what the Oracle said, not the true hint; the reveal compares the two.
      const text = action.text.trim();
      if (text === "") throw new GameError("invalid", "a hint card needs text");
      return withCard(s, actor, "oracle", { kind: "hint", index: action.index, text }, ctx);
    }
    case "declareBound":
      requirePhase(s, "building");
      requireSeat(actor, "bounds");
      return withCard(s, actor, "bounds", { kind: "bound", text: action.text }, ctx);
    case "submit":
      return submit(s, actor, action, ctx);
    case "callFreeze":
      return callFreeze(s, actor, ctx);
    case "vote":
      return vote(s, actor, action.targetId, ctx);
  }
}

/** Advance every time-based transition up to `now`. Idempotent; returns the input when nothing changes. */
function tick(state: RoomState, now: number, random: () => number): RoomState {
  const { clock, settings } = state;
  switch (state.phase) {
    case "lobby":
    case "reveal":
      return state;
    case "reading": {
      const boundary = clock.phaseStartedAt + settings.readMs;
      if (now < boundary) return state;
      return tick(
        { ...state, phase: "building", clock: { phaseStartedAt: boundary, buildElapsedMs: 0, buildRunningSince: boundary } },
        now,
        random,
      );
    }
    case "building": {
      const elapsed = buildElapsed(clock, now);
      if (elapsed < settings.buildMs) return state;
      return tick(startFinal(state, now - (elapsed - settings.buildMs)), now, random);
    }
    case "freeze":
    case "finalVote": {
      const round = at(state.votes, state.votes.length - 1);
      const deadline = round.startedAt + round.discussionMs + round.voteMs;
      if (now < deadline) return state;
      return tick(resolveRound(state, deadline, random), now, random);
    }
  }
}

function start(s: RoomState, actor: Player, ctx: ActionContext): RoomState {
  requireHostInLobby(s, actor);
  requireProblem(s);
  if (s.players.length > MAX_PLAYERS) throw new GameError("room-full", `at most ${String(MAX_PLAYERS)} players`);
  return {
    ...s,
    phase: "reading",
    players: deal(s.players, ctx.random),
    clock: { phaseStartedAt: ctx.now, buildElapsedMs: 0, buildRunningSince: null },
  };
}

function submit(s: RoomState, actor: Player, action: Extract<Action, { type: "submit" }>, ctx: ActionContext): RoomState {
  requirePhase(s, "building");
  requireSeat(actor, "runner");
  if (s.submissions.length >= s.settings.maxSubmissions) throw new GameError("no-submissions-left", "no submissions left");
  const n = s.submissions.length + 1;
  const submissions = [...s.submissions, { n, at: ctx.now, verdict: action.verdict }];
  if (action.verdict === "accepted") {
    return { ...s, phase: "reveal", submissions, clock: pause(s, ctx.now), outcome: { winner: "crew", reason: "accepted" } };
  }
  const next = withCard(
    { ...s, submissions },
    actor,
    "runner",
    { kind: "report", category: action.category, failingCase: action.failingCase },
    ctx,
  );
  return n >= s.settings.maxSubmissions ? startFinal(next, ctx.now) : next;
}

function callFreeze(s: RoomState, actor: Player, ctx: ActionContext): RoomState {
  requirePhase(s, "building");
  if (actor.freezeUsed) throw new GameError("freeze-unavailable", "you already called a freeze");
  const elapsed = buildElapsed(s.clock, ctx.now);
  if (elapsed < s.settings.freezeOpensAfterMs || s.settings.buildMs - elapsed < s.settings.freezeClosesBeforeEndMs) {
    throw new GameError("freeze-unavailable", "freeze window is closed");
  }
  return {
    ...s,
    phase: "freeze",
    players: s.players.map((p) => (p.id === actor.id ? { ...p, freezeUsed: true } : p)),
    clock: pause(s, ctx.now),
    votes: [...s.votes, newRound("freeze", actor.id, ctx.now, s.settings.freezeDiscussionMs, s.settings.freezeVoteMs)],
  };
}

function vote(s: RoomState, actor: Player, targetId: string | null, ctx: ActionContext): RoomState {
  if (s.phase !== "freeze" && s.phase !== "finalVote") throw new GameError("wrong-phase", "no vote in progress");
  // Invariant: in freeze/finalVote the last round is unresolved (tick resolves expired rounds).
  const round = at(s.votes, s.votes.length - 1);
  if (ctx.now < round.startedAt + round.discussionMs) throw new GameError("wrong-phase", "ballots open when the discussion ends");
  if (targetId === null) {
    if (round.kind === "final") throw new GameError("invalid", "no skip in the final vote");
  } else if (!s.players.some((p) => p.id === targetId && !p.ejected)) {
    throw new GameError("invalid", "target is not an active player");
  }
  const votes = [...round.votes.filter((v) => v.voterId !== actor.id), { voterId: actor.id, targetId }];
  const next = { ...s, votes: [...s.votes.slice(0, -1), { ...round, votes }] };
  const eligible = s.players.filter((p) => !p.ejected).length;
  return votes.length === eligible ? resolveRound(next, ctx.now, ctx.random) : next;
}

function resolveRound(s: RoomState, resolvedAt: number, random: () => number): RoomState {
  const round = at(s.votes, s.votes.length - 1);
  const eligible = s.players.filter((p) => !p.ejected).length;
  const ejectedId = tally(round, eligible);
  const base: RoomState = {
    ...s,
    votes: [...s.votes.slice(0, -1), { ...round, result: { ejectedId, resolvedAt } }],
    clock: { ...s.clock, phaseStartedAt: resolvedAt },
  };
  const markEjected = (players: Player[]): Player[] => players.map((p) => (p.id === ejectedId ? { ...p, ejected: true } : p));
  if (s.players.some((p) => p.id === ejectedId && p.isImposter)) {
    return { ...base, phase: "reveal", players: markEjected(s.players), outcome: { winner: "crew", reason: "imposter-ejected" } };
  }
  if (round.kind === "final") {
    const reason = ejectedId !== null ? "final-vote" : s.submissions.length >= s.settings.maxSubmissions ? "submissions" : "time";
    return { ...base, phase: "reveal", players: markEjected(s.players), outcome: { winner: "imposter", reason } };
  }
  let players = s.players;
  if (ejectedId !== null) {
    const heldRunner = players.some((p) => p.id === ejectedId && p.seats.includes("runner"));
    const candidates = players.filter((p) => !p.ejected && p.id !== ejectedId);
    // No candidate cannot happen (the last one standing is the imposter, handled above); guarded so a stray state cannot brick the hall.
    const heirId = heldRunner && candidates.length > 0 ? at(candidates, Math.floor(random() * candidates.length)).id : null;
    players = players.map((p) => {
      // The ejected keep their seats (public, read-only); only the Herald seat passes on.
      if (p.id === ejectedId) return { ...p, ejected: true, seats: p.seats.filter((seat) => seat !== "runner") };
      if (p.id === heirId) return { ...p, seats: [...p.seats, "runner"] };
      return p;
    });
  }
  return { ...base, phase: "building", players, clock: { ...base.clock, buildRunningSince: resolvedAt } };
}

/** The single option strictly ahead of every other, or null. Freeze non-voters count as skip. */
function tally(round: VoteRound, eligible: number): string | null {
  const counts = new Map<string, number>();
  let best: string | null = null;
  let bestN = round.kind === "freeze" ? eligible - round.votes.length : 0;
  let tied = false;
  for (const v of round.votes) {
    if (v.targetId === null) bestN += 1;
    else counts.set(v.targetId, (counts.get(v.targetId) ?? 0) + 1);
  }
  for (const [id, n] of counts) {
    if (n > bestN) {
      best = id;
      bestN = n;
      tied = false;
    } else if (n === bestN) {
      tied = true;
    }
  }
  return tied ? null : best;
}

function startFinal(s: RoomState, startedAt: number): RoomState {
  return {
    ...s,
    phase: "finalVote",
    clock: pause(s, startedAt),
    votes: [...s.votes, newRound("final", null, startedAt, s.settings.finalDiscussionMs, s.settings.finalVoteMs)],
  };
}

function newRound(kind: VoteRound["kind"], calledBy: string | null, startedAt: number, discussionMs: number, voteMs: number): VoteRound {
  return { kind, calledBy, startedAt, discussionMs, voteMs, votes: [], result: null };
}

function pause(s: RoomState, now: number): RoomState["clock"] {
  return { phaseStartedAt: now, buildElapsedMs: buildElapsed(s.clock, now), buildRunningSince: null };
}

function withCard(s: RoomState, actor: Player, seat: Seat, card: CardEntry["card"], ctx: ActionContext): RoomState {
  return { ...s, cards: [...s.cards, { id: ctx.newId(), playerId: actor.id, seat, at: ctx.now, card }] };
}

function mergeSettings(s: RoomState, patch: Extract<Action, { type: "setSettings" }>["settings"]): RoomState["settings"] {
  const next = { ...s.settings };
  if (patch.readMs !== undefined) {
    if (!inRange(patch.readMs, 0, 30 * 60_000)) throw new GameError("invalid", "readMs must be 0..30 minutes");
    next.readMs = patch.readMs;
  }
  if (patch.buildMs !== undefined) {
    if (!inRange(patch.buildMs, 5 * 60_000, 120 * 60_000)) throw new GameError("invalid", "buildMs must be 5..120 minutes");
    next.buildMs = patch.buildMs;
  }
  if (patch.maxSubmissions !== undefined) {
    if (!Number.isInteger(patch.maxSubmissions) || !inRange(patch.maxSubmissions, 1, 10)) {
      throw new GameError("invalid", "maxSubmissions must be 1..10");
    }
    next.maxSubmissions = patch.maxSubmissions;
  }
  return next;
}

function inRange(v: number, min: number, max: number): boolean {
  return v >= min && v <= max; // NaN fails both
}

function requirePhase(s: RoomState, phase: RoomState["phase"]): void {
  if (s.phase !== phase) throw new GameError("wrong-phase", `only allowed during ${phase}`);
}

function requireHostInLobby(s: RoomState, actor: Player): void {
  requirePhase(s, "lobby");
  if (actor.id !== s.hostId) throw new GameError("not-host", "host only");
}

function requireSeat(actor: Player, seat: Seat): void {
  if (!actor.seats.includes(seat)) throw new GameError("not-your-seat", `you do not hold the ${seat} seat`);
}

function requireProblem(s: RoomState): Problem {
  if (s.problem === null) throw new GameError("invalid", "no problem set");
  return s.problem;
}
