import { expect, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import type { Credentials } from "@/client/api";
import { SEAT_DUTIES } from "@/components/game/copy";
import { SEATS, type Action, type PlayerView, type Problem, type Seat } from "@/game/types";

/** No name is a substring of another, so button/roster text matches are unambiguous. */
export const NAMES = ["Ada", "Brin", "Cass", "Dov"] as const;

export const PROBLEM: Problem = {
  title: "Two Sum",
  url: "https://example.com/problems/two-sum",
  statement: "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.",
  examples: "nums = [2,7,11,15], target = 9 -> [0,1]",
  tags: ["array", "hash-table"],
  hints: ["Try a hash map.", "One pass is enough."],
  constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9",
};

/** What the Oracle writes on hint card 2 in the full-game test: nothing like the true hint, so the reveal marks it altered. */
export const ALTERED_HINT = "Sort first, then two pointers.";

export async function newPages(browser: Browser, count: number): Promise<Page[]> {
  return Promise.all(Array.from({ length: count }, async () => (await browser.newContext()).newPage()));
}

export async function closePages(pages: Page[]): Promise<void> {
  await Promise.all(pages.map((p) => p.context().close()));
}

async function hallCode(page: Page): Promise<string> {
  await page.waitForURL(/\/room\/[A-Z]{5}$/);
  return page.url().slice(-5);
}

/** Landing page, "Create a hall" form. Returns the hall code from the URL. */
export async function openHall(page: Page, name: string): Promise<string> {
  await page.goto("/");
  const form = page.getByRole("group", { name: "Create a hall" });
  await form.getByLabel("Your name").fill(name);
  await form.getByRole("button", { name: "Open the hall" }).click();
  return hallCode(page);
}

/** Landing page, "Join a hall" form. */
export async function joinHall(page: Page, code: string, name: string): Promise<void> {
  await page.goto("/");
  const form = page.getByRole("group", { name: "Join a hall" });
  await form.getByLabel("Your name").fill(name);
  await form.getByLabel("Hall code").fill(code);
  await form.getByRole("button", { name: "Take a seat" }).click();
  await hallCode(page);
}

/** Seats this page holds, read from the duty line each held panel shows. */
export async function heldSeats(page: Page): Promise<Seat[]> {
  const held: Seat[] = [];
  for (const seat of SEATS) {
    if ((await page.getByText(SEAT_DUTIES[seat], { exact: true }).count()) > 0) held.push(seat);
  }
  return held;
}

/** Name of the player the roster shows holding `seat`. Only during The Work (the roster is not shown while reading). */
export async function rosterHolder(page: Page, seatTitle: string): Promise<string> {
  const row = page.getByRole("region", { name: "At the table" }).getByRole("listitem").filter({ hasText: seatTitle });
  await expect(row).toHaveCount(1);
  const text = await row.innerText();
  const name = NAMES.find((n) => text.includes(n));
  if (name === undefined) throw new Error(`no known name in roster row: ${text}`);
  return name;
}

export async function api<T>(request: APIRequestContext, path: string, body: unknown): Promise<T> {
  const res = await request.post(path, { data: body });
  if (!res.ok()) throw new Error(`${path} -> ${String(res.status())} ${await res.text()}`);
  return (await res.json()) as T;
}

export function act(request: APIRequestContext, creds: Credentials, action: Action): Promise<PlayerView> {
  return api<PlayerView>(request, `/api/rooms/${creds.code}/act`, { token: creds.token, action });
}

/** Put saved credentials in this page's localStorage and open the hall, as a returning player would. */
export async function enterAs(page: Page, creds: Credentials): Promise<void> {
  await page.context().addInitScript((c: Credentials) => {
    window.localStorage.setItem(`leetposter.credentials.${c.code}`, JSON.stringify(c));
  }, creds);
  await page.goto(`/room/${creds.code}`);
}
