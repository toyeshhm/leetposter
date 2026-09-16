import { expect, test, type Page } from "@playwright/test";

/*
 * Appearance is the one setting a guest owns, so it is tested as a guest. The account settings
 * (name, password) are exercised against the real Supabase in tests/integration/auth.test.ts;
 * what matters here is that the choice survives a reload and that it lands before the first paint,
 * which is the whole reason the inline script in layout.tsx exists.
 */

/**
 * The page's background lightness. Chrome serializes a computed colour authored in OKLCH back as
 * `oklch(L C H)`, so the L is read straight off it; anything else (an older engine returning rgb)
 * is converted. Throwing on an unrecognised format matters: a silent 0 here would have made every
 * "is it dark" assertion below pass whether or not the page was dark at all.
 */
async function bgLightness(page: Page): Promise<number> {
  const value = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const ok = /^oklch\(\s*([\d.]+)/.exec(value);
  if (ok !== null) return Number(ok[1]);
  const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value);
  if (rgb === null) throw new Error(`cannot read a lightness from ${value}`);
  const [r, g, b] = rgb.slice(1).map(Number) as [number, number, number];
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

test("\"system\" follows the machine, in both directions", async ({ browser }) => {
  for (const [scheme, floor] of [
    ["dark", "dark"],
    ["light", "light"],
  ] as const) {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    await page.goto("/settings");
    await expect(page.getByRole("radio", { name: "Follow the system" })).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.dataset.mode), `system under ${scheme}`).toBe(floor);
    const l = await bgLightness(page);
    if (scheme === "light") expect(l).toBeGreaterThan(0.8);
    else expect(l).toBeLessThan(0.3);
    await context.close();
  }
});

test("a chosen scheme overrides the machine, survives a reload, and lands before the first paint", async ({ browser }) => {
  // The machine says light; the player says dark. The player wins, and keeps winning after a reload.
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  await page.goto("/settings");
  expect(await bgLightness(page)).toBeGreaterThan(0.8);

  await page.getByRole("radio", { name: "Dark" }).check();
  await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
  expect(await bgLightness(page)).toBeLessThan(0.3);

  await page.reload();
  await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
  expect(await bgLightness(page)).toBeLessThan(0.3);

  // On a page this session has never opened, the inline script has it right at the first paint.
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.dataset.mode)).toBe("dark");
  expect(await bgLightness(page)).toBeLessThan(0.3);

  // And back again: light on a machine set to light is still an explicit choice, not a default.
  await page.goto("/settings");
  await page.getByRole("radio", { name: "Light" }).check();
  expect(await bgLightness(page)).toBeGreaterThan(0.8);
  await context.close();
});

test("a guest is told what needs an account, and a signed-out player is sent to the door", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText("Everything else on this page needs an account.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in or make an account" })).toBeVisible();
  // The name and password forms belong to an account and must not be offered to a guest.
  await expect(page.getByRole("button", { name: "Change name" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Change password" })).toHaveCount(0);
});

test("motion is opt-in: with reduced motion the hero is fully drawn and nothing animates", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const drawn = await page.evaluate(() => {
    const light = document.querySelector(".hero-light > path");
    const flame = document.querySelector(".hero-flame");
    return {
      offset: light === null ? "missing" : getComputedStyle(light).strokeDashoffset,
      lightAnimation: light === null ? "missing" : getComputedStyle(light).animationName,
      flameAnimation: flame === null ? "missing" : getComputedStyle(flame).animationName,
    };
  });
  // The page is correct with the animation doing nothing: the hatching is drawn, not waiting to be.
  expect(drawn.offset).toBe("0px");
  expect(drawn.lightAnimation).toBe("none");
  expect(drawn.flameAnimation).toBe("none");
  await context.close();
});
