import { z } from "zod";
import { requireUser } from "@/server/auth";
import { claimQuest } from "@/server/economy/quests";
import { readBody, respond } from "@/server/handlers";

const body = z.object({ questId: z.string() });

/** POST {questId} (bearer) -> QuestsPage, after the quest's XP and candles are paid out. */
export function POST(req: Request): Promise<Response> {
  return respond(async () => {
    const user = await requireUser(req);
    return claimQuest(user, (await readBody(req, body)).questId);
  });
}
