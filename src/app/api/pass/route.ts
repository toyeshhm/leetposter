import { requireUser } from "@/server/auth";
import { passPage } from "@/server/economy/pass";
import { respond } from "@/server/handlers";

/** GET (bearer) -> PassPage: the running season, your XP, whether the paid track is yours, and what you claimed. */
export function GET(req: Request): Promise<Response> {
  return respond(async () => passPage(await requireUser(req)));
}
