import { expect, test, type Page } from "@playwright/test";
import type { Credentials } from "@/client/api";
import { SEAT_TITLES } from "@/components/art/Sigils";
import type { PlayerView, Seat } from "@/game/types";
import { withRoom } from "@/server/store";
import { ALTERED_HINT, NAMES, PROBLEM, act, api, closePages, enterAs, heldSeats, joinHall, newPages, openHall, rosterHolder } from "./helpers";

async function seatMap(pages: Page[]): Promise<Record<Seat, Page>> {
  const found: Partial<Record<Seat, Page>> = {};
  for (const page of pages) for (const seat of await heldSeats(page)) found[seat] = page;
  const { tagger, oracle, bounds, runner } = found;
  if (tagger === undefined || oracle === undefined || bounds === undefined || runner === undefined) {
    throw new Error(`seats not all dealt: ${Object.keys(found).join(",")}`);
  }
  return { tagger, oracle, bounds, runner };
}

test("full game through the UI: crew win on an accepted submission", async ({ browser }) => {
  const pages = await newPages(browser, 4);
  const [host, p2, p3, p4] = pages;
  if (host === undefined || p2 === undefined || p3 === undefined || p4 === undefined) throw new Error("four pages");
  try {
    const code = await openHall(host, NAMES[0]);
    await joinHall(p2, code, NAMES[1]);
    await joinHall(p3, code, NAMES[2]);
    await joinHall(p4, code, NAMES[3]);
    await expect(host.getByText("4 of 8 seats taken.")).toBeVisible();
    for (const page of [p2, p3, p4]) await expect(page.getByRole("status")).toContainText("Waiting for the host");

    const problem = host.getByRole("group", { name: "The problem" });
    await problem.getByLabel("Title").fill(PROBLEM.title);
    await problem.getByLabel("Link").fill(PROBLEM.url);
    await problem.getByLabel("Statement").fill(PROBLEM.statement);
    await problem.getByLabel("Tags", { exact: true }).fill(PROBLEM.tags.join(", "));
    await problem.getByLabel("Hints", { exact: true }).fill(PROBLEM.hints.join("\n"));
    await problem.getByLabel("Constraints").fill(PROBLEM.constraints);
    await problem.getByRole("button", { name: "Set the problem" }).click();
    await expect(problem.getByRole("status")).toHaveText("The problem is set. Panels are dealt when the reading begins.");

    // Reading 6 s: long enough for every page to poll the reading screen at least once and be asserted on.
    // Building 5 min is the reducer's floor (mergeSettings), so the freeze window (opens at 3 min) never opens here.
    const clock = host.getByRole("group", { name: "The clock" });
    await clock.getByLabel("Reading, minutes").fill("0.1");
    await clock.getByLabel("Building, minutes").fill("5");
    await clock.getByLabel("Submissions").fill("4");
    await clock.getByRole("button", { name: "Keep settings" }).click();
    await expect(clock.getByRole("status")).toHaveText("Settings kept.");

    await host.getByRole("button", { name: "Begin the reading" }).click();
    await Promise.all(pages.map((p) => expect(p.getByRole("heading", { level: 1, name: "The Reading" })).toBeVisible()));
    await Promise.all(pages.map((p) => expect(p.getByRole("timer")).toBeVisible()));
    await expect(host.getByText("Input: nums = [2,7,11,15], target = 9")).toBeVisible();

    const seats = await seatMap(pages);
    // Everyone, the Changeling included, holds exactly one seat and sees only that panel.
    for (const page of pages) expect(await heldSeats(page)).toHaveLength(1);
    const readingTags = seats.tagger.getByRole("group", { name: SEAT_TITLES.tagger }).getByRole("list", { name: "Topic tags" });
    await expect(readingTags.getByRole("listitem")).toHaveText(PROBLEM.tags);
    const readingLink = seats.runner.getByRole("group", { name: SEAT_TITLES.runner }).getByRole("link", { name: PROBLEM.title });
    await expect(readingLink).toHaveAttribute("href", PROBLEM.url);
    await expect(seats.oracle.getByRole("list", { name: "Hints, in order" }).getByRole("listitem")).toHaveText(PROBLEM.hints);
    await expect(seats.bounds.getByRole("group", { name: SEAT_TITLES.bounds })).toContainText("2 <= nums.length <= 10^4");

    await Promise.all(pages.map((p) => expect(p.getByRole("heading", { level: 1, name: "The Work" })).toBeVisible()));

    // The roster agrees with the panels each page saw while reading.
    const nameOf = (page: Page): string => NAMES[pages.indexOf(page)] ?? "";
    for (const seat of ["tagger", "oracle", "bounds", "runner"] as const) {
      expect(await rosterHolder(host, SEAT_TITLES[seat])).toBe(nameOf(seats[seat]));
    }

    const tagger = seats.tagger.getByRole("group", { name: SEAT_TITLES.tagger });
    await tagger.getByLabel("Tag 1").fill(PROBLEM.tags[0] ?? "");
    await tagger.getByLabel("Tag 2").fill(PROBLEM.tags[1] ?? "");
    await tagger.getByRole("button", { name: "Declare tags" }).click();
    await expect(tagger.getByText("Your tags are on the record.")).toBeVisible();

    // The Oracle's form is prefilled with the true hint; hint 1 goes out as written, hint 2 is rewritten.
    const oracle = seats.oracle.getByRole("group", { name: SEAT_TITLES.oracle });
    await expect(oracle.getByLabel("Hint 1")).toHaveValue(PROBLEM.hints[0] ?? "");
    await oracle.getByRole("button", { name: "Reveal hint 1 as written", exact: true }).click();
    await expect(oracle.getByText("1 of 2 revealed.")).toBeVisible();
    await expect(oracle.getByRole("button", { name: "Reveal hint 2 as written", exact: true })).toBeEnabled();
    await oracle.getByLabel("Hint 2").fill(ALTERED_HINT);
    await oracle.getByRole("button", { name: "Reveal hint 2", exact: true }).click();
    await expect(oracle.getByText("Every hint is on the record.")).toBeVisible();

    const bounds = seats.bounds.getByRole("group", { name: SEAT_TITLES.bounds });
    await bounds.getByLabel("Declare a bound").fill("2 <= nums.length <= 10^4");
    await bounds.getByRole("button", { name: "Declare bound" }).click();
    await expect(bounds.getByLabel("Declare a bound")).toHaveValue("");

    const record = host.getByRole("region", { name: "The record", exact: true });
    await expect(record).toContainText(`Declares tags: ${PROBLEM.tags.join(", ")}`);
    await expect(record).toContainText(`Hint 1: ${PROBLEM.hints[0] ?? ""}`);
    await expect(record).toContainText(`Hint 2: ${ALTERED_HINT}`);
    await expect(record).toContainText("Bound: 2 <= nums.length <= 10^4");

    // The freeze window opens after 3 minutes of work (Settings.freezeOpensAfterMs, not host-adjustable): the bell is closed.
    const bell = p2.getByRole("button", { name: "Call a tribunal" });
    await expect(bell).toBeDisabled();
    await expect(p2.getByText(/^Opens after 3 minutes of work, 0[0-4]:\d\d to go\.$/)).toBeVisible();

    const runner = seats.runner.getByRole("group", { name: SEAT_TITLES.runner });
    for (const [n, failing] of [["1", "nums = [3,3], target = 6"], ["2", "nums = [1], target = 2"]] as const) {
      await runner.getByLabel("Rejected as").selectOption(n === "1" ? "wrong-answer" : "time-limit");
      await runner.getByLabel("Failing case").fill(failing);
      await runner.getByRole("button", { name: "Record rejection" }).click();
      await expect(runner.getByLabel("Failing case")).toHaveValue("");
      await expect(record).toContainText(failing);
    }
    await expect(runner.getByText("2 of 4 submissions left.")).toBeVisible();
    await expect(record).toContainText("Rejected: Wrong answer");
    await expect(record).toContainText("Rejected: Time limit exceeded");
    await expect(host.getByText("2 of 4", { exact: true })).toBeVisible();

    await runner.getByRole("button", { name: "Accepted" }).click();
    await runner.getByRole("button", { name: "Yes, accepted" }).click();

    await Promise.all(pages.map((p) => expect(p.getByRole("heading", { level: 1, name: "Unmasking" })).toBeVisible()));
    await expect(host.getByRole("heading", { name: "The Crew win" })).toBeVisible();
    await expect(host.getByText("The judge accepted a submission.")).toBeVisible();

    const unmasked = host.getByRole("region", { name: "The Changeling" });
    const changeling = await unmasked.getByRole("heading", { level: 2 }).innerText();
    expect(NAMES).toContain(changeling);
    await expect(unmasked).toContainText("was the Changeling, seated as");
    await expect(unmasked).toContainText("Never cast out.");

    const taggerCard = host.getByRole("region", { name: "Every seat, every card" }).getByRole("group", { name: nameOf(seats.tagger) });
    await expect(taggerCard.getByRole("list", { name: "True tags" }).getByRole("listitem")).toHaveText(PROBLEM.tags);
    await expect(taggerCard).toContainText(`Declared ${PROBLEM.tags.join(" true ")} true`, { useInnerText: true });
    const oracleCard = host.getByRole("region", { name: "Every seat, every card" }).getByRole("group", { name: nameOf(seats.oracle) });
    await expect(oracleCard.getByRole("list", { name: "True hints" }).getByRole("listitem")).toHaveText(PROBLEM.hints);
    await expect(oracleCard).toContainText(`Hint 1: ${PROBLEM.hints[0] ?? ""} as written`, { useInnerText: true });
    await expect(oracleCard).toContainText(`Hint 2: ${ALTERED_HINT} altered`, { useInnerText: true });
    await expect(oracleCard).toContainText(`The hint reads: ${PROBLEM.hints[1] ?? ""}`);
    await expect(host.getByText("No tribunal was called, and the Reckoning never came.")).toBeVisible();
  } finally {
    await closePages(pages);
  }
});

