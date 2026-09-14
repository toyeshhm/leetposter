/**
 * Shared contract for Leetposter. Every module codes against these types.
 * Pure data only: no classes, no functions. Times are epoch milliseconds.
 */

export const SEATS = ["tagger", "oracle", "bounds", "runner"] as const;
export type Seat = (typeof SEATS)[number];

export const PHASES = ["lobby", "reading", "building", "freeze", "finalVote", "reveal"] as const;
export type Phase = (typeof PHASES)[number];

export const REPORT_CATEGORIES = [
  "wrong-answer",
  "time-limit",
  "runtime-error",
  "memory-limit",
  "compile-error",
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 8;

/** The problem as pasted by the host. The statement (examples included) is public; the rest are seat panels. */
export interface Problem {
  /** Shown only to the runner (they need the link) and at the reveal. */
  title: string;
  /** Shown only to the runner and at the reveal. */
  url: string;
  /** Prose plus the Example blocks, line breaks kept. */
  statement: string;
  tags: string[];
  hints: string[];
  constraints: string;
  /** Set when the problem came from the Leetposter bank: the Herald's verdict is judged in-app. */
  bankId?: string | undefined;
  /** Leetposter rating (800..3500, Codeforces-like). Absent when nothing could estimate it. */
  rating?: number | undefined;
}

export interface Settings {
  readMs: number;
  buildMs: number;
  maxSubmissions: number;
  freezeDiscussionMs: number;
  freezeVoteMs: number;
  finalDiscussionMs: number;
  finalVoteMs: number;
  /** A freeze may be called once this much build time has elapsed... */
  freezeOpensAfterMs: number;
  /** ...and until this much build time remains. */
  freezeClosesBeforeEndMs: number;
}

export const DEFAULT_SETTINGS: Settings = {
  readMs: 5 * 60_000,
  buildMs: 40 * 60_000,
  maxSubmissions: 4,
  freezeDiscussionMs: 90_000,
  freezeVoteMs: 15_000,
  finalDiscussionMs: 60_000,
  finalVoteMs: 15_000,
  freezeOpensAfterMs: 3 * 60_000,
  freezeClosesBeforeEndMs: 90_000,
};

export interface Player {
  id: string;
  name: string;
  /** Secret. Never leaves the server except to its owner at join time. */
  token: string;
  /** Supabase Auth user id when the player joined signed in; null for guests. */
  userId: string | null;
  /** Profile username captured at join time (so views stay pure); null for guests. */
  username: string | null;
  /** Usually one seat. The runner seat is transferred on ejection, so a player may hold two. */
  seats: Seat[];
  isImposter: boolean;
  ejected: boolean;
  freezeUsed: boolean;
  joinedAt: number;
}

export type Card =
  | { kind: "tags"; tags: string[] }
  | { kind: "hint"; index: number; text: string }
  | { kind: "bound"; text: string }
  | { kind: "report"; category: ReportCategory; failingCase: string };

/** A card is the public, on-the-record thing a seat said. Compared against the truth at the reveal. */
export interface CardEntry {
  id: string;
  playerId: string;
  seat: Seat;
  at: number;
  card: Card;
}

export interface Submission {
  n: number;
  at: number;
  verdict: "accepted" | "rejected";
}

export interface Vote {
  voterId: string;
  /** null = skip (freeze votes only). */
  targetId: string | null;
}

export interface VoteRound {
  kind: "freeze" | "final";
  /** Player who called the freeze; null for the final vote. */
  calledBy: string | null;
  startedAt: number;
  discussionMs: number;
  voteMs: number;
  votes: Vote[];
  /** Set when resolved. ejectedId null = nobody ejected. */
  result: { ejectedId: string | null; resolvedAt: number } | null;
}

export interface Clock {
  /** When the current phase began. */
  phaseStartedAt: number;
  /** Build time accumulated before the current pause (freezes pause the build clock). */
  buildElapsedMs: number;
  /** When the build clock last resumed; null while paused or before building. */
  buildRunningSince: number | null;
}

export interface Outcome {
  winner: "crew" | "imposter";
  reason: "accepted" | "imposter-ejected" | "time" | "final-vote" | "submissions";
}

export interface RoomState {
  code: string;
  hostId: string;
  phase: Phase;
  players: Player[];
  problem: Problem | null;
  settings: Settings;
  clock: Clock;
  cards: CardEntry[];
  submissions: Submission[];
  votes: VoteRound[];
  outcome: Outcome | null;
  createdAt: number;
}

/** Everything a player may do after joining. `tick` advances time-based transitions. */
export type Action =
  | { type: "setProblem"; problem: Problem }
  | { type: "setSettings"; settings: Partial<Pick<Settings, "readMs" | "buildMs" | "maxSubmissions">> }
  | { type: "start" }
  | { type: "declareTags"; tags: string[] }
  | { type: "revealHint"; index: number; text: string }
  | { type: "declareBound"; text: string }
  | { type: "submit"; verdict: "accepted" }
  | { type: "submit"; verdict: "rejected"; category: ReportCategory; failingCase: string }
  | { type: "callFreeze" }
  | { type: "vote"; targetId: string | null }
  | { type: "tick" };

export interface ActionContext {
  actorId: string;
  now: number;
  /** Uniform [0,1). Injected so deals are testable. */
  random: () => number;
  newId: () => string;
}

/** What one player is allowed to see. Produced by `personalize`. */
export interface PublicPlayer {
  id: string;
  name: string;
  seats: Seat[];
  ejected: boolean;
  freezeUsed: boolean;
  isHost: boolean;
  /** Public username when the player has an account; null for guests. */
  username: string | null;
  /** Only present at the reveal, or for yourself, or (if you are the imposter) for everyone. */
  isImposter: boolean | null;
}

export interface PanelView {
  tags: string[] | null;
  hints: string[] | null;
  constraints: string | null;
  /** Runner only (and reveal). */
  title: string | null;
  url: string | null;
}

export interface VoteRoundView {
  kind: VoteRound["kind"];
  calledBy: string | null;
  startedAt: number;
  discussionEndsAt: number;
  voteEndsAt: number;
  /** Who has voted so far (targets hidden until resolved). */
  votedIds: string[];
  /** Full ballots once resolved. */
  votes: Vote[] | null;
  result: VoteRound["result"];
}

export interface PlayerView {
  code: string;
  phase: Phase;
  me: { id: string; seats: Seat[]; isImposter: boolean; isHost: boolean; ejected: boolean; freezeUsed: boolean };
  players: PublicPlayer[];
  settings: Settings;
  /** Public problem parts; null in lobby before the host pastes it. */
  problem: { statement: string; tagCount: number; hintCount: number; rating: number | null; bankId: string | null } | null;
  /** True for the host in the lobby once a problem is set. */
  problemReady: boolean;
  /** My own seat panels only (the imposter included); every panel at the reveal. */
  panel: PanelView;
  cards: CardEntry[];
  submissions: Submission[];
  submissionsLeft: number;
  votes: VoteRoundView[];
  /** Current freeze/final vote round, if any. */
  activeVote: VoteRoundView | null;
  clock: {
    serverNow: number;
    /** Reading: read deadline. Building: build deadline (accounting for pauses). Null otherwise. */
    phaseEndsAt: number | null;
    buildRemainingMs: number;
    buildPaused: boolean;
  };
  canCallFreeze: boolean;
  canSubmit: boolean;
  outcome: Outcome | null;
  /** Only at reveal: the full truth for the "you said X, it said Y" screen. */
  reveal: { problem: Problem; imposterIds: string[]; players: { id: string; seats: Seat[]; isImposter: boolean }[] } | null;
}

export type GameErrorCode =
  | "not-found"
  | "unauthorized"
  | "wrong-phase"
  | "not-host"
  | "not-your-seat"
  | "room-full"
  | "too-few-players"
  | "already-played"
  | "invalid"
  | "taken"
  | "ejected"
  | "freeze-unavailable"
  | "no-submissions-left"
  | "upstream";
