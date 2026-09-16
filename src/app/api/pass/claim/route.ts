import { z } from "zod";
import { requireUser } from "@/server/auth";
import { claimTier } from "@/server/economy/pass";
import { readBody, respond } from "@/server/handlers";

const body = z.object({ tier: z.number().int() });

/** POST {tier} (bearer) -> PassPage, after the tier's rewards are in your hands. */
export function POST(req: Request): Promise<Response> {
  return respond(async () => {
    const user = await requireUser(req);
    return claimTier(user, (await readBody(req, body)).tier);
  });
}
