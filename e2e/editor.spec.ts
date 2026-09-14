import { expect, test, type APIRequestContext } from "@playwright/test";
import type { Credentials } from "@/client/api";
import type { PlayerView } from "@/game/types";
import { withRoom } from "@/server/store";
import { NAMES, PROBLEM, act, api, closePages, enterAs, newPages } from "./helpers";

/** The hall's saved editor state, as the room page reads it. */
async function savedDoc(request: APIRequestContext, creds: Credentials): Promise<string | null> {
  const res = await request.get(`/api/rooms/${creds.code}/doc`, { headers: { authorization: `Bearer ${creds.token}` } });
  if (!res.ok()) throw new Error(`doc -> ${String(res.status())} ${await res.text()}`);
  return ((await res.json()) as { doc: string | null }).doc;
}

test("two seats share one file: edits, the language, the saved state, and the lock during a tribunal", async ({ browser, request }) => {
  // Seeded through the API: reading 0 s lands the hall in the building before any browser opens.
  const host = await api<Credentials>(request, "/api/rooms", { name: NAMES[0] });
  const others = await Promise.all(NAMES.slice(1).map((name) => api<Credentials>(request, `/api/rooms/${host.code}/join`, { name })));
  const creds = [host, ...others];
  await act(request, host, { type: "setProblem", problem: PROBLEM });
  await act(request, host, { type: "setSettings", settings: { readMs: 0, buildMs: 5 * 60_000, maxSubmissions: 4 } });
  const started = await act(request, host, { type: "start" });
  expect(started.phase).toBe("building");
  const [a, b] = creds;
  if (a === undefined || b === undefined) throw new Error("two seats");

  const pages = await newPages(browser, 2);
  const [pageA, pageB] = pages;
  if (pageA === undefined || pageB === undefined) throw new Error("two pages");
  try {
    await enterAs(pageA, a);
    await enterAs(pageB, b);
    const editorA = pageA.getByRole("region", { name: "The shared editor" });
    const editorB = pageB.getByRole("region", { name: "The shared editor" });
    await expect(editorA.locator(".cm-content")).toHaveAttribute("contenteditable", "true");
    await expect(editorB.locator(".cm-content")).toHaveAttribute("contenteditable", "true");
    // The picker unlocks once the saved state (none yet) has been fetched.
    await expect(editorA.getByLabel("Language")).toBeEnabled();
    await expect(editorB.getByLabel("Language")).toBeEnabled();

    // A types; B sees it within five seconds (with A's named caret beside it, so "contains").
    await editorA.locator(".cm-content").click();
    await pageA.keyboard.type("print(1)");
    await expect(editorA.locator(".cm-content")).toContainText("print(1)");
    await expect(editorB.locator(".cm-content")).toContainText("print(1)", { timeout: 5_000 });

    // B picks C++; A's picker follows.
    await expect(editorB.getByLabel("Language")).toHaveValue("python");
    await editorB.getByLabel("Language").selectOption("cpp");
    await expect(editorA.getByLabel("Language")).toHaveValue("cpp", { timeout: 5_000 });

    // Two seconds after the last local change the state is saved; a reload comes back from it, not from B.
    await expect.poll(() => savedDoc(request, a), { timeout: 10_000 }).not.toBeNull();
    await pageB.close();
    await pageA.reload();
    const reloadedA = pageA.getByRole("region", { name: "The shared editor" });
    await expect(reloadedA.locator(".cm-content")).toContainText("print(1)");
    await expect(reloadedA.getByLabel("Language")).toHaveValue("cpp");
    await expect(reloadedA.locator(".cm-content")).toHaveAttribute("contenteditable", "true");

    // A tribunal locks the keyboard: the freeze window opens three build-minutes in, so move the persisted clock.
    await withRoom(host.code, (s) => ({ ...s, clock: { ...s.clock, buildElapsedMs: s.settings.freezeOpensAfterMs } }));
    const frozen: PlayerView = await act(request, b, { type: "callFreeze" });
    expect(frozen.phase).toBe("freeze");
    await expect(pageA.getByText("Hands off the keyboard until the vote is in.")).toBeVisible();
    await expect(reloadedA.locator(".cm-content")).toHaveAttribute("contenteditable", "false");
    await expect(reloadedA.getByLabel("Language")).toBeDisabled();
    await expect(reloadedA.locator(".cm-content")).toContainText("print(1)");
  } finally {
    await closePages(pages);
  }
});
