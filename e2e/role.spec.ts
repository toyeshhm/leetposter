import { expect, test, type Page } from "@playwright/test";
import type { Credentials } from "@/client/api";
import { NAMES, PROBLEM, act, api, closePages, enterAs, newPages } from "./helpers";

/** Everything on screen now, as a glance over the shoulder would read it: a shut <details> contributes nothing to innerText. */
const onScreen = (page: Page): Promise<string> => page.locator("body").innerText();
/** The role's own words. "Leetposter" alone is also the site's name, so the bare word proves nothing. */
const ROLE_WORDS = /the Leetposter|You are (crew|the)|Lie well/i;

test("the role stays shut until asked for, looks the same for crew and Leetposter, and is written in red", async ({ browser, request }) => {
  const host = await api<Credentials>(request, "/api/rooms", { name: NAMES[0] });
  const others = await Promise.all(NAMES.slice(1).map((name) => api<Credentials>(request, `/api/rooms/${host.code}/join`, { name })));
  const creds = [host, ...others];
  await act(request, host, { type: "setProblem", problem: PROBLEM });
  await act(request, host, { type: "setSettings", settings: { readMs: 0, buildMs: 5 * 60_000, maxSubmissions: 4 } });
  await act(request, host, { type: "start" });
  const views = await Promise.all(creds.map((c) => act(request, c, { type: "tick" })));
  const changeling = creds.find((c) => views.some((v) => v.me.id === c.playerId && v.me.isImposter));
  const crewmate = creds.find((c) => views.some((v) => v.me.id === c.playerId && !v.me.isImposter));
  if (changeling === undefined || crewmate === undefined) throw new Error("one of each");

  const pages = await newPages(browser, 2);
  const [maskPage, crewPage] = pages;
  if (maskPage === undefined || crewPage === undefined) throw new Error("two pages");
  try {
    await enterAs(maskPage, changeling);
    await enterAs(crewPage, crewmate);
    for (const page of pages) {
      const role = page.getByRole("group", { name: "Your role" });
      await expect(role.locator("summary")).toHaveText("Your role Open to look; shut it before anyone leans over.");
      await expect(role.locator(".role-body")).toBeHidden();
    }
    // Shut, the Leetposter's screen names the role nowhere: not in the header, not on the roster, not beside the seat.
    expect(await onScreen(maskPage)).not.toMatch(ROLE_WORDS);
    await expect(maskPage.getByRole("complementary", { name: "Clock and table" }).getByText("Leetposter", { exact: true })).toHaveCount(0);
    await expect(maskPage.getByTitle("You are the Leetposter")).toHaveCount(0);

    await maskPage.getByRole("group", { name: "Your role" }).locator("summary").click();
    await expect(maskPage.locator(".role-body")).toContainText("You are the Leetposter.");
    await expect(maskPage.locator(".role-body")).toContainText("Lie well.");
    await crewPage.getByRole("group", { name: "Your role" }).locator("summary").click();
    await expect(crewPage.locator(".role-body")).toContainText("You are crew.");

    // Red for both, so the colour gives nothing away either.
    for (const page of pages) {
      const [ink, danger] = await page.locator(".role-name").evaluate((el) => {
        const probe = document.createElement("span");
        probe.style.color = "var(--danger-ink)";
        el.append(probe);
        const colours = [getComputedStyle(el).color, getComputedStyle(probe).color];
        probe.remove();
        return colours;
      });
      expect(ink).toBe(danger);
    }

    // Shutting it again hides it again.
    await maskPage.getByRole("group", { name: "Your role" }).locator("summary").click();
    await expect(maskPage.locator(".role-body")).toBeHidden();
    expect(await onScreen(maskPage)).not.toMatch(ROLE_WORDS);
  } finally {
    await closePages(pages);
  }
});

test("the role is shut during the Reading too", async ({ page, request }) => {
  const host = await api<Credentials>(request, "/api/rooms", { name: NAMES[0] });
  await act(request, host, { type: "setProblem", problem: PROBLEM });
  const started = await act(request, host, { type: "start" });
  expect(started.phase).toBe("reading");
  await enterAs(page, host);
  const role = page.getByRole("group", { name: "Your role" });
  await expect(role.locator("summary")).toBeVisible();
  await expect(role.locator(".role-body")).toBeHidden();
  // A hall of one is its own Leetposter, and still nothing says so until it is opened.
  expect(await onScreen(page)).not.toMatch(ROLE_WORDS);
  await role.locator("summary").click();
  await expect(role.locator(".role-body")).toContainText("You are the Leetposter.");
});