test("four rejections, then the Reckoning casts out a crewmate: the Changeling wins", async ({ browser, request }) => {
  // Seeded through the API: reading 0 s, four rejections land the room in the final vote before any browser opens.
  const host = await api<Credentials>(request, "/api/rooms", { name: NAMES[0] });
  const others = await Promise.all(NAMES.slice(1).map((name) => api<Credentials>(request, `/api/rooms/${host.code}/join`, { name })));
  const creds = [host, ...others];
  await act(request, host, { type: "setProblem", problem: PROBLEM });
  await act(request, host, { type: "setSettings", settings: { readMs: 0, buildMs: 5 * 60_000, maxSubmissions: 4 } });
  await act(request, host, { type: "start" });
  const views = await Promise.all(creds.map((c) => act(request, c, { type: "tick" })));
  const runnerView = views.find((v) => v.me.seats.includes("runner"));
  const runner = creds.find((c) => c.playerId === runnerView?.me.id);
  if (runner === undefined) throw new Error("no runner dealt");
  let view: PlayerView | undefined;
  for (let n = 1; n <= 4; n++) {
    view = await act(request, runner, { type: "submit", verdict: "rejected", category: "wrong-answer", failingCase: `case ${String(n)}` });
  }
  expect(view?.phase).toBe("finalVote");
  const imposter = views.find((v) => v.me.isImposter)?.me.id;
  const target = view?.players.find((p) => p.id !== imposter);
  if (target === undefined) throw new Error("no crewmate to vote for");

  const pages = await newPages(browser, 4);
  try {
    await Promise.all(
      creds.map(async (c, i) => {
        const page = pages[i];
        if (page === undefined) throw new Error("four pages");
        await enterAs(page, c);
      }),
    );
    await Promise.all(pages.map((p) => expect(p.getByRole("heading", { level: 1, name: "The Reckoning" })).toBeVisible()));
    const [first] = pages;
    if (first === undefined) throw new Error("four pages");
    await expect(first.getByText("Every submission was rejected. One last vote, and no one may skip.")).toBeVisible();
    await expect(first.getByRole("button", { name: "Skip" })).toHaveCount(0);
    await expect(first.getByText("Ballots open when the discussion ends.")).toBeVisible();
    await expect(first.getByText("4 of 4", { exact: true })).toBeVisible();

    // Settings.finalDiscussionMs is a fixed 60 s the host cannot shorten; the ballot opens only after it.
    const ballots = pages.map((p) => p.getByRole("group", { name: "Ballot" }).getByRole("button", { name: target.name }));
    // The fourth ballot resolves the round at once, so the ballot itself is only checked on the first page.
    for (const [i, ballot] of ballots.entries()) {
      await expect(ballot).toBeEnabled({ timeout: 75_000 });
      await ballot.click();
      if (i === 0) await expect(ballot).toHaveAttribute("aria-pressed", "true");
    }

    await Promise.all(pages.map((p) => expect(p.getByRole("heading", { level: 1, name: "Unmasking" })).toBeVisible()));
    await expect(first.getByRole("heading", { name: "The Changeling wins" })).toBeVisible();
    await expect(first.getByText("The Reckoning cast out a crewmate. The Changeling is still at the table.")).toBeVisible();
    await expect(first.getByRole("region", { name: "The Changeling" })).toContainText("Never cast out.");
    const votes = first.getByRole("heading", { name: "The Reckoning", level: 3 }).locator("..");
    await expect(votes).toContainText(`${target.name} was cast out.`);
    await expect(votes.getByRole("listitem")).toHaveCount(4);
  } finally {
    await closePages(pages);
  }
});

