import { expect, test } from "@playwright/test";
import type { Credentials } from "@/client/api";
import { SEAT_TITLES } from "@/components/art/Sigils";
import { NAMES, PROBLEM, act, api, closePages, newPages, openHall } from "./helpers";

test("a listed hall shows on the board; a spectator sees every seat and learns the Changeling only at the reveal", async ({ browser, request }) => {
  const pages = await newPages(browser, 2);
  const [host, watcher] = pages;
  if (host === undefined || watcher === undefined) throw new Error("two pages");
  try {
    const code = await openHall(host, NAMES[0]);
    // The board switch lives with the host's controls in the lobby.
    const board = host.getByRole("group", { name: "The board" });
    const listed = board.getByRole("checkbox", { name: "List this hall on the board" });
    await expect(listed).toBeEnabled();
    await expect(listed).not.toBeChecked();
    await listed.check();
    await expect(listed).toBeChecked();
    await host.reload();
    await expect(host.getByRole("checkbox", { name: "List this hall on the board" })).toBeChecked();

    // The rest of the table and the deal go through the API; the host's own seat comes from the browser's storage.
    const raw = await host.evaluate((c: string) => window.localStorage.getItem(`leetposter.credentials.${c}`), code);
    if (raw === null) throw new Error("host credentials missing");
    const hostCreds = JSON.parse(raw) as Credentials;
    const others = await Promise.all(NAMES.slice(1).map((name) => api<Credentials>(request, `/api/rooms/${code}/join`, { name })));
    const creds = [hostCreds, ...others];
    await act(request, hostCreds, { type: "setProblem", problem: PROBLEM });
    await act(request, hostCreds, { type: "setSettings", settings: { readMs: 0, buildMs: 5 * 60_000, maxSubmissions: 4 } });
    await act(request, hostCreds, { type: "start" });
    await expect(host.getByRole("heading", { level: 1, name: "The Work" })).toBeVisible();
    await expect(host.getByRole("link", { name: "Share the watch link" })).toHaveAttribute("href", `/room/${code}/watch`);

    await watcher.goto("/halls");
    const row = watcher.getByRole("table", { name: "Listed halls" }).getByRole("row").filter({ hasText: code });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(NAMES[0]);
    await expect(row).toContainText("The Work");
    await expect(row).toContainText("4 of 8");
    await row.getByRole("link", { name: "Watch" }).click();
    await watcher.waitForURL(`**/room/${code}/watch`);

    await expect(watcher.getByRole("heading", { level: 1, name: "The Work" })).toBeVisible();
    await expect(watcher.getByText("Watching", { exact: true })).toBeVisible();
    await expect(watcher.getByText("Input: nums = [2,7,11,15], target = 9")).toBeVisible();
    await expect(watcher.getByRole("timer")).toBeVisible();
    const panel = (seat: keyof typeof SEAT_TITLES) => watcher.getByRole("group", { name: SEAT_TITLES[seat] });
    await expect(panel("tagger").getByRole("list", { name: "Topic tags" }).getByRole("listitem")).toHaveText(PROBLEM.tags);
    await expect(panel("oracle").getByRole("list", { name: "Hints, in order" }).getByRole("listitem")).toHaveText(PROBLEM.hints);
    await expect(panel("bounds")).toContainText("2 <= nums.length <= 10^4");
    await expect(panel("runner").getByRole("link", { name: PROBLEM.title })).toHaveAttribute("href", PROBLEM.url);
    for (const seat of ["tagger", "oracle", "bounds", "runner"] as const) await expect(panel(seat)).toContainText(/Held by (Ada|Brin|Cass|Dov)\./);
    const roster = watcher.getByRole("region", { name: "At the table" });
    await expect(roster.getByRole("listitem")).toHaveCount(4);
    await expect(roster).toContainText("host");
    // Nothing on the page names the Changeling before the reveal.
    await expect(watcher.getByText(/Changeling/)).toHaveCount(0);
    await expect(watcher.getByRole("region", { name: "The Changeling" })).toHaveCount(0);
    await expect(watcher.getByText("No cards yet. The record begins with the first one.")).toBeVisible();

    const views = await Promise.all(creds.map((c) => act(request, c, { type: "tick" })));
    const runner = creds[views.findIndex((v) => v.me.seats.includes("runner"))];
    if (runner === undefined) throw new Error("no runner dealt");
    await act(request, runner, { type: "submit", verdict: "accepted" });

    await expect(watcher.getByRole("heading", { level: 1, name: "Unmasking" })).toBeVisible();
    await expect(watcher.getByRole("heading", { name: "The Crew win" })).toBeVisible();
    const unmasked = watcher.getByRole("region", { name: "The Changeling" });
    const changeling = await unmasked.getByRole("heading", { level: 2 }).innerText();
    expect(NAMES).toContain(changeling);
    await expect(unmasked).toContainText("was the Changeling, seated as");
    await expect(roster.getByRole("listitem").filter({ hasText: changeling })).toContainText("Changeling");
    await expect(watcher.getByRole("region", { name: "Every seat, every card" }).getByRole("group", { name: changeling })).toContainText("the Changeling");
  } finally {
    await closePages(pages);
  }
});

test("an unknown hall says so and points at the board", async ({ page }) => {
  await page.goto("/room/ZZZZZ/watch");
  // Next's route announcer is an empty role=alert too, so the notice is read inside main.
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("No hall called ZZZZZ.");
  await expect(page.getByRole("link", { name: "See the halls board" })).toHaveAttribute("href", "/halls");
});
