import type { PanelView, RoomState, SpectatorView, VoteRound, VoteRoundView } from "./types";
import { buildElapsed } from "./util";

/**
 * Project the room state down to what a spectator may see: the statement, every seat panel, the record,
 * the clock and the votes, with ballots hidden until a round resolves and the Changeling hidden until the
 * reveal. Strips every token. A player opening this learns nothing beyond being every seat at once.
 */
export function spectate(state: RoomState, now: number): SpectatorView {
  const atReveal = state.phase === "reveal";
  const { problem, settings, clock } = state;
  const panel: PanelView =
    problem === null
      ? { tags: null, hints: null, constraints: null, title: null, url: null }
      : { tags: problem.tags, hints: problem.hints, constraints: problem.constraints, title: problem.title, url: problem.url };

  const votes = state.votes.map(toRoundView);
  const last = votes.at(-1);
  const activeVote = last?.result === null ? last : null;
  const buildRemainingMs = Math.max(0, settings.buildMs - buildElapsed(clock, now));

  // ponytail: the same switch as personalize; export toRoundView and this from view.ts if a third view ever appears.
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
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      seats: p.seats,
      ejected: p.ejected,
      freezeUsed: p.freezeUsed,
      isHost: state.hostId === p.id,
      username: p.username,
      look: p.look ?? null,
      isImposter: atReveal ? p.isImposter : null,
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
    panel,
    cards: state.cards,
    submissions: state.submissions,
    submissionsLeft: settings.maxSubmissions - state.submissions.length,
    votes,
    activeVote,
    clock: {
      serverNow: now,
      phaseEndsAt,
      buildRemainingMs,
      buildPaused: state.phase !== "building" || clock.buildRunningSince === null,
    },
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
