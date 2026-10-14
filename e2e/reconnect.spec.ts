import { expect, test, type WebSocketRoute } from "@playwright/test";
import type { Credentials } from "@/client/api";
import { NAMES, PROBLEM, act, api, closePages, enterAs, newPages } from "./helpers";

test("the line to the hall drops and comes back: no raw socket error, and the file syncs again", async ({ browser, request }) => {
  const host = await api<Credentials>(request, "/api/rooms", { name: NAMES[0] });
  const guest = await api<Credentials>(request, `/api/rooms/${host.code}/join`, { name: NAMES[1] });
  await act(request, host, { type: "setProblem", problem: PROBLEM });
  await act(request, host, { type: "setSettings", settings: { readMs: 0, buildMs: 5 * 60_000, maxSubmissions: 4 } });
  await act(request, host, { type: "start" });

  const pages = await newPages(browser, 2);
  const [pageA, pageB] = pages;
  if (pageA === undefined || pageB === undefined) throw new Error("two pages");
  try {
    // A's Realtime socket goes through the test, still to the real server, so the test can close it as the server would.
    const sockets: WebSocketRoute[] = [];
    let redial: Promise<void> = Promise.resolve();
    await pageA.routeWebSocket(/\/realtime\/v1\/websocket/, async (ws) => {
      sockets.push(ws);
      await redial;
      ws.connectToServer();
    });
    await enterAs(pageA, host);
    await enterAs(pageB, guest);
    const editorA = pageA.getByRole("region", { name: "The shared editor" });
    const editorB = pageB.getByRole("region", { name: "The shared editor" });
    await expect(editorA.getByLabel("Language")).toBeEnabled();
    await expect(editorB.getByLabel("Language")).toBeEnabled();

    await editorA.locator(".cm-content").click();
    await pageA.keyboard.type("one");
    await expect(editorB.locator(".cm-content")).toContainText("one", { timeout: 5_000 });

    // A normal closure (1000) from the far end: what a Realtime restart or an idle cut looks like. The redial is held open
    // until the test lets it through, so "down" lasts long enough to look at.
    const live = sockets.at(-1);
    if (live === undefined) throw new Error("A never opened its socket");
    let letThrough = (): void => undefined;
    redial = new Promise((resolve) => {
      letThrough = resolve;
    });
    await live.close({ code: 1000 });

    // Down: said in the game's voice, never in the transport's ("socket closed: 1000"), and not as an error.
    await expect(editorA.getByRole("status")).toHaveText("The line to the hall dropped. Reconnecting; keep typing, your edits go out when it is back.");
    await expect(editorA.getByText(/socket closed/)).toHaveCount(0);
    await expect(editorA.getByRole("alert")).toHaveCount(0);
    // Both sides keep typing while A is cut off.
    await pageA.keyboard.type(" three");
    await editorB.locator(".cm-content").click();
    await pageB.keyboard.type(" two");
    await expect.poll(() => sockets.length, { timeout: 20_000 }).toBeGreaterThan(1);

    // Back: the notice goes, and what each side typed in the gap reaches the other.
    letThrough();
    await expect(editorA.getByRole("status")).toHaveCount(0, { timeout: 20_000 });
    await expect(editorA.locator(".cm-content")).toContainText("two", { timeout: 15_000 });
    await expect(editorB.locator(".cm-content")).toContainText("three", { timeout: 15_000 });
  } finally {
    await closePages(pages);
  }
});
