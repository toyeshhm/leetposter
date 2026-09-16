import type { RoomState } from "@/game/types";
import { economyAfterHall } from "@/server/economy/hall";
import { log } from "@/server/log";
import { problemAfterHall } from "@/server/problemRating";

/**
 * Everything that happens once a hall is recorded, after game_results and Elo: problem ratings,
 * quest progress, pass XP. Each hook runs independently; a failing hook is logged and never
 * blocks the others or the game. Register hooks by adding them to HOOKS.
 */
export type HallHook = (state: RoomState) => Promise<void>;

export const HOOKS: HallHook[] = [economyAfterHall, problemAfterHall];

export async function afterHall(state: RoomState): Promise<void> {
  for (const hook of HOOKS) {
    try {
      await hook(state);
    } catch (error: unknown) {
      log.error("afterHall.failed", { code: state.code, hook: hook.name, error: error instanceof Error ? error.message : String(error) });
    }
  }
}
