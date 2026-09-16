import { requireUser } from "@/server/auth";
import { questsPage } from "@/server/economy/quests";
import { respond } from "@/server/handlers";

/** GET (bearer) -> QuestsPage: today's three and this week's three, with what each has counted. */
export function GET(req: Request): Promise<Response> {
  return respond(async () => questsPage(await requireUser(req)));
}
