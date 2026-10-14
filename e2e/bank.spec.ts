import { expect, test } from "@playwright/test";
import * as Y from "yjs";
import type { Credentials } from "@/client/api";
import type { Problem } from "@/game/types";
import type { ProblemDetail } from "@/server/problems";
import { act, api, enterAs, openHall } from "./helpers";

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

  await page.getByRole("button", { name: "Or roll at random" }).click();
  const got = page.locator(".lobby-bank-got");
  await expect(got).toBeVisible({ timeout: 15_000 });
  const rolledTitle = ((await got.textContent()) ?? "").split(", rated")[0] ?? "";
  expect(rolledTitle.length).toBeGreaterThan(2);

  // The roll fills the form, so the host can still read and edit it before setting it.
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(rolledTitle);
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

test("a host can pick one exact problem rather than take what the dice give", async ({ page }) => {
  await openHall(page, "Cass");

  // Narrow by tag, then choose by name: the point is that nothing here is left to chance.
  await page.getByLabel("Search the bank").fill("prefix-sums");
  const pick = page.getByLabel("From the bank");
  await expect(pick).toBeEnabled();
  const options = await pick.locator("option").evaluateAll((els) => els.slice(1).map((e) => ({ value: e.getAttribute("value") ?? "", label: e.textContent })));
  expect(options.length).toBeGreaterThan(0);
  const wanted = options[0];
  if (wanted === undefined) throw new Error("the filter matched nothing");
  const title = (wanted.label.split(" \u00b7 ")[0] ?? wanted.label).trim();

  await pick.selectOption(wanted.value);
  await page.getByRole("button", { name: "Use this one" }).click();

  // Exactly the one chosen, not a roll from the same band.
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(title, { timeout: 15_000 });
  await expect(page.getByLabel("Link")).toHaveValue(new RegExp(`/problems/${wanted.value}$`));

  await page.getByLabel("Reading, minutes").fill("0");
  await page.getByRole("button", { name: "Keep settings" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Settings kept." })).toBeVisible();
  await page.getByRole("button", { name: /^Set the problem$/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "The problem is set." })).toBeVisible();
  await page.getByRole("button", { name: "Begin the reading" }).click();

  await expect(page.getByRole("heading", { name: "The Work" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Submit to the Judge" })).toBeVisible();
});

test("a pasted problem still gets the hand-recorded verdict, not the Judge", async ({ page }) => {
  await openHall(page, "Bea");

  await page.getByLabel("Title", { exact: true }).fill("A problem from elsewhere");
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

test("the Judge in the Hall takes Java: every case of a bank problem compiles and runs on the judge", async ({ page, request }) => {
  test.setTimeout(240_000);
  const id = "the-stuck-door-wedge";
  const detail = await (await request.get(`/api/problems/${id}`)).json() as ProblemDetail;
  const problem: Problem = {
    title: detail.title,
    url: `http://127.0.0.1:3000/problems/${id}`,
    statement: `${detail.statement}\n\nInput\n${detail.inputFormat}\n\nOutput\n${detail.outputFormat}`,
    tags: [...detail.tags],
    hints: [...detail.hints],
    constraints: detail.constraints,
    bankId: id,
    rating: detail.rating,
  };
  // A hall of one holds every seat, the Herald's included.
  const host = await api<Credentials>(request, "/api/rooms", { name: "Ada" });
  await act(request, host, { type: "setProblem", problem });
  await act(request, host, { type: "setSettings", settings: { readMs: 0, buildMs: 10 * 60_000, maxSubmissions: 4 } });
  await act(request, host, { type: "start" });
  await enterAs(page, host);

  const editor = page.getByRole("region", { name: "The shared editor" });
  await expect(editor.getByLabel("Language")).toBeEnabled();
  await editor.getByLabel("Language").selectOption("java");
  await editor.locator(".cm-content").click();
  // One line, so the editor's auto-indent has nothing to rewrite. A monotonic stack, as the bank's own Python does it.
  await page.keyboard.type(
    "import java.io.*; public class Main { public static void main(String[] a) throws IOException { StreamTokenizer in = new StreamTokenizer(new BufferedInputStream(System.in)); in.nextToken(); int n = (int) in.nval; long[] t = new long[n]; for (int i = 0; i < n; i++) { in.nextToken(); t[i] = (long) in.nval; } int[] ans = new int[n]; int[] st = new int[n]; int top = 0; for (int i = 0; i < n; i++) { while (top > 0 && t[st[top - 1]] < t[i]) ans[st[--top]] = i + 1; st[top++] = i; } StringBuilder sb = new StringBuilder(); for (int i = 0; i < n; i++) { if (i > 0) sb.append(' '); sb.append(ans[i]); } System.out.println(sb); } }",
  );

  // The Judge reads the file the hall saved, not this tab's copy: wait for the save to carry Java and the code.
  await expect
    .poll(
      async () => {
        const res = await request.get(`/api/rooms/${host.code}/doc`, { headers: { authorization: `Bearer ${host.token}` } });
        const saved = ((await res.json()) as { doc: string | null }).doc;
        if (saved === null) return "nothing saved";
        const doc = new Y.Doc();
        Y.applyUpdate(doc, Buffer.from(saved, "base64"));
        return `${doc.getMap<string>("meta").get("language") ?? "python"} ${String(doc.getText("code").toJSON().includes("StreamTokenizer"))}`;
      },
      { timeout: 15_000 },
    )
    .toBe("java true");

  // The Judge submits Accepted only after every case passes, and that ends the round on the spot, so
  // what is left to see is the Unmasking, not the Judge's own line.
  await page.getByRole("button", { name: "Submit to the Judge" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Unmasking" })).toBeVisible({ timeout: 200_000 });
  await expect(page.getByText("The judge accepted a submission.")).toBeVisible();
});
