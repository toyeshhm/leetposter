import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as checkoutPost } from "@/app/api/pass/checkout/route";
import { POST as webhookPost } from "@/app/api/stripe/webhook/route";
import { SEASONS, type Season } from "@/economy/seasons";
import { GameError } from "@/game/errors";
import { createPassCheckout, handleWebhook, verifySignature } from "@/server/economy/stripe";
import { supabase } from "@/server/supabase";

/**
 * Stripe, with real sockets and real signatures. There is no Stripe test key in the environment by
 * default, so the Checkout call is pointed at a real HTTP server on localhost that answers in
 * Stripe's shape: the fetch, the form encoding and the JSON parse are all the production ones, and
 * only the far end of the wire is local. When STRIPE_SECRET_KEY is set the same call is made against
 * api.stripe.com as well. The webhook signatures are computed here with node:crypto, which is the
 * same code Stripe runs, so the verifier is tested against real HMACs rather than a stand-in.
 */

const run = Date.now().toString(36);
const signIn = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_KEY ?? "", { auth: { persistSession: false, autoRefreshToken: false } });

const SECRET = `whsec_${run}`;

/** The first seeded season: the pass, its tiers and the purchase rows are all pinned to it. */
function seeded(id: string): Season {
  const season = SEASONS.find((s) => s.id === id);
  if (season === undefined) throw new Error(`no season ${id} in SEASONS`);
  return season;
}

const SEASON = seeded("2026-10");
/** Whatever the environment really holds, captured before any test moves it. */
const LIVE_KEY = process.env.STRIPE_SECRET_KEY;
const LIVE_PRICE = process.env.STRIPE_PRICE_PASS;
const HAS_LIVE_STRIPE = LIVE_KEY !== undefined && LIVE_KEY !== "" && LIVE_PRICE !== undefined && LIVE_PRICE !== "";

const next: { status: number; body: unknown } = { status: 200, body: {} };
const last: { path: string; auth: string | undefined; body: string } = { path: "", auth: undefined, body: "" };

const stripe = createServer((req, res) => {
  let body = "";
  req.setEncoding("utf8");
  req.on("data", (chunk: string) => {
    body += chunk;
  });
  req.on("end", () => {
    last.path = req.url ?? "";
    last.auth = req.headers.authorization;
    last.body = body;
    res.writeHead(next.status, { "content-type": "application/json" });
    res.end(JSON.stringify(next.body));
  });
});

const userIds: string[] = [];
const account: { id: string; username: string; token: string } = { id: "", username: "", token: "" };

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    stripe.listen(0, "127.0.0.1", () => {
      resolve();
    });
  });
  const email = `stripe-${run}@example.test`;
  const password = `pw-${run}`;
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error !== null) throw new Error(created.error.message);
  account.id = created.data.user.id;
  userIds.push(account.id);
  account.username = `s${run}`.slice(0, 20);
  const profile = await supabase.from("profiles").insert({ id: account.id, username: account.username });
  if (profile.error !== null) throw new Error(profile.error.message);
  const signed = await signIn.auth.signInWithPassword({ email, password });
  if (signed.error !== null) throw new Error(signed.error.message);
  account.token = signed.data.session.access_token;
});

afterAll(async () => {
  stripe.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    stripe.close((error) => {
      if (error === undefined) resolve();
      else reject(error);
    });
  });
  for (const id of userIds) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error !== null) throw new Error(error.message);
  }
});

function api(): string {
  const address = stripe.address() as AddressInfo;
  return `http://127.0.0.1:${String(address.port)}/v1`;
}

/** The header Stripe sends: `t=<unix seconds>,v1=<hex hmac of "t.payload">`. Real HMAC, real secret. */
function sign(payload: string, secret: string, atMs: number): string {
  const t = String(Math.floor(atMs / 1000));
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;
}

function completed(sessionId: string, purchaseId: string, seasonId: string): string {
  return JSON.stringify({
    id: `evt_${run}`,
    type: "checkout.session.completed",
    data: { object: { id: sessionId, client_reference_id: purchaseId, metadata: { user_id: account.id, season_id: seasonId } } },
  });
}

function post(handler: (req: Request) => Promise<Response>, init: RequestInit): Promise<Response> {
  return handler(new Request("http://x.test/api/stripe/webhook", { method: "POST", ...init }));
}

async function json<T>(res: Response, status = 200): Promise<T> {
  const body: unknown = await res.json();
  expect(res.status, JSON.stringify(body)).toBe(status);
  return body as T;
}

async function failsWith(work: Promise<unknown>, code: string, message: RegExp): Promise<void> {
  const error = await work.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(GameError);
  expect((error as GameError).code).toBe(code);
  expect((error as GameError).message).toMatch(message);
}

/**
 * Run with these Stripe settings in place, whatever the environment really holds. A setting given as
 * undefined has to be genuinely absent (that is the branch the "no till" message hangs off), so the
 * environment is rebuilt without the name rather than deleted from.
 */