test("a tribunal from the Work: the ballot opens after the discussion, everyone skips, nobody is cast out", async ({ browser, request }) => {
  const host = await api<Credentials>(request, "/api/rooms", { name: NAMES[0] });
  const others = await Promise.all(NAMES.slice(1).map((name) => api<Credentials>(request, `/api/rooms/${host.code}/join`, { name })));
  const creds = [host, ...others];
  await act(request, host, { type: "setProblem", problem: PROBLEM });
  await act(request, host, { type: "setSettings", settings: { readMs: 0, buildMs: 5 * 60_000 } });
  await act(request, host, { type: "start" });
  // The bell opens three build-minutes in (Settings.freezeOpensAfterMs); move the persisted clock instead of waiting.
  await withRoom(host.code, (s) => ({ ...s, clock: { ...s.clock, buildElapsedMs: s.settings.freezeOpensAfterMs } }));

  const desks = await newPages(browser, 3);
  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  const pages = [...desks, phone];
  try {
    await Promise.all(
      creds.map(async (c, i) => {
        const page = pages[i];
        if (page === undefined) throw new Error("four pages");
        await enterAs(page, c);
      }),
    );
    const [first] = pages;
    if (first === undefined) throw new Error("four pages");
    const bell = first.getByRole("button", { name: "Call a tribunal" });
    await expect(bell).toBeEnabled();
    await bell.click();
    await Promise.all(pages.map((p) => expect(p.getByRole("heading", { level: 1, name: "Tribunal" })).toBeVisible()));
    await expect(first.getByText(`${NAMES[0]} called a tribunal. Hands off the editor.`)).toBeVisible();
    await expect(first.getByText("Ballots open when the discussion ends.")).toBeVisible();
    await expect(first.getByText("The Work, paused")).toBeVisible();
    // On a phone the ballot is the first thing on the screen, not under the clock and the roster.
    await expect(phone.getByRole("button", { name: "Skip" })).toBeInViewport();

    // The discussion is a fixed 90 s: move the persisted round back so the ballot opens now, with a long vote window.
    await withRoom(host.code, (s) => ({ ...s, votes: s.votes.map((r) => ({ ...r, startedAt: r.startedAt - r.discussionMs, voteMs: 120_000 })) }));
    for (const [i, page] of pages.entries()) {
      const skip = page.getByRole("button", { name: "Skip" });
      await expect(skip).toBeEnabled();
      await skip.click();
      if (i === 0) {
        await expect(skip).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByText("Your ballot is in. You may change it until the vote closes.")).toBeVisible();
        // The ballot is the server's record, so a reload does not forget it.
        await page.reload();
        await expect(page.getByText("Your ballot is in. You may change it until the vote closes.")).toBeVisible();
      }
    }
    await Promise.all(pages.map((p) => expect(p.getByRole("heading", { level: 1, name: "The Work" })).toBeVisible()));
    await expect(first.getByRole("status").filter({ hasText: "The tribunal cast out no one." })).toBeVisible();
    await expect(first.getByText("You have rung your bell. One tribunal per player.")).toBeVisible();
  } finally {
    await closePages(pages);
  }
});

