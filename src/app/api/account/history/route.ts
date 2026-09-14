import { requireUser } from "@/server/auth";
import { respond } from "@/server/handlers";
import { loadResults } from "@/server/results";

/** GET -> {games}: the caller's recorded games, newest first, at most fifty. */
export function GET(req: Request): Promise<Response> {
  return respond(async () => ({ games: await loadResults((await requireUser(req)).id) }));
}
