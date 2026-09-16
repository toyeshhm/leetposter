import { z } from "zod";
import { requireUser } from "@/server/auth";
import { buy } from "@/server/economy/store";
import { readBody, respond } from "@/server/handlers";

const body = z.object({ itemId: z.string() });

/** POST {itemId} (bearer) -> StorePage, after the candles have changed hands. */
export function POST(req: Request): Promise<Response> {
  return respond(async () => {
    const user = await requireUser(req);
    return buy(user, (await readBody(req, body)).itemId);
  });
}
