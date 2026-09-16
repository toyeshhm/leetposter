import { GameError } from "./errors";
import type { PanelView, PlayerView, RoomState, Seat, VoteRound, VoteRoundView } from "./types";
import { buildElapsed } from "./util";

/**
 * Project the full room state down to what ONE player may see. Strips every other player's
 * token and imposter flag, shows only this player's own seat panels (the imposter's too; every panel at the reveal),
 * hides vote targets until a round resolves, and computes clock fields from `now`.
 * Throws GameError("not-found") if the player is not in the room.
 */
export function personalize(state: RoomState, playerId: string, now: number): PlayerView {
  const me = state.players.find((p) => p.id === playerId);
  if (me === undefined) throw new GameError("not-found", `player ${playerId} is not in hall ${state.code}`);

  const atReveal = state.phase === "reveal";
  const holds = (seat: Seat): boolean => atReveal || me.seats.includes(seat);
  const { problem, settings, clock } = state;

  const panel: PanelView = {
    tags: problem !== null && holds("tagger") ? problem.tags : null,
    hints: problem !== null && holds("oracle") ? problem.hints : null,
    constraints: problem !== null && holds("bounds") ? problem.constraints : null,
    title: problem !== null && holds("runner") ? problem.title : null,
    url: problem !== null && holds("runner") ? problem.url : null,
  };

  const votes = state.votes.map(toRoundView);
  const last = votes.at(-1);
  const activeVote = last?.result === null ? last : null;

  const buildRemainingMs = Math.max(0, settings.buildMs - buildElapsed(clock, now));
  const elapsed = settings.buildMs - buildRemainingMs;
  const submissionsLeft = settings.maxSubmissions - state.submissions.length;
  const building = state.phase === "building" && !me.ejected;

  let phaseEndsAt: number | null;
  switch (state.phase) {
    case "reading":
      phaseEndsAt = clock.phaseStartedAt + settings.readMs;
      break;
    case "building":
      phaseEndsAt = now + buildRemainingMs;
      break;
    case "freeze":
    case "finalVote":
      phaseEndsAt = activeVote?.voteEndsAt ?? null;
      break;
    case "lobby":
    case "reveal":
      phaseEndsAt = null;
      break;
  }

  return {
    code: state.code,
    phase: state.phase,
    me: {
      id: me.id,
      seats: me.seats,
      isImposter: me.isImposter,
      isHost: state.hostId === playerId,
      ejected: me.ejected,
      freezeUsed: me.freezeUsed,
    },
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      seats: p.seats,
      ejected: p.ejected,
      freezeUsed: p.freezeUsed,
      isHost: state.hostId === p.id,
      username: p.username,
      look: p.look ?? null,
      isImposter: atReveal || me.isImposter || p.id === playerId ? p.isImposter : null,
    })),
    settings,
    problem:
      problem === null
        ? null
        : {
            statement: problem.statement,
            tagCount: problem.tags.length,
            hintCount: problem.hints.length,
            rating: problem.rating ?? null,
            bankId: problem.bankId ?? null,
          },
    problemReady: problem !== null,
    panel,
    cards: state.cards,
    submissions: state.submissions,
    submissionsLeft,
    votes,
    activeVote,
    clock: {
      serverNow: now,
      phaseEndsAt,
      buildRemainingMs,
      buildPaused: state.phase !== "building" || clock.buildRunningSince === null,
    },
    canCallFreeze:
      building &&
      !me.freezeUsed &&
      elapsed >= settings.freezeOpensAfterMs &&
      buildRemainingMs >= settings.freezeClosesBeforeEndMs,
    canSubmit: building && me.seats.includes("runner") && submissionsLeft > 0,
    outcome: state.outcome,
    reveal:
      atReveal && problem !== null
        ? {
            problem,
            imposterIds: state.players.filter((p) => p.isImposter).map((p) => p.id),
            players: state.players.map((p) => ({ id: p.id, seats: p.seats, isImposter: p.isImposter })),
          }
        : null,
  };
}

function toRoundView(round: VoteRound): VoteRoundView {
  const discussionEndsAt = round.startedAt + round.discussionMs;
  return {
    kind: round.kind,
    calledBy: round.calledBy,
    startedAt: round.startedAt,
    discussionEndsAt,
    voteEndsAt: discussionEndsAt + round.voteMs,
    votedIds: round.votes.map((v) => v.voterId),
    votes: round.result === null ? null : round.votes,
    result: round.result,
  };
}
