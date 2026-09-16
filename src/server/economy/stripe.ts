import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Season } from "@/economy/seasons";
import { GameError } from "@/game/errors";
import type { AccountUser } from "@/server/auth";
import { seedSeasons } from "@/server/economy/items";
import { log } from "@/server/log";
import { supabase, unwrap } from "@/server/supabase";
import { parse } from "@/server/validate";

/**
 * Stripe over plain fetch: one Checkout Session for the paid pass, and the webhook that marks it
 * paid. No SDK — the two calls are a form post and an HMAC, and a dependency for that is a
 * dependency to keep patched. `api` is injectable so the request itself can be driven in a test.
 */
const STRIPE_API = "https://api.stripe.com/v1";
const TOLERANCE_MS = 5 * 60_000;
const PASS_KIND = "pass";

const session = z.object({ id: z.string(), url: z.string(), amount_total: z.number() });
const completed = z.object({
  type: z.literal("checkout.session.completed"),
  data: z.object({
    object: z.object({
      id: z.string(),
      /** The purchases row this session was opened for. */
      client_reference_id: z.string(),
      metadata: z.object({ user_id: z.string(), season_id: z.string() }),
    }),
  }),
});

/** A Stripe setting, or the honest 400: there is no till until someone sets the keys. */
function till(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") throw new GameError("invalid", "The store has no till yet.");
  return value;
}

/**
 * Open a Checkout Session for one season's paid pass and record the purchase. The session carries
 * the purchase id as `client_reference_id` and the account and season in metadata, so the webhook
 * can find both without trusting anything the browser sends back.
 */
export async function createPassCheckout(user: AccountUser, season: Season | null, origin: string, api: string = STRIPE_API): Promise<{ url: string }> {
  const key = till("STRIPE_SECRET_KEY");
  const price = till("STRIPE_PRICE_PASS");
  if (season === null) throw new GameError("invalid", "No season is running. Come back when the candle is lit.");
  await seedSeasons();
  const id = crypto.randomUUID();
  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/pass?paid=1`,
    cancel_url: `${origin}/pass`,
    client_reference_id: id,
    "metadata[user_id]": user.id,
    "metadata[season_id]": season.id,
  });
  const res = await fetch(`${api}/checkout/sessions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const body: unknown = await res.json();
  const opened = session.safeParse(body);
  if (!res.ok || !opened.success) {
    log.error("stripe.checkout.failed", { user: user.id, season: season.id, status: res.status, body });
    throw new GameError("upstream", "Stripe would not open a till just now. Try again in a moment.");
  }
  unwrap(
    `purchase ${id}`,
    await supabase.from("purchases").insert({
      id,
      user_id: user.id,
      kind: PASS_KIND,
      season_id: season.id,
      stripe_session_id: opened.data.id,
      amount_cents: opened.data.amount_total,
      status: "pending",
    }),
  );
  return { url: opened.data.url };
}

/**
 * Stripe's `Stripe-Signature`: `t=<unix seconds>,v1=<hex hmac of "t.payload">`. The secret is the
 * only thing that can produce the digest, the timestamp keeps a captured call from being replayed
 * later, and the comparison is constant time.
 */
export function verifySignature(payload: string, header: string | null, secret: string, nowMs: number): boolean {
  if (header === null) return false;
  const parts = new Map<string, string>();
  for (const part of header.split(",")) {
    const at = part.indexOf("=");
    if (at > 0) parts.set(part.slice(0, at), part.slice(at + 1));
  }
  const stamp = parts.get("t");
  const given = parts.get("v1");
  if (stamp === undefined || given === undefined) return false;
  const seconds = Number(stamp);
  if (!Number.isFinite(seconds) || Math.abs(nowMs - seconds * 1000) > TOLERANCE_MS) return false;
  const expected = createHmac("sha256", secret).update(`${stamp}.${payload}`).digest("hex");
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/**
 * One webhook delivery. A bad signature is a 400 and nothing else happens; anything signed is
 * answered 200, whether or not it was an event we act on. Replays are harmless: both writes are
 * idempotent, so Stripe may deliver the same session as often as it likes.
 */
export async function handleWebhook(payload: string, signature: string | null, nowMs: number): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (secret === undefined || secret === "" || !verifySignature(payload, signature, secret, nowMs)) {
    throw new GameError("invalid", "That did not come from Stripe.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(payload);
  } catch (error: unknown) {
    throw new GameError("invalid", `Stripe sent something that is not JSON: ${String(error)}`);
  }
  if (parse(z.object({ type: z.string() }), raw).type !== completed.shape.type.value) return;
  const { client_reference_id: purchase, metadata } = parse(completed, raw).data.object;
  await seedSeasons();
  unwrap(`purchase paid ${purchase}`, await supabase.from("purchases").update({ status: "paid" }).eq("id", purchase));
  unwrap(
    `pass paid ${metadata.user_id}`,
    await supabase.from("pass_progress").upsert({ user_id: metadata.user_id, season_id: metadata.season_id, paid: true }, { onConflict: "user_id,season_id" }),
  );
}
