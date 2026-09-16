import { optionalUser } from "@/server/auth";
import { storePage } from "@/server/economy/store";
import { respond } from "@/server/handlers";

/** GET (optional bearer) -> StorePage: your candles, what you own, what you wear. A guest gets nulls, never 401. */
export function GET(req: Request): Promise<Response> {
  return respond(async () => storePage(await optionalUser(req)));
}
