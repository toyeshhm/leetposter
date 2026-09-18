import { expect, test, type Page } from "@playwright/test";

/*
 * The site layer: the footer, the content and legal pages, and the error and metadata routes.
 * The point of this spec is that a footer full of links is exactly the kind of thing that rots
 * quietly, so every link it offers is followed here rather than eyeballed.
 */

const DOCS = ["/rules", "/about", "/terms", "/privacy", "/refunds", "/conduct", "/accessibility"] as const;

/** Pages that carry the site chrome. A live round deliberately carries neither footer nor legal links. */
const CHROME = ["/", "/halls", "/problems", "/leaderboard", "/store", "/pass", "/settings", "/account", ...DOCS] as const;

async function overflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test("every link in the footer resolves, and none of them 404", async ({ page, request }) => {
  await page.goto("/");
  const foot = page.getByRole("contentinfo");
  await expect(foot).toBeVisible();

  const hrefs = await foot.getByRole("link").evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? ""));
  expect(hrefs.length).toBeGreaterThan(10);

  const seen = new Set<string>();
  for (const href of hrefs) {
    if (href === "" || seen.has(href)) continue;
    seen.add(href);
    expect(href, "the footer links only within the site").toMatch(/^\//);
    const res = await request.get(href);
    expect(res.status(), `${href} is dead`).toBe(200);
  }
  // Every document the footer promises is actually one of the pages it links to.
  for (const doc of DOCS) expect(seen, `${doc} is not linked from the footer`).toContain(doc);
});

test("the footer is on the pages with chrome and never under a live round", async ({ page }) => {
  for (const path of CHROME) {
    await page.goto(path);
    await expect(page.getByRole("contentinfo"), `${path} has no footer`).toBeVisible();
  }
});

test("no page scrolls sideways on a phone, chrome included", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 900 });
  for (const path of CHROME) {
    await page.goto(path);
    expect(await overflow(page), `${path} overflows horizontally at 400px`).toBeLessThanOrEqual(1);
  }
});

test("each document stands on its own: a title, a heading, and real prose", async ({ page }) => {
  for (const path of DOCS) {
    await page.goto(path);
    // layout.tsx templates "%s | Leetposter"; a page that hand-writes the suffix says it twice.
    const title = await page.title();
    expect(title, `${path} has no title of its own`).toMatch(/\| Leetposter$/);
    expect(title.match(/Leetposter/g) ?? [], `${path} double-suffixes its title`).toHaveLength(1);
    await expect(page.getByRole("heading", { level: 1 }), `${path} has no h1`).toBeVisible();
    const words = ((await page.locator("main").innerText()).match(/\S+/g) ?? []).length;
    expect(words, `${path} is a stub`).toBeGreaterThan(120);
  }
});

test("nothing ships a bracketed placeholder or a TODO", async ({ page }) => {
  for (const path of [...CHROME, "/no-such-page"]) {
    await page.goto(path);
    const text = await page.locator("body").innerText();
    expect(text, `${path} carries a placeholder`).not.toMatch(/\[(NAME|PLACE|ADDRESS|ENTITY|YEAR|TODO|TBD)[^\]]*\]/i);
    expect(text, `${path} carries a TODO`).not.toMatch(/\bTODO\b|\bLorem ipsum\b/i);
  }
});

test("an unknown route is a 404 that belongs to the game and offers a way on", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /hall|bank|play|home/i }).first()).toBeVisible();
});

test("robots and the sitemap agree, and keep live rounds out of the index", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const robotsBody = await robots.text();
  expect(robotsBody).toMatch(/Disallow: \/room/);
  expect(robotsBody).toMatch(/Sitemap: https?:\/\//);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const doc of DOCS) expect(xml, `${doc} is missing from the sitemap`).toContain(doc);
  expect(xml, "a live round must never be in the sitemap").not.toMatch(/\/room\//);
  expect(xml, "the design gallery is not public").not.toMatch(/\/design/);
});
