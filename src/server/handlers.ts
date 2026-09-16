import type { z } from "zod";
import type { Credentials } from "@/client/api";
import { GameError } from "@/game/errors";
import { apply } from "@/game/reducer";
import { personalize } from "@/game/view";
import { DEFAULT_SETTINGS, MAX_PLAYERS } from "@/game/types";
import type { Action, EquippedLook, GameErrorCode, Player, PlayerView, RoomState } from "@/game/types";
import type { AccountUser } from "@/server/auth";
import { equippedLook } from "@/server/economy/look";
import { log } from "@/server/log";
import { recordResults } from "@/server/results";
import { createRoom, withRoom } from "@/server/store";
import { parse } from "@/server/validate";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_ATTEMPTS = 5;

export function newCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => CODE_ALPHABET.charAt(b % CODE_ALPHABET.length)).join("");
}

function newPlayer(name: string, account: AccountUser | null, look: EquippedLook | null, now: number): Player {
  return {
    id: crypto.randomUUID(),
    name,
    token: Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("hex"),
    userId: account?.id ?? null,
    username: account?.username ?? null,
    look,
    seats: [],
    isImposter: false,
    ejected: false,
    freezeUsed: false,
    joinedAt: now,
  };
}

/** The name the table knows a player by: the body's, or the account's username when the body left it out. */
export function displayName(name: string | undefined, account: AccountUser | null): string {
  const chosen = name ?? account?.username;
  if (chosen === undefined) throw new GameError("invalid", "The table needs something to call you.");
  return chosen;
}

/** `codeGen` is injectable so the collision retry is testable against the real database. */
export async function createRoomHandler(name: string, account: AccountUser | null, codeGen: () => string = newCode): Promise<Credentials> {
  const now = Date.now();
  const host = newPlayer(name, account, await equippedLook(account), now);
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
    const code = codeGen();
    const state: RoomState = {
      code,
      hostId: host.id,
      phase: "lobby",
      players: [host],
      problem: null,
      settings: DEFAULT_SETTINGS,
      clock: { phaseStartedAt: now, buildElapsedMs: 0, buildRunningSince: null },
      cards: [],
      submissions: [],
      votes: [],
      outcome: null,
      createdAt: now,
    };
    if (await createRoom(state)) return { code, playerId: host.id, token: host.token };
  }
  throw new Error(`no free room code after ${String(CODE_ATTEMPTS)} attempts`);
}

export async function joinHandler(code: string, name: string, account: AccountUser | null): Promise<Credentials> {
  const player = newPlayer(name, account, await equippedLook(account), Date.now());
  await withRoom(code, (s) => {
    if (s.phase !== "lobby") throw new GameError("wrong-phase", "The reading has begun; no one joins now.");
    if (s.players.length >= MAX_PLAYERS) throw new GameError("room-full", "The hall is full.");
    if (s.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) throw new GameError("invalid", `Someone at the table is already called ${name}.`);
    return { ...s, players: [...s.players, player] };
  });
  return { code, playerId: player.id, token: player.token };
}

/**
 * Apply one action as the token's owner and answer with their view. GET uses `{ type: "tick" }`.
 * The call that carries the hall into the reveal also records the result rows; `record` is injectable
 * so the failure path is testable against the real database.
 */
export async function actHandler(code: string, token: string, action: Action, record: (state: RoomState) => Promise<void> = recordResults): Promise<PlayerView> {
  let actorId = "";
  let now = 0;
  // An object, not a boolean: TypeScript would narrow a `let` assigned inside the closure to its initial value.
  const before = { revealed: false };
  const state = await withRoom(code, (s) => {
    const actor = s.players.find((p) => p.token === token);
    if (actor === undefined) throw new GameError("unauthorized", "This seat is no longer yours.");
    actorId = actor.id;
    before.revealed = s.phase === "reveal";
    // Stamped after the load (and any retry) so `clock.serverNow` is not skewed by database latency.
    now = Date.now();
    return apply(s, action, { actorId, now, random: () => Math.random(), newId: () => crypto.randomUUID() });
  });
  if (!before.revealed && state.phase === "reveal") {
    try {
      await record(state);
    } catch (error: unknown) {
      // The game is over and saved; a lost history row must not turn the reveal into a 500.
      log.error("results.failed", { code, error });
    }
  }
  return personalize(state, actorId, now);
}

const STATUS: Partial<Record<GameErrorCode, number>> = { "not-found": 404, unauthorized: 401, invalid: 400, upstream: 502 };

/** Run route work; GameError -> {code, message} with its status, anything else -> logged 500. */
export async function respond(work: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await work());
  } catch (error: unknown) {
    if (error instanceof GameError) {
      return Response.json({ code: error.code, message: error.message }, { status: STATUS[error.code] ?? 409 });
    }
    log.error("route.failed", { error });
    return Response.json({ code: "internal", message: "internal error" }, { status: 500 });
  }
}

export async function readBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch (error: unknown) {
    throw new GameError("invalid", `body is not JSON: ${String(error)}`);
  }
  return parse(schema, raw);
}
