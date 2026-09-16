import { describe, expect, it } from "vitest";
import { CATALOG } from "@/economy/catalog";
import { THEME_VARS, themeCss, type Mode } from "@/components/cosmetics/themes";

/*
 * themes.ts has always claimed this file verifies it, and until now the file did not exist, so the
 * claim was worth nothing. Every number below is computed from the tokens themselves: OKLCH to
 * linear sRGB to WCAG 2 relative luminance. If a theme is edited into a state a player cannot read,
 * this fails rather than shipping.
 */

const MODES: readonly Mode[] = ["light", "dark"];

/** OKLab to linear sRGB (Björn Ottosson's matrices). Linear light is exactly what WCAG luminance wants. */
function linearRgb(L: number, C: number, h: number): [number, number, number] {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function parse(value: string): [number, number, number] {
  const m = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(value);
  if (m === null) throw new Error(`not an oklch value: ${value}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function luminance(value: string): number {
  const [r, g, b] = linearRgb(...parse(value)).map((c) => Math.min(Math.max(c, 0), 1)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

function inGamut(value: string): boolean {
  return linearRgb(...parse(value)).every((c) => c >= -0.001 && c <= 1.001);
}

/** The eight tokens a set must resolve to a literal colour; the rest may be `var()` aliases. */
const LITERAL = ["--bg", "--surface", "--raised", "--line", "--ink", "--muted", "--accent", "--accent-deep", "--danger", "--danger-ink", "--success", "--success-ink"] as const;

function set(mode: Mode, id: string): Record<string, string> {
  const vars = THEME_VARS[mode][id];
  if (vars === undefined) throw new Error(`no ${mode} set for ${id}`);
  return { ...vars };
}

const themeIds = CATALOG.filter((item) => item.kind === "theme").map((item) => item.id);

describe("the twelve colour schemes", () => {
  it("has a light and a dark set for every theme in the catalog, and no orphans", () => {
    expect(themeIds.length).toBeGreaterThan(0);
    for (const mode of MODES) expect(Object.keys(THEME_VARS[mode]).sort()).toEqual([...themeIds].sort());
  });

  it("resolves every colour token to a value inside sRGB", () => {
    for (const mode of MODES) {
      for (const id of themeIds) {
        const vars = set(mode, id);
        for (const token of LITERAL) {
          const value = vars[token];
          expect(value, `${mode} ${id} ${token} is missing`).toBeDefined();
          expect(inGamut(value ?? ""), `${mode} ${id} ${token} = ${value ?? ""} is outside sRGB`).toBe(true);
        }
      }
    }
  });

  it("carries body text at 4.5:1 on every surface it can sit on", () => {
    for (const mode of MODES) {
      for (const id of themeIds) {
        const v = set(mode, id);
        for (const ink of ["--ink", "--muted"] as const) {
          for (const ground of ["--bg", "--surface", "--raised"] as const) {
            const ratio = contrast(v[ink] ?? "", v[ground] ?? "");
            expect(ratio, `${mode} ${id}: ${ink} on ${ground} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
  });

  it("carries the accent as text on the page, and page-coloured text on the accent", () => {
    for (const mode of MODES) {
      for (const id of themeIds) {
        const v = set(mode, id);
        const onPage = contrast(v["--accent"] ?? "", v["--bg"] ?? "");
        expect(onPage, `${mode} ${id}: accent on bg is ${onPage.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
        // --on-accent is var(--bg) in every set: the primary button is accent-filled with page-coloured text.
        for (const fill of ["--accent", "--accent-deep"] as const) {
          const ratio = contrast(v["--bg"] ?? "", v[fill] ?? "");
          expect(ratio, `${mode} ${id}: on-accent text on ${fill} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("carries the verdicts: the danger fill holds its own text, and both seals read on the page", () => {
    for (const mode of MODES) {
      for (const id of themeIds) {
        const v = set(mode, id);
        // Dark puts bone ink on oxblood; light puts paper on it. Either way the button has to be readable.
        const onDanger = contrast(mode === "dark" ? (v["--ink"] ?? "") : (v["--bg"] ?? ""), v["--danger"] ?? "");
        expect(onDanger, `${mode} ${id}: danger button text is ${onDanger.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
        for (const seal of ["--danger-ink", "--success-ink"] as const) {
          const ratio = contrast(v[seal] ?? "", v["--bg"] ?? "");
          expect(ratio, `${mode} ${id}: ${seal} on bg is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("keeps the seals red and green in every set, Ink included, since colour is load-bearing there", () => {
    for (const mode of MODES) {
      for (const id of themeIds) {
        const v = set(mode, id);
        const hue = (token: string): number => parse(v[token] ?? "")[2];
        expect(hue("--danger"), `${mode} ${id} danger hue`).toBeGreaterThan(0);
        expect(hue("--danger"), `${mode} ${id} danger hue`).toBeLessThan(60);
        expect(hue("--success"), `${mode} ${id} success hue`).toBeGreaterThan(120);
        expect(hue("--success"), `${mode} ${id} success hue`).toBeLessThan(180);
      }
    }
  });

  it("puts light on paper and dark on stone, never the other way round", () => {
    for (const id of themeIds) {
      const light = parse(set("light", id)["--bg"] ?? "")[0];
      const dark = parse(set("dark", id)["--bg"] ?? "")[0];
      expect(light, `${id} light bg`).toBeGreaterThan(0.9);
      expect(dark, `${id} dark bg`).toBeLessThan(0.25);
      // PRODUCT.md rejects cream and parchment: a light page stays near-neutral, never a warm tint.
      expect(parse(set("light", id)["--bg"] ?? "")[1], `${id} light bg chroma`).toBeLessThanOrEqual(0.012);
    }
  });

  it("renders a declaration block for a real set and nothing for an unknown one", () => {
    expect(themeCss("theme-ember", "light")).toContain("--bg:");
    expect(themeCss("theme-ember", "dark")).toContain("--bg:");
    expect(themeCss("theme-ember", "light")).not.toEqual(themeCss("theme-ember", "dark"));
    expect(themeCss("no-such-theme", "light")).toBe("");
  });
});
