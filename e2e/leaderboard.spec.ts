import { expect, test, type APIRequestContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Credentials } from "@/client/api";
import { supabase } from "@/server/supabase";
import { PROBLEM, act } from "./helpers";

const run = Date.now().toString(36);
const signIn = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_KEY ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
const users: { id: string; username: string; token: string }[] = [];

test.afterAll(async () => {
  for (const u of users) {
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    if (error !== null) throw new Error(error.message);
  }
});

async function newUser(tag: string): Promise<{ id: string; username: string; token: string }> {
  const email = `board-${run}-${tag}@example.test`;
  const password = `pw-${run}-${tag}`;
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error !== null) throw new Error(created.error.message);
  const username = `b${run}${tag}`.slice(0, 20);
  const profile = await supabase.from("profiles").insert({ id: created.data.user.id, username });
  if (profile.error !== null) throw new Error(profile.error.message);
  const signed = await signIn.auth.signInWithPassword({ email, password });
  if (signed.error !== null) throw new Error(signed.error.message);
  const user = { id: created.data.user.id, username, token: signed.data.session.access_token };
  users.push(user);
  return user;
}

/** Take a seat as a signed-in account: the bearer token attaches the seat to the profile. */
async function seat(request: APIRequestContext, path: string, name: string, token: string): Promise<Credentials> {
  const res = await request.post(path, { data: { name }, headers: { authorization: `Bearer ${token}` } });
  if (!res.ok()) throw new Error(`${path} -> ${String(res.status())} ${await res.text()}`);
  return (await res.json()) as Credentials;
}

test("two accounts finish a hall and stand on the overall board; only the Changeling stands on the Changeling board", async ({ page, request }) => {
  const [a, b] = await Promise.all([newUser("a"), newUser("b")]);
  // Two at the table, both with accounts, so the Changeling is one of them whatever the deal.
  const host = await seat(request, "/api/rooms", "Ada", a.token);
  const other = await seat(request, `/api/rooms/${host.code}/join`, "Brin", b.token);
  await act(request, host, { type: "setProblem", problem: PROBLEM });
  await act(request, host, { type: "setSettings", settings: { readMs: 0, buildMs: 5 * 60_000, maxSubmissions: 4 } });
  await act(request, host, { type: "start" });
  const views = await Promise.all([host, other].map((c) => act(request, c, { type: "tick" })));
  const maskView = views.find((v) => v.me.isImposter);
  if (maskView === undefined) throw new Error("no Changeling dealt");
  const mask = maskView.me.id === host.playerId ? a : b;
  const crew = mask === a ? b : a;
  const runner = [host, other].find((c) => views.find((v) => v.me.id === c.playerId)?.me.seats.includes("runner"));
  if (runner === undefined) throw new Error("no runner dealt");
  const view = await act(request, runner, { type: "submit", verdict: "accepted" });
  expect(view.phase).toBe("reveal");

  await page.goto("/leaderboard");
  const overall = page.getByRole("table", { name: "Overall board" });
  await expect(overall).toContainText(`@${a.username}`);
  await expect(overall).toContainText(`@${b.username}`);
  await page.getByRole("button", { name: "Changeling", exact: true }).click();
  const changeling = page.getByRole("table", { name: "Changeling board" });
  await expect(changeling).toContainText(`@${mask.username}`);
  await expect(changeling).not.toContainText(`@${crew.username}`);
});
