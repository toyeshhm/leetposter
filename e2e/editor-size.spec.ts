import { expect, test } from "@playwright/test";
import type { Credentials } from "@/client/api";
import { NAMES, PROBLEM, act, api, enterAs } from "./helpers";

test("the file can be made bigger: by its corner, or all the way to the window and back", async ({ page, request }) => {
  const host = await api<Credentials>(request, "/api/rooms", { name: NAMES[0] });
  await act(request, host, { type: "setProblem", problem: PROBLEM });
  await act(request, host, { type: "setSettings", settings: { readMs: 0, buildMs: 5 * 60_000, maxSubmissions: 4 } });
  await act(request, host, { type: "start" });
  await enterAs(page, host);
  const editor = page.getByRole("region", { name: "The shared editor" });
  const body = editor.locator(".editor-body");
  await expect(editor.getByLabel("Language")).toBeEnabled();
  const height = async (selector: string): Promise<number> => (await editor.locator(selector).boundingBox())?.height ?? 0;

  // The corner: the browser's own vertical resize, and CodeMirror fills whatever height it is given.
  await expect(body).toHaveCSS("resize", "vertical");
  const before = await height(".editor-body");
  await body.evaluate((el: HTMLElement, px) => {
    el.style.height = `${String(px)}px`;
  }, before + 200);
  await expect.poll(() => height(".cm-editor")).toBeGreaterThan(before + 150);

  // Expand: the editor takes the window, run panel included, and still takes keys.
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error("no viewport");
  await editor.getByRole("button", { name: "Expand" }).click();
  await expect(editor.getByRole("button", { name: "Shrink" })).toHaveAttribute("aria-pressed", "true");
  const filled = await editor.boundingBox();
  expect(filled).toMatchObject({ x: 0, y: 0, width: viewport.width, height: viewport.height });
  expect(await height(".editor-body")).toBeGreaterThan(viewport.height * 0.7);
  await expect(editor.getByText("Run the file")).toBeVisible();
  await editor.locator(".cm-content").click();
  await page.keyboard.type("print(1)");
  await expect(editor.locator(".cm-content")).toContainText("print(1)");

  // Shrink: back into the page, at the height the corner left it.
  await editor.getByRole("button", { name: "Shrink" }).click();
  await expect(editor.getByRole("button", { name: "Expand" })).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => height(".editor-body")).toBeLessThan(viewport.height * 0.9);
  expect(Math.round(await height(".editor-body"))).toBe(Math.round(before + 200));
});