test("a stale token or corrupt storage falls back to the join form; an unknown hall says so", async ({ browser, request }) => {
  const host = await api<Credentials>(request, "/api/rooms", { name: NAMES[0] });
  const pages = await newPages(browser, 2);
  const [stale, corrupt] = pages;
  if (stale === undefined || corrupt === undefined) throw new Error("two pages");
  try {
    // Next's route announcer is an empty role=alert too, so the notices are read inside the join frame.
    await enterAs(stale, { ...host, token: "0".repeat(32) });
    await expect(stale.getByRole("group", { name: "Take a seat" }).getByRole("alert")).toHaveText("This seat is no longer yours.");
    await stale.getByLabel("Your name").fill(NAMES[1]);
    await stale.getByRole("button", { name: "Join the hall" }).click();
    await expect(stale.getByRole("heading", { level: 1, name: "The Gathering" })).toBeVisible();
    await expect(stale.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0);
    await expect(stale.getByText("2 of 8 seats taken.")).toBeVisible();

    await corrupt.context().addInitScript((code: string) => {
      window.localStorage.setItem(`leetposter.credentials.${code}`, "null");
    }, host.code);
    await corrupt.goto(`/room/${host.code}`);
    await expect(corrupt.getByRole("button", { name: "Join the hall" })).toBeVisible();
    await expect(corrupt.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0);
    await corrupt.goto("/room/ZZZZZ");
    await corrupt.getByLabel("Your name").fill(NAMES[2]);
    await corrupt.getByRole("button", { name: "Join the hall" }).click();
    await expect(corrupt.getByRole("group", { name: "Take a seat" }).getByRole("alert")).toHaveText("No hall called ZZZZZ.");
    await expect(corrupt.getByRole("link", { name: "Find another hall" })).toHaveAttribute("href", "/");
  } finally {
    await closePages(pages);
  }
});
