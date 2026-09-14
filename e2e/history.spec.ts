import { expect, test } from "@playwright/test";
import type { Credentials } from "@/client/api";
import { supabase } from "@/server/supabase";
import { NAMES, PROBLEM, act, api } from "./helpers";

const run = Date.now().toString(36);
const username = `e2e${run}`.slice(0, 20);

test.afterAll(async () => {
  const { data, error } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (error !== null) throw new Error(error.message);
  if (data === null) return;
  const gone = await supabase.auth.admin.deleteUser(data.id);
  if (gone.error !== null) throw new Error(gone.error.message);
});

test("a signed-in host's hall lands in the ledger, and First Candle is lit", async ({ page, request }) => {
  await page.goto("/account");
  await page.getByRole("button", { name: "New here? Sign up" }).click();
  await page.getByLabel("Email").fill(`${username}@example.test`);
  await page.getByLabel("Password").fill(`pw-${run}-history`);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await page.getByLabel("Username").fill(username);
  await page.getByRole("button", { name: "Take the name" }).click();
  await expect(page.getByText(`@${username}`).first()).toBeVisible();

  // The hall is opened through the landing form so the seat carries the account; the rest of the table is seeded through the API.
  // The form only sends the token once the session has loaded, so the nav must name the account first.
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Account" })).toContainText(username);
  const form = page.getByRole("group", { name: "Create a hall" });
  await form.getByLabel("Your name").fill(NAMES[0]);
  await form.getByRole("button", { name: "Open the hall" }).click();
  await page.waitForURL(/\/room\/[A-Z]{5}$/);
  const code = page.url().slice(-5);
  const raw = await page.evaluate((c: string) => window.localStorage.getItem(`leetposter.credentials.${c}`), code);
  if (raw === null) throw new Error("no host credentials in storage");
  const host = JSON.parse(raw) as Credentials;
  const others = await Promise.all(NAMES.slice(1).map((name) => api<Credentials>(request, `/api/rooms/${code}/join`, { name })));
  const creds = [host, ...others];
  await act(request, host, { type: "setProblem", problem: PROBLEM });
  await act(request, host, { type: "setSettings", settings: { readMs: 0, buildMs: 5 * 60_000, maxSubmissions: 4 } });
  await act(request, host, { type: "start" });
  const views = await Promise.all(creds.map((c) => act(request, c, { type: "tick" })));
  expect(views[0]?.players.find((p) => p.id === host.playerId)?.username).toBe(username);
  const runner = creds.find((c) => c.playerId === views.find((v) => v.me.seats.includes("runner"))?.me.id);
  if (runner === undefined) throw new Error("no runner dealt");
  const view = await act(request, runner, { type: "submit", verdict: "accepted" });
  expect(view.phase).toBe("reveal");
  const hostView = views.find((v) => v.me.id === host.playerId);
  if (hostView === undefined) throw new Error("no host view");

  await page.goto("/me");
  await expect(page.getByRole("heading", { level: 1, name: `${username} record` })).toBeVisible();
  const halls = page.getByRole("list", { name: "Your halls" });
  await expect(halls.getByRole("listitem")).toHaveCount(1);
  await expect(halls).toContainText(`Hall ${code}`);
  await expect(halls).toContainText(hostView.me.isImposter ? "Lost." : "Won.");
  await expect(halls).toContainText("The judge accepted a submission.");
  await expect(halls).toContainText("4 at the table");
  const marks = page.getByRole("list", { name: "Achievements" });
  await expect(marks.getByRole("listitem")).toHaveCount(8);
  await expect(marks.getByRole("listitem").filter({ hasText: "First Candle" })).toContainText("Earned");
  await expect(marks.getByRole("listitem").filter({ hasText: "Long Night" })).toContainText("1 of 10");
});