function apply(env: Record<string, string | undefined>): void {
  const kept: Record<string, string> = {};
  for (const [name, value] of Object.entries(process.env)) if (!(name in env) && value !== undefined) kept[name] = value;
  for (const [name, value] of Object.entries(env)) if (value !== undefined) kept[name] = value;
  // NODE_ENV is named because ProcessEnv requires it; the value is the one the copy above already carried.
  process.env = { ...kept, NODE_ENV: process.env.NODE_ENV };
}

async function withEnv(env: Record<string, string | undefined>, work: () => Promise<void>): Promise<void> {
  const before: Record<string, string | undefined> = Object.fromEntries(Object.keys(env).map((name) => [name, process.env[name]]));
  try {
    apply(env);
    await work();
  } finally {
    apply(before);
  }
}

describe("verifySignature", () => {
  const payload = '{"id":"evt_test"}';
  const now = Date.UTC(2026, 8, 14, 12, 0, 0);

  it("accepts the digest Stripe would send and nothing else", () => {
    expect(verifySignature(payload, sign(payload, SECRET, now), SECRET, now)).toBe(true);
    // Four minutes late is still inside the five minute window; six is not, in either direction.
    expect(verifySignature(payload, sign(payload, SECRET, now - 4 * 60_000), SECRET, now)).toBe(true);
    expect(verifySignature(payload, sign(payload, SECRET, now - 6 * 60_000), SECRET, now)).toBe(false);
    expect(verifySignature(payload, sign(payload, SECRET, now + 6 * 60_000), SECRET, now)).toBe(false);
    expect(verifySignature(payload, sign(payload, SECRET, now), `${SECRET}-not`, now)).toBe(false);
    expect(verifySignature(`${payload} `, sign(payload, SECRET, now), SECRET, now)).toBe(false);
  });

  it("refuses a header that is missing, malformed or the wrong length", () => {
    expect(verifySignature(payload, null, SECRET, now)).toBe(false);
    expect(verifySignature(payload, "", SECRET, now)).toBe(false);
    expect(verifySignature(payload, "nonsense,=leading,t", SECRET, now)).toBe(false);
    expect(verifySignature(payload, `t=${String(Math.floor(now / 1000))}`, SECRET, now)).toBe(false);
    expect(verifySignature(payload, "v1=deadbeef", SECRET, now)).toBe(false);
    expect(verifySignature(payload, "t=not-a-number,v1=deadbeef", SECRET, now)).toBe(false);
    expect(verifySignature(payload, `${sign(payload, SECRET, now)}00`, SECRET, now)).toBe(false);
  });
});

describe("the webhook", () => {
  it("marks the purchase paid and opens the paid track, once, however often Stripe delivers it", async () => {
    const purchaseId = crypto.randomUUID();
    const sessionId = `cs_test_${run}`;
    const opened = await supabase
      .from("purchases")
      .insert({ id: purchaseId, user_id: account.id, kind: "pass", season_id: SEASON.id, stripe_session_id: sessionId, amount_cents: 500, status: "pending" });
    expect(opened.error).toBeNull();

    const payload = completed(sessionId, purchaseId, SEASON.id);
    const now = Date.now();
    await withEnv({ STRIPE_WEBHOOK_SECRET: SECRET }, async () => {
      const first = await post(webhookPost, { body: payload, headers: { "stripe-signature": sign(payload, SECRET, now) } });
      expect(await json<{ received: boolean }>(first)).toEqual({ received: true });
      // Stripe retries; the second delivery lands on rows that are already in that state.
      await handleWebhook(payload, sign(payload, SECRET, now), now);
    });

    const purchase = await supabase.from("purchases").select("status").eq("id", purchaseId).single();
    expect(purchase.data?.status).toBe("paid");
    const progress = await supabase.from("pass_progress").select("paid, xp").eq("user_id", account.id).eq("season_id", SEASON.id).single();
    expect(progress.data).toMatchObject({ paid: true, xp: 0 });
  });

  it("answers 400 to anything it cannot trust and 200 to an event it does not act on", async () => {
    const payload = completed(`cs_ignored_${run}`, crypto.randomUUID(), SEASON.id);
    const now = Date.now();
    await withEnv({ STRIPE_WEBHOOK_SECRET: undefined }, async () => {
      await failsWith(handleWebhook(payload, sign(payload, SECRET, now), now), "invalid", /did not come from Stripe/);
    });
    await withEnv({ STRIPE_WEBHOOK_SECRET: "" }, async () => {
      await failsWith(handleWebhook(payload, sign(payload, SECRET, now), now), "invalid", /did not come from Stripe/);
    });
    await withEnv({ STRIPE_WEBHOOK_SECRET: SECRET }, async () => {
      const forged = await post(webhookPost, { body: payload, headers: { "stripe-signature": sign(payload, "whsec_wrong", now) } });
      await expect(json<{ code: string }>(forged, 400)).resolves.toMatchObject({ code: "invalid" });
      const unsigned = await post(webhookPost, { body: payload });
      await expect(json<{ code: string }>(unsigned, 400)).resolves.toMatchObject({ code: "invalid" });

      await failsWith(handleWebhook("not json at all", sign("not json at all", SECRET, now), now), "invalid", /not JSON/);
      const other = '{"id":"evt_x","type":"payment_intent.succeeded"}';
      await expect(handleWebhook(other, sign(other, SECRET, now), now)).resolves.toBeUndefined();
      const shapeless = '{"type":"checkout.session.completed","data":{"object":{"id":"cs_x"}}}';
      await failsWith(handleWebhook(shapeless, sign(shapeless, SECRET, now), now), "invalid", /client_reference_id/);
    });
  });
});

