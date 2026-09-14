import { z } from "zod";
import { GameError } from "@/game/errors";
import { PHASES, REPORT_CATEGORIES, SEATS } from "@/game/types";
import type { Action, Problem, RoomState } from "@/game/types";

export const playerName = z.string().trim().min(1).max(24);
export const roomCode = z.string().trim().toUpperCase().regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/, "5 letters, no I or O");
/** Tokens are always 32 lowercase hex chars (handlers.newPlayer). */
export const token = z.string().regex(/^[0-9a-f]{32}$/);

// Whitespace-only text is not a card, a tag or a hint: everything on the record is trimmed and non-empty.
const tag = z.string().trim().min(1).max(40);
const hint = z.string().trim().min(1).max(2000);

export const problem: z.ZodType<Problem> = z.object({
  title: z.string().trim().min(1).max(200),
  url: z.url({ protocol: /^https?$/ }),
  statement: z.string().trim().min(1).max(30000),
  tags: z.array(tag).max(20),
  hints: z.array(hint).max(20),
  constraints: z.string().max(5000),
});

const submit = z.discriminatedUnion("verdict", [
  z.object({ type: z.literal("submit"), verdict: z.literal("accepted") }),
  z.object({
    type: z.literal("submit"),
    verdict: z.literal("rejected"),
    category: z.enum(REPORT_CATEGORIES),
    // README: a rejection needs category + failing case; for a compile error that is the compiler's line.
    failingCase: z.string().trim().min(1).max(5000),
  }),
]);

export const action: z.ZodType<Action> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("setProblem"), problem }),
  z.object({
    type: z.literal("setSettings"),
    settings: z.object({
      readMs: z.number().exactOptional(),
      buildMs: z.number().exactOptional(),
      maxSubmissions: z.number().exactOptional(),
    }),
  }),
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("declareTags"), tags: z.array(tag).max(20) }),
  z.object({ type: z.literal("revealHint"), index: z.number().int().min(0), text: hint }),
  z.object({ type: z.literal("declareBound"), text: z.string().trim().min(1).max(2000) }),
  submit,
  z.object({ type: z.literal("callFreeze") }),
  z.object({ type: z.literal("vote"), targetId: z.string().nullable() }),
  z.object({ type: z.literal("tick") }),
]);

/** `name` may be left out by a signed-in player: the route falls back to the username. */
export const nameBody = z.object({ name: playerName.exactOptional() });
export const actBody = z.object({ token, action });

const seat = z.enum(SEATS);
const card = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("tags"), tags: z.array(z.string()) }),
  z.object({ kind: z.literal("hint"), index: z.number(), text: z.string() }),
  z.object({ kind: z.literal("bound"), text: z.string() }),
  z.object({ kind: z.literal("report"), category: z.enum(REPORT_CATEGORIES), failingCase: z.string() }),
]);

/** Shape check for the jsonb column so a corrupt row fails loudly instead of crashing the reducer. */
export const roomState: z.ZodType<RoomState> = z.object({
  code: z.string(),
  hostId: z.string(),
  phase: z.enum(PHASES),
  players: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      token: z.string(),
      userId: z.string().nullable(),
      username: z.string().nullable(),
      seats: z.array(seat),
      isImposter: z.boolean(),
      ejected: z.boolean(),
      freezeUsed: z.boolean(),
      joinedAt: z.number(),
    }),
  ),
  problem: problem.nullable(),
  settings: z.object({
    readMs: z.number(),
    buildMs: z.number(),
    maxSubmissions: z.number(),
    freezeDiscussionMs: z.number(),
    freezeVoteMs: z.number(),
    finalDiscussionMs: z.number(),
    finalVoteMs: z.number(),
    freezeOpensAfterMs: z.number(),
    freezeClosesBeforeEndMs: z.number(),
  }),
  clock: z.object({ phaseStartedAt: z.number(), buildElapsedMs: z.number(), buildRunningSince: z.number().nullable() }),
  cards: z.array(z.object({ id: z.string(), playerId: z.string(), seat, at: z.number(), card })),
  submissions: z.array(z.object({ n: z.number(), at: z.number(), verdict: z.enum(["accepted", "rejected"]) })),
  votes: z.array(
    z.object({
      kind: z.enum(["freeze", "final"]),
      calledBy: z.string().nullable(),
      startedAt: z.number(),
      discussionMs: z.number(),
      voteMs: z.number(),
      votes: z.array(z.object({ voterId: z.string(), targetId: z.string().nullable() })),
      result: z.object({ ejectedId: z.string().nullable(), resolvedAt: z.number() }).nullable(),
    }),
  ),
  outcome: z
    .object({
      winner: z.enum(["crew", "imposter"]),
      reason: z.enum(["accepted", "imposter-ejected", "time", "final-vote", "submissions"]),
    })
    .nullable(),
  createdAt: z.number(),
});

/** Parse with any schema above; a failure becomes GameError("invalid") so routes answer 400. */
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new GameError("invalid", z.prettifyError(result.error));
  return result.data;
}
