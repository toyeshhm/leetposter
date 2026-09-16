import { handleWebhook } from "@/server/economy/stripe";
import { respond } from "@/server/handlers";

/**
 * POST (Stripe) -> 200 {received}. No bearer: the `Stripe-Signature` header is the authentication,
 * and a signature that does not check out is a 400 and nothing else. Safe to deliver twice.
 */
export function POST(req: Request): Promise<Response> {
  return respond(async () => {
    await handleWebhook(await req.text(), req.headers.get("stripe-signature"), Date.now());
    return { received: true };
  });
}
