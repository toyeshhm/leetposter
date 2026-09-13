import { GameError } from "./errors";
import type { Clock } from "./types";

/** Index into an array, throwing instead of returning undefined (noUncheckedIndexedAccess). */
export function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new GameError("invalid", `index ${String(index)} out of range`);
  return item;
}

/** Build time elapsed at `now`, accounting for pauses (freezes, final vote, reveal). */
export function buildElapsed(clock: Clock, now: number): number {
  return clock.buildElapsedMs + (clock.buildRunningSince === null ? 0 : now - clock.buildRunningSince);
}
