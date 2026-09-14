/*
 * Rasterizes the brand files with Playwright's Chromium (node strips the types; no build step):
 *   src/app/icon.svg  -> src/app/favicon.ico (16, 32, 48 PNG frames) and src/app/apple-icon.png (180)
 *   the landing hero  -> src/app/opengraph-image.png (1200x630), screenshotted from a transient page
 *                        written to src/app/brand/og/page.tsx and served by `next dev` on 3104.
 * Run: node scripts/render-brand.ts [icons|og]   (default: both)
 */
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { chromium, type Browser } from "@playwright/test";

const APP = new URL("../src/app/", import.meta.url);
const OG_PORT = 3104;
const OG_PAGE = new URL("brand/og/page.tsx", APP);
const TILE = "#14181a";

/** ICO container: 6-byte header, one 16-byte entry per frame, then the PNGs. */
function ico(frames: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = 6 + 16 * frames.length;
  const entries = frames.map(({ size, png }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size === 256 ? 0 : size, 0);
    e.writeUInt8(size === 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...frames.map((f) => f.png)]);
}

async function renderIcons(browser: Browser): Promise<void> {
  const svg = await readFile(new URL("icon.svg", APP), "utf8");
  const shot = async (size: number, bg: string, inset = 0): Promise<Buffer> => {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    const side = size - 2 * inset;
    await page.setContent(`<style>html,body{margin:0;background:${bg}}svg{display:block;margin:${String(inset)}px;width:${String(side)}px;height:${String(side)}px}</style>${svg}`);
    const png = await page.screenshot({ type: "png", omitBackground: bg === "transparent" });
    await page.close();
    return png;
  };
  const frames: { size: number; png: Buffer }[] = [];
  for (const size of [16, 32, 48]) frames.push({ size, png: await shot(size, "transparent") });
  await writeFile(new URL("favicon.ico", APP), ico(frames));
  await writeFile(new URL("apple-icon.png", APP), await shot(180, TILE, 12));
}

const OG_SOURCE = `import type { ReactElement } from "react";
import { HeroPlate } from "@/components/art";

/* Transient: written by scripts/render-brand.ts, screenshotted at 1200x630, then deleted. */
export default function OgPage(): ReactElement {
  return (
    <div style={{ width: 1200, height: 630, display: "grid", gridTemplateColumns: "470px 1fr", alignItems: "center", gap: 20, padding: "0 40px 0 64px", overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 100, lineHeight: 1, letterSpacing: "0.02em", fontWeight: 400 }}>Leetposter</h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 30, lineHeight: 1.35, color: "var(--muted)" }}>Four to eight programmers, one hard problem, and one of you is lying.</p>
      </div>
      <HeroPlate size={600} decorative />
    </div>
  );
}
`;

async function renderOg(browser: Browser): Promise<void> {
  await mkdir(new URL(".", OG_PAGE), { recursive: true });
  await writeFile(OG_PAGE, OG_SOURCE);
  const dev = spawn(new URL("../../node_modules/.bin/next", APP).pathname, ["dev", "--hostname", "127.0.0.1", "--port", String(OG_PORT)], { stdio: "ignore" });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    for (let attempt = 0; ; attempt += 1) {
      try {
        await page.goto(`http://127.0.0.1:${String(OG_PORT)}/brand/og`, { waitUntil: "networkidle", timeout: 60_000 });
        break;
      } catch (err: unknown) {
        if (attempt === 5) throw err;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());
    await writeFile(new URL("opengraph-image.png", APP), await page.screenshot({ type: "png" }));
    await page.close();
  } finally {
    await rm(new URL("brand/", APP), { recursive: true, force: true });
    await new Promise<void>((resolve) => {
      dev.once("exit", () => { resolve(); });
      dev.kill("SIGTERM");
    });
    // next dev typed the transient route; drop it so tsc and the build do not chase a deleted page.
    await rm(new URL("../../.next/dev/types/", APP), { recursive: true, force: true });
  }
}

const what = process.argv[2] ?? "all";
const browser = await chromium.launch();
try {
  if (what !== "og") await renderIcons(browser);
  if (what !== "icons") await renderOg(browser);
} finally {
  await browser.close();
}