describe("the checkout", () => {
  it("has no till until the keys are set", async () => {
    await withEnv({ STRIPE_SECRET_KEY: undefined, STRIPE_PRICE_PASS: "price_test" }, async () => {
      const res = await post(checkoutPost, { headers: { authorization: `Bearer ${account.token}` } });
      await expect(json<{ message: string }>(res, 400)).resolves.toEqual({ code: "invalid", message: "The store has no till yet." });
    });
    await withEnv({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_PASS: "" }, async () => {
      await failsWith(createPassCheckout(account, SEASON, "http://x.test", api()), "invalid", /no till yet/);
    });
    await expect(json<{ code: string }>(await post(checkoutPost, {}), 401)).resolves.toMatchObject({ code: "unauthorized" });
  });

  it("refuses to open a till between seasons", async () => {
    await withEnv({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_PASS: "price_test" }, async () => {
      await failsWith(createPassCheckout(account, null, "http://x.test", api()), "invalid", /No season is running/);
    });
  });

  it("opens a Checkout Session for the season's paid pass and records the purchase", async () => {
    const sessionId = `cs_live_${run}`;
    next.status = 200;
    next.body = { id: sessionId, url: `https://checkout.stripe.test/${sessionId}`, amount_total: 499 };
    await withEnv({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_PASS: "price_test_pass" }, async () => {
      const { url } = await createPassCheckout(account, SEASON, "https://leetposter.test", api());
      expect(url).toBe(`https://checkout.stripe.test/${sessionId}`);
    });
    expect(last.path).toBe("/v1/checkout/sessions");
    expect(last.auth).toBe("Bearer sk_test_x");
    const form = new URLSearchParams(last.body);
    expect(form.get("mode")).toBe("payment");
    expect(form.get("line_items[0][price]")).toBe("price_test_pass");
    expect(form.get("line_items[0][quantity]")).toBe("1");
    expect(form.get("success_url")).toBe("https://leetposter.test/pass?paid=1");
    expect(form.get("cancel_url")).toBe("https://leetposter.test/pass");
    expect(form.get("metadata[user_id]")).toBe(account.id);
    expect(form.get("metadata[season_id]")).toBe(SEASON.id);
    const purchaseId = form.get("client_reference_id");
    expect(purchaseId).toMatch(/^[0-9a-f-]{36}$/);
    const row = await supabase.from("purchases").select("user_id, kind, season_id, stripe_session_id, amount_cents, status").eq("id", purchaseId ?? "").single();
    expect(row.data).toEqual({ user_id: account.id, kind: "pass", season_id: SEASON.id, stripe_session_id: sessionId, amount_cents: 499, status: "pending" });
  });

  it("says so plainly when Stripe refuses or answers with something else", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await withEnv({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_PASS: "price_test_pass" }, async () => {
      next.status = 402;
      next.body = { error: { message: "Your card was declined." } };
      await failsWith(createPassCheckout(account, SEASON, "https://leetposter.test", api()), "upstream", /would not open a till/);
      // A 200 that is not a session is just as unusable.
      next.status = 200;
      next.body = { id: "cs_x", amount_total: 499 };
      await failsWith(createPassCheckout(account, SEASON, "https://leetposter.test", api()), "upstream", /would not open a till/);
    });
    expect(errors).toHaveBeenCalledTimes(2);
    errors.mockRestore();
    const { count } = await supabase.from("purchases").select("id", { count: "exact", head: true }).eq("user_id", account.id).eq("status", "pending");
    // Only the session that actually opened left a row behind.
    expect(count).toBe(1);
  });

  it.runIf(HAS_LIVE_STRIPE)("opens a real Checkout Session against api.stripe.com", { timeout: 30_000 }, async () => {
    await withEnv({ STRIPE_SECRET_KEY: LIVE_KEY, STRIPE_PRICE_PASS: LIVE_PRICE }, async () => {
      const { url } = await createPassCheckout(account, SEASON, "https://leetposter.test");
      expect(url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    });
  });
});
