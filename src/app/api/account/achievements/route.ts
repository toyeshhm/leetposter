import { achievements } from "@/server/achievements";
import { requireUser } from "@/server/auth";
import { respond } from "@/server/handlers";
import { loadResults } from "@/server/results";

/** GET -> {achievements}: every achievement with earned and progress, computed from the caller's games. */
export function GET(req: Request): Promise<Response> {
  return respond(async () => ({ achievements: achievements(await loadResults((await requireUser(req)).id)) }));
}
