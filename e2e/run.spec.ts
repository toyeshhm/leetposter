import { expect, test, type Page } from "@playwright/test";
import type { Credentials } from "@/client/api";
import { NOT_RUNNABLE } from "@/components/editor/RunPanel";
import { NAMES, PROBLEM, act, api, closePages, enterAs, newPages } from "./helpers";

/** Replace the whole shared file with `code` from this page's keyboard. */
async function typeFile(page: Page, code: string): Promise<void> {
  const content = page.getByRole("region", { name: "The shared editor" }).locator(".cm-content");
  await content.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(code);
  await expect(content).toContainText(code);
}

test("the Run panel runs the shared Python file here, twice, cuts off a loop, and is Python and JavaScript only", async ({ browser, request }) => {
  const host = await api<Credentials>(request, "/api/rooms", { name: NAMES[0] });
  const guest = await api<Credentials>(request, `/api/rooms/${host.code}/join`, { name: NAMES[1] });
  await act(request, host, { type: "setProblem", problem: PROBLEM });
  await act(request, host, { type: "setSettings", settings: { readMs: 0, buildMs: 10 * 60_000, maxSubmissions: 4 } });
  expect((await act(request, host, { type: "start" })).phase).toBe("building");

  const pages = await newPages(browser, 2);
  const [pageA, pageB] = pages;
  if (pageA === undefined || pageB === undefined) throw new Error("two pages");
  try {
    await enterAs(pageA, host);
    await enterAs(pageB, guest);
    const editorA = pageA.getByRole("region", { name: "The shared editor" });
    await expect(editorA.getByLabel("Language")).toBeEnabled();
    await typeFile(pageA, "print(sum(map(int, input().split())))");

    await pageA.getByText("Run the file").click();
    const input = editorA.getByLabel("Input");
    const runButton = editorA.getByRole("button", { name: "Run", exact: true });
    const output = editorA.getByLabel("Output");
    await input.fill("2 3");
    await runButton.click();
    // The first run fetches Pyodide from the CDN.
    await expect(output).toContainText("5", { timeout: 60_000 });
    await expect(output).toContainText("exit in");

    // The second run reuses the loaded runtime.
    await input.fill("10 20");
    const started = Date.now();
    await runButton.click();
    await expect(output).toContainText("30", { timeout: 5_000 });
    expect(Date.now() - started).toBeLessThan(5_000);

    // B ran nothing and sees nothing: runs are local.
    await pageB.getByText("Run the file").click();
    await expect(pageB.getByText("Runs on your machine only; nobody else sees the output.")).toBeVisible();
    await expect(pageB.getByLabel("Output")).toHaveCount(0);

    // A loop is cut off after ten seconds and the worker thrown away.
    await typeFile(pageA, "while True: pass");
    await runButton.click();
    await expect(output).toContainText("Stopped after 10 s", { timeout: 15_000 });

    // JavaScript runs in the browser too, with readline() as stdin.
    await editorA.getByLabel("Language").selectOption("javascript");
    await typeFile(pageA, "console.log(Number(readline()) * 2)");
    await input.fill("21");
    await runButton.click();
    await expect(output).toContainText("42", { timeout: 15_000 });

    // Anything else needs a judge: the message replaces the button.
    await editorA.getByLabel("Language").selectOption("cpp");
    await expect(editorA.getByText(NOT_RUNNABLE)).toBeVisible();
    await expect(runButton).toHaveCount(0);
  } finally {
    await closePages(pages);
  }
});
