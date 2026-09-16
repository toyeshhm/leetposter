import { seasonFor } from "@/economy/seasons";
import { requireUser } from "@/server/auth";
import { createPassCheckout } from "@/server/economy/stripe";
import { respond } from "@/server/handlers";

/** POST (bearer, no body) -> {url}: the Stripe Checkout page for this season's paid pass. */
export function POST(req: Request): Promise<Response> {
  return respond(async () => {
    const user = await requireUser(req);
    return createPassCheckout(user, seasonFor(new Date()), new URL(req.url).origin);
  });
}
