import { expect, test } from "@playwright/test";
import { openHall } from "./helpers";

/*
 * The bank and the Judge in the Hall shipped unreachable: nothing in the UI ever set `bankId`, so
 * `JudgeAction` never rendered and the hidden tests were never fetched. Every test passed, because
 * they all called setProblem with a bankId directly and skipped the lobby that could not produce one.
 *
 * This spec goes through the lobby like a host. If the roller stops setting bankId, the Judge
 * disappears again and this fails, which is the whole point of driving it from the UI.
 */

test("a host rolls a problem out of the bank and the Herald gets the Judge, not a verdict box", async ({ page }) => {
  await openHall(page, "Ada");

  const bank = page.getByText(/problems written for the Hall/);
  await expect(bank).toBeVisible();

  // The bands carry real counts read off the index, and an empty band cannot be chosen.
  const band = page.getByLabel("Rating band");
  await expect(band).toBeVisible();
  await band.selectOption("b3");

  await page.getByRole("button", { name: "Roll a problem" }).click();
  const got = page.getByText(/^Rolled /);
  await expect(got).toBeVisible({ timeout: 15_000 });
  const rolledTitle = ((await got.textContent()) ?? "").replace(/^Rolled /, "").split(", rated")[0] ?? "";
  expect(rolledTitle.length).toBeGreaterThan(2);

  // The roll fills the form, so the host can still read and edit it before setting it.
  await expect(page.getByLabel("Title")).toHaveValue(rolledTitle);
  await expect(page.getByLabel("Link")).toHaveValue(/\/problems\/[a-z0-9-]+$/);

  await page.getByRole("button", { name: /^Set the problem$/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "The problem is set." })).toBeVisible();

  // Straight into the Work: the reading clock is a lobby control, so this stays a UI-only path.
  await page.getByLabel("Reading, minutes").fill("0");
  await page.getByRole("button", { name: "Keep settings" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Settings kept." })).toBeVisible();
  await page.getByRole("button", { name: "Begin the reading" }).click();

  // A solo host holds every seat, the Herald's included, so the Judge is on screen in the Work.
  await expect(page.getByRole("heading", { name: "The Work" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("The Judge in the Hall runs the file against every test")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit to the Judge" })).toBeVisible();
  // The hand-recorded Accepted button belongs to a pasted problem and must not be offered here.
  await expect(page.getByRole("button", { name: /^Accepted$/ })).toHaveCount(0);
});

test("a pasted problem still gets the hand-recorded verdict, not the Judge", async ({ page }) => {
  await openHall(page, "Bea");

  await page.getByLabel("Title").fill("A problem from elsewhere");
  await page.getByLabel("Link").fill("https://example.test/x");
  await page.getByLabel("Statement").fill("Solve it.\n\nExample 1:\nInput: 1\nOutput: 1");
  await page.getByLabel("Tags").fill("array");
  await page.getByLabel("Hints").fill("Try a map.");
  await page.getByLabel("Constraints").fill("1 <= n <= 10");
  await page.getByRole("button", { name: /^Set the problem$/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "The problem is set." })).toBeVisible();

  await page.getByLabel("Reading, minutes").fill("0");
  await page.getByRole("button", { name: "Keep settings" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Settings kept." })).toBeVisible();
  await page.getByRole("button", { name: "Begin the reading" }).click();
  await expect(page.getByRole("heading", { name: "The Work" })).toBeVisible({ timeout: 30_000 });

  await expect(page.getByText("Record the verdict exactly as the judge gave it.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit to the Judge" })).toHaveCount(0);
});
