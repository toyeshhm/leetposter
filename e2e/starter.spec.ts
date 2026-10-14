import { expect, test } from "@playwright/test";
import type { Credentials } from "@/client/api";
import type { ParseResponse } from "@/server/parse/types";
import { NAMES, act, api, closePages, enterAs, newPages } from "./helpers";

test("a LeetCode problem opens the file on LeetCode's starter, once for the whole hall, and a new language swaps an untouched one", async ({ browser, request }) => {
  // The lobby's own lookup, so the starters are whatever LeetCode answers today.
  const { problem } = await api<ParseResponse>(request, "/api/parse", { text: "1" });
  const python = problem.starters?.python;
  const java = problem.starters?.java;
  if (python === undefined || java === undefined) throw new Error("LeetCode sent no Python or Java starter for Two Sum");

  const host = await api<Credentials>(request, "/api/rooms", { name: NAMES[0] });
  const guest = await api<Credentials>(request, `/api/rooms/${host.code}/join`, { name: NAMES[1] });
  await act(request, host, { type: "setProblem", problem });
  await act(request, host, { type: "setSettings", settings: { readMs: 0, buildMs: 10 * 60_000, maxSubmissions: 4 } });
  await act(request, host, { type: "start" });

  const pages = await newPages(browser, 2);
  const [pageA, pageB] = pages;
  if (pageA === undefined || pageB === undefined) throw new Error("two pages");
  try {
    // Both open the empty file at once; both apply the starter, and it still goes in once.
    await Promise.all([enterAs(pageA, host), enterAs(pageB, guest)]);
    const editorA = pageA.getByRole("region", { name: "The shared editor" });
    const editorB = pageB.getByRole("region", { name: "The shared editor" });
    for (const editor of [editorA, editorB]) {
      await expect(editor.getByLabel("Language")).toBeEnabled();
      await expect(editor.locator(".cm-content")).toContainText("def twoSum(self, nums");
    }
    // Give the two seats' copies time to meet, then count.
    await pageA.waitForTimeout(3_000);
    for (const editor of [editorA, editorB]) {
      expect(((await editor.locator(".cm-content").innerText()).match(/def twoSum/g) ?? []).length).toBe(1);
    }

    // Untouched, the starter gives way to the new language's, for everyone.
    await editorA.getByLabel("Language").selectOption("java");
    for (const editor of [editorA, editorB]) {
      await expect(editor.locator(".cm-content")).toContainText("public int[] twoSum(int[] nums, int target)", { timeout: 10_000 });
      await expect(editor.locator(".cm-content")).not.toContainText("def twoSum");
    }

    // Once someone has written in it, a language change leaves the file alone.
    await editorB.locator(".cm-content").click();
    await pageB.keyboard.press("ControlOrMeta+End");
    await pageB.keyboard.type("// ours");
    await expect(editorA.locator(".cm-content")).toContainText("// ours", { timeout: 10_000 });
    await editorA.getByLabel("Language").selectOption("python");
    await expect(editorB.getByLabel("Language")).toHaveValue("python", { timeout: 10_000 });
    for (const editor of [editorA, editorB]) {
      await expect(editor.locator(".cm-content")).toContainText("public int[] twoSum");
      await expect(editor.locator(".cm-content")).toContainText("// ours");
    }
  } finally {
    await closePages(pages);
  }
});
