import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import type { Credentials } from "@/client/api";
import { questsFor, type Quest } from "@/economy/quests";
import { SEASONS } from "@/economy/seasons";
import { satisfies } from "@/server/economy/quests";
import { supabase } from "@/server/supabase";
import { NAMES, PROBLEM, act, api } from "./helpers";

/*
 * The economy end to end: sit a hall, take what it paid, wear what it earned, and see it at the
 * next table. Nothing is seeded by hand; every candle and every badge comes through the same
 * after-hall hook the game already runs.
 */

const run = Date.now().toString(36);
const username = `e2e${run}`.slice(0, 20);
const password = `pw-${run}-economy`;

/** The cheapest thing on the shelf is a common at 150 candles, so one hall never pays for one. */
const COMMON_PRICE = "150";

/** The season /pass will name: the one running, or the next one seeded. */
const now = new Date().toISOString();
const season = SEASONS.find((s) => s.startsAt <= now && now < s.endsAt) ?? SEASONS.find((s) => s.startsAt > now);

test.afterAll(async () => {
  const { data, error } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (error !== null) throw new Error(error.message);
  if (data === null) return;
  const gone = await supabase.auth.admin.deleteUser(data.id);
  if (gone.error !== null) throw new Error(gone.error.message);
});

/**
 * Open a hall from the landing form, so the seat carries the account, and seed the other three
 * seats through the API. Leaves the page on The Work, where the roster is.
 */
async function openHallToWork(page: Page, request: APIRequestContext): Promise<{ host: Credentials; all: Credentials[] }> {
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
  await act(request, host, { type: "setProblem", problem: PROBLEM });
  await act(request, host, { type: "setSettings", settings: { readMs: 0, buildMs: 5 * 60_000, maxSubmissions: 4 } });
  await act(request, host, { type: "start" });
  await expect(page.getByRole("heading", { level: 1, name: "The Work" })).toBeVisible();
  return { host, all: [host, ...others] };
}

/** The runner submits an accepted solution, which ends the hall and runs the after-hall hook. */
async function toReveal(request: APIRequestContext, all: Credentials[]): Promise<void> {
  const views = await Promise.all(all.map((c) => act(request, c, { type: "tick" })));
  const runner = all.find((c) => c.playerId === views.find((v) => v.me.seats.includes("runner"))?.me.id);
  if (runner === undefined) throw new Error("no runner dealt");
  const view = await act(request, runner, { type: "submit", verdict: "accepted" });
  expect(view.phase).toBe("reveal");
}

test("a guest sees the shelf and its prices, and is told where the wallet is", async ({ page }) => {
  await page.goto("/store");
  await expect(page.getByRole("heading", { level: 1, name: "The store" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Sign in or sign up");
  // Prices live in the catalog, so they are on the shelf for anyone. The buttons are not.
  await expect(page.getByRole("list", { name: "Faces" }).getByRole("listitem").first()).toContainText(COMMON_PRICE);
  await expect(page.getByRole("button", { name: "Buy" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Equip" })).toHaveCount(0);
});

test("one hall pays a quest and lights a badge; the badge is worn at the next table", async ({ page, request }) => {
  await page.goto("/account");
  await page.getByRole("button", { name: "New here? Sign up" }).click();
  await page.getByLabel("Email").fill(`${username}@example.test`);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await page.getByLabel("Username").fill(username);
  await page.getByRole("button", { name: "Take the name" }).click();
  await expect(page.getByText(`@${username}`).first()).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Account" });
  const candles = nav.getByRole("link", { name: "Your candles" });
  await expect(candles).toContainText("0");

  const first = await openHallToWork(page, request);
  await toReveal(request, first.all);

  // The pass: the season it names, the track, and the till that is not there.
  await page.goto("/pass");
  await expect(page.getByRole("heading", { level: 1, name: season?.name ?? "The pass" })).toBeVisible();
  await expect(page.getByRole("group", { name: "The tier track" })).toBeVisible();
  await page.getByRole("button", { name: "Get the paid pass" }).click();
  // Next's route announcer is an empty role=alert too, so the notice is read inside main.
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("The store has no till yet.");

  // The board is drawn from the date, so which six quests are up is not ours to choose. What the hall
  // paid is: every quest whose rule this account's own recorded row satisfies has moved by one.
  const seated = await supabase.from("profiles").select("id").eq("username", username).single();
  if (seated.error !== null) throw new Error(seated.error.message);
  const results = await supabase.from("game_results").select("*").eq("user_id", seated.data.id);
  if (results.error !== null) throw new Error(results.error.message);
  const played = results.data[0];
  if (played === undefined) throw new Error("the hall left no row behind");
  const { daily, weekly } = questsFor(new Date());
  const counted = [...daily, ...weekly].filter((quest) => satisfies(quest.rule, played, { problem: PROBLEM, tribunal: false }));
  const questRow = (quest: Quest): Locator =>
    page
      .getByRole("list", { name: `${quest.cadence === "daily" ? "Today" : "This week"}, quests` })
      .getByRole("listitem")
      .filter({ hasText: quest.name });
  for (const quest of [...daily, ...weekly]) {
    await expect(questRow(quest)).toContainText(`${counted.includes(quest) ? "1" : "0"} of ${String(quest.goal)}`);
  }

  // Claiming moves the count in the header, not just this panel. A board with no one-hall quest on it
  // pays nothing yet, and says so; either way the wallet below is whatever was actually taken.
  const finished = counted.find((quest) => quest.goal === 1);
  const purse = finished?.candles ?? 0;
  if (finished === undefined) {
    await expect(page.getByRole("button", { name: "Claim" })).toHaveCount(0);
  } else {
    await questRow(finished).getByRole("button", { name: "Claim" }).click();
    await expect(questRow(finished).getByText("Claimed")).toBeVisible();
  }
  await expect(candles).toContainText(String(purse));

  // No quest pays enough for the cheapest common, and the shelf says so on the item rather than hiding the price.
  await page.goto("/store");
  await expect(page.getByText("You hold")).toContainText(String(purse));
  const face = page.getByRole("list", { name: "Faces" }).getByRole("listitem").first();
  await expect(face).toContainText(COMMON_PRICE);
  await expect(face).toContainText("Not enough candles.");
  await expect(face.getByRole("button", { name: "Buy" })).toBeDisabled();

  // The hall lit First Candle, so the badge is on the shelf at /me and can be worn from there.
  await page.goto("/me");
  await expect(page.getByRole("list", { name: "Your badges" }).getByRole("listitem").filter({ hasText: "First Candle" })).toBeVisible();
  const badgeSlot = page.getByRole("group", { name: "Badge" });
  const worn = badgeSlot.getByRole("radio", { name: "First Candle" });
  await expect(worn).not.toBeChecked();
  // The radio is drawn by its label (sr-only input, .loadout-choice face), so wear it the way a player does.
  await badgeSlot.locator("label", { hasText: "First Candle" }).click();
  await expect(worn).toBeChecked();

  // A new hall: the roster draws the badge beside the name.
  const second = await openHallToWork(page, request);
  const roster = page.getByRole("region", { name: "At the table" });
  await expect(roster.getByRole("img", { name: "First Candle" })).toBeVisible();
  await toReveal(request, second.all);

  await page.goto("/me");
  await expect(page.getByRole("list", { name: "Your halls" }).getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("group", { name: "Badge" }).getByRole("radio", { name: "First Candle" })).toBeChecked();
});
