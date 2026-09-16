import { THEME_TOKENS } from "@/economy/catalog";

/*
 * Site colour schemes, catalog kind "theme". `THEME_TOKENS` in the catalog carries the eight
 * chrome tokens; a theme also has to answer for the verdicts, the focus ring and the page hatch,
 * or a themed page would keep Ember's amber focus ring. These are the complete sets: put them on
 * :root (or any ancestor) and every token in globals.css is accounted for.
 *
 * Verified against WCAG 2 in tests/unit/cosmetics-themes.test.ts: ink and muted clear 4.5:1 on
 * bg, surface and raised in every theme, the accent clears 3:1 and carries bg-coloured text at
 * 4.5:1, and every value is inside sRGB. Verdict hues stay red and green in every theme, Ink
 * included: the seals are the one place colour is load-bearing, and they are also words.
 */

/** The page's 4px diagonal hatch, tinted with the theme's own ink at 2.2%. */
function hatchOf(ink: string): string {
  return `repeating-linear-gradient(-45deg, transparent 0 3px, ${ink.replace(")", " / 0.022)")} 3px 4px)`;
}

const EMBER_INK = "oklch(0.92 0.012 85)";
const MOSS_INK = "oklch(0.92 0.014 110)";
const OXBLOOD_INK = "oklch(0.92 0.012 60)";
const FROST_INK = "oklch(0.94 0.008 220)";
const INK_INK = "oklch(0.98 0 0)";
const GILT_INK = "oklch(0.93 0.02 90)";

/** Every theme item id to the full set of overrides it puts on :root. */
export const THEME_VARS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  // Ember is the default, so its "overrides" are globals.css restated: equipping it undoes another theme.
  "theme-ember": {
    "--bg": "oklch(0.15 0.006 200)",
    "--surface": "oklch(0.2 0.008 200)",
    "--raised": "oklch(0.25 0.008 200)",
    "--line": "oklch(0.34 0.01 200)",
    "--ink": EMBER_INK,
    "--muted": "oklch(0.7 0.014 85)",
    "--accent": "oklch(0.78 0.155 78)",
    "--accent-deep": "oklch(0.66 0.14 62)",
    "--on-accent": "var(--bg)",
    "--danger": "oklch(0.44 0.15 25)",
    "--danger-ink": "oklch(0.72 0.17 25)",
    "--success": "oklch(0.62 0.15 150)",
    "--success-ink": "oklch(0.72 0.15 150)",
    "--focus": "var(--accent)",
    "--art-spot": "var(--accent)",
    "--tx-hatch": hatchOf(EMBER_INK),
  },
  "theme-moss": {
    ...THEME_TOKENS["theme-moss"],
    "--on-accent": "var(--bg)",
    "--danger": "oklch(0.44 0.15 25)",
    "--danger-ink": "oklch(0.72 0.17 25)",
    "--success": "oklch(0.62 0.15 150)",
    // Moss is green and so is Accepted: the success text goes lighter than the accent so a verdict never reads as chrome.
    "--success-ink": "oklch(0.78 0.13 150)",
    "--focus": "var(--accent)",
    "--art-spot": "var(--accent)",
    "--tx-hatch": hatchOf(MOSS_INK),
  },
  "theme-oxblood": {
    ...THEME_TOKENS["theme-oxblood"],
    "--on-accent": "var(--bg)",
    // The room is already red: Rejected goes deeper and its text goes oranger than the accent.
    "--danger": "oklch(0.42 0.16 15)",
    "--danger-ink": "oklch(0.73 0.15 32)",
    "--success": "oklch(0.62 0.15 150)",
    "--success-ink": "oklch(0.76 0.14 150)",
    "--focus": "var(--accent)",
    "--art-spot": "var(--accent)",
    "--tx-hatch": hatchOf(OXBLOOD_INK),
  },
  "theme-frost": {
    ...THEME_TOKENS["theme-frost"],
    "--on-accent": "var(--bg)",
    "--danger": "oklch(0.46 0.15 25)",
    "--danger-ink": "oklch(0.72 0.17 25)",
    "--success": "oklch(0.62 0.15 150)",
    "--success-ink": "oklch(0.76 0.14 155)",
    "--focus": "var(--accent)",
    "--art-spot": "var(--accent)",
    "--tx-hatch": hatchOf(FROST_INK),
  },
  "theme-ink": {
    ...THEME_TOKENS["theme-ink"],
    "--on-accent": "var(--bg)",
    "--danger": "oklch(0.4 0.14 25)",
    "--danger-ink": "oklch(0.72 0.16 25)",
    "--success": "oklch(0.58 0.14 150)",
    "--success-ink": "oklch(0.76 0.13 150)",
    "--focus": "var(--accent)",
    "--art-spot": "var(--accent)",
    "--tx-hatch": hatchOf(INK_INK),
  },
  "theme-gilt": {
    ...THEME_TOKENS["theme-gilt"],
    "--on-accent": "var(--bg)",
    "--danger": "oklch(0.44 0.15 25)",
    "--danger-ink": "oklch(0.72 0.17 25)",
    "--success": "oklch(0.64 0.15 150)",
    "--success-ink": "oklch(0.78 0.14 150)",
    "--focus": "var(--accent)",
    "--art-spot": "var(--accent)",
    "--tx-hatch": hatchOf(GILT_INK),
  },
};

/** The overrides as a CSS declaration block, for a `<style>` rule or a style attribute. */
export function themeCss(themeId: string): string {
  const vars = THEME_VARS[themeId];
  if (vars === undefined) return "";
  return Object.entries(vars)
    .map(([token, value]) => `${token}: ${value};`)
    .join(" ");
}
