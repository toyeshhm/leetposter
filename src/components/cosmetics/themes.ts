import { THEME_TOKENS } from "@/economy/catalog";

/*
 * Site colour schemes, catalog kind "theme", in both modes. `THEME_TOKENS` in the catalog carries
 * the eight chrome tokens of the dark set; a theme also has to answer for the verdicts, the focus
 * ring and the page textures, or a themed page would keep Ember's amber focus ring. These are the
 * complete sets: put one on :root and every token in globals.css is accounted for.
 *
 * Dark is a white-line woodcut on stone. Light is the same block printed the usual way round:
 * dark line on paper, the lightness ramp inverted, each theme keeping its own hue. Deliberately
 * not cream or parchment (PRODUCT.md names those as anti-references) - the light backgrounds sit
 * at chroma 0.004 to 0.01 toward the theme's own hue, never defaulted warm.
 *
 * Verified against WCAG 2 in tests/unit/cosmetics-themes.test.ts, which is the real check and not
 * a claim in a comment: in all twelve sets ink and muted clear 4.5:1 on bg, surface and raised,
 * the accent clears 4.5:1 on bg and carries bg-coloured text at 4.5:1, the danger fill carries its
 * own text, and every value is inside sRGB. Verdict hues stay red and green in every set, Ink
 * included: the seals are the one place colour is load-bearing, and they are also words.
 */

/** Which way round the block is printed. "system" is a preference, not a set; it resolves to one of these. */
export type Mode = "light" | "dark";

/** The page's 4px diagonal hatch, tinted with the theme's own ink at 2.2%. */
function hatchOf(ink: string): string {
  return `repeating-linear-gradient(-45deg, transparent 0 3px, ${ink.replace(")", " / 0.022)")} 3px 4px)`;
}

/* On paper the vignette is a suggestion, not a shadow, and the grain has to be dark to be seen. */
const PAPER_VIGNETTE = "radial-gradient(120% 90% at 50% 30%, transparent 55%, oklch(0 0 0 / 0.07) 100%)";
const PAPER_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.09 0 0 0 0 0.09 0 0 0 0 0.08 0 0 0 0.07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";

const EMBER_INK = "oklch(0.92 0.012 85)";
const MOSS_INK = "oklch(0.92 0.014 110)";
const OXBLOOD_INK = "oklch(0.92 0.012 60)";
const FROST_INK = "oklch(0.94 0.008 220)";
const INK_INK = "oklch(0.98 0 0)";
const GILT_INK = "oklch(0.93 0.02 90)";

/** The dark set for every theme id: the full list of overrides it puts on :root. */
const DARK: Readonly<Record<string, Readonly<Record<string, string>>>> = {
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

/** The light set for every theme id. Same hues, the ramp the other way up. */
const LIGHT: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "theme-ember": {
    "--bg": "oklch(0.97 0.004 200)",
    "--surface": "oklch(0.93 0.005 200)",
    "--raised": "oklch(0.88 0.006 200)",
    "--line": "oklch(0.72 0.012 200)",
    "--ink": "oklch(0.24 0.012 85)",
    "--muted": "oklch(0.44 0.014 85)",
    "--accent": "oklch(0.52 0.118 62)",
    "--accent-deep": "oklch(0.44 0.105 58)",
    "--on-accent": "var(--bg)",
    "--on-danger": "var(--bg)",
    "--danger": "oklch(0.45 0.16 25)",
    "--danger-ink": "oklch(0.44 0.17 25)",
    "--success": "oklch(0.45 0.122 150)",
    "--success-ink": "oklch(0.42 0.115 150)",
    "--focus": "var(--accent)",
    "--art-spot": "var(--accent)",
    "--tx-hatch": hatchOf("oklch(0.24 0.012 85)"),
    "--tx-vignette": PAPER_VIGNETTE,
    "--tx-grain": PAPER_GRAIN,
  },
  "theme-moss": {
    "--bg": "oklch(0.97 0.008 140)",
    "--surface": "oklch(0.93 0.01 140)",
    "--raised": "oklch(0.88 0.012 140)",
    "--line": "oklch(0.72 0.016 140)",
    "--ink": "oklch(0.24 0.014 130)",
    "--muted": "oklch(0.44 0.016 130)",
    "--accent": "oklch(0.48 0.12 140)",
    "--accent-deep": "oklch(0.40 0.11 142)",
    "--on-accent": "var(--bg)",
    "--on-danger": "var(--bg)",
    "--danger": "oklch(0.45 0.16 25)",
    "--danger-ink": "oklch(0.44 0.17 25)",
    "--success": "oklch(0.45 0.122 150)",
    "--success-ink": "oklch(0.42 0.115 150)",
    "--focus": "var(--accent)",
    "--art-spot": "var(--accent)",
    "--tx-hatch": hatchOf("oklch(0.24 0.014 130)"),
    "--tx-vignette": PAPER_VIGNETTE,
    "--tx-grain": PAPER_GRAIN,
  },
  "theme-oxblood": {
    "--bg": "oklch(0.97 0.008 20)",
    "--surface": "oklch(0.93 0.01 20)",
    "--raised": "oklch(0.88 0.012 20)",
    "--line": "oklch(0.72 0.016 20)",
    "--ink": "oklch(0.24 0.012 40)",
    "--muted": "oklch(0.44 0.014 40)",
    "--accent": "oklch(0.48 0.16 25)",
    "--accent-deep": "oklch(0.40 0.15 25)",
    "--on-accent": "var(--bg)",
    "--on-danger": "var(--bg)",
    "--danger": "oklch(0.45 0.16 25)",
    "--danger-ink": "oklch(0.44 0.17 25)",
    "--success": "oklch(0.45 0.122 150)",
    "--success-ink": "oklch(0.42 0.115 150)",
    "--focus": "var(--accent)",
    "--art-spot": "var(--accent)",
    "--tx-hatch": hatchOf("oklch(0.24 0.012 40)"),
    "--tx-vignette": PAPER_VIGNETTE,
    "--tx-grain": PAPER_GRAIN,
  },
  "theme-frost": {
    "--bg": "oklch(0.97 0.006 240)",
    "--surface": "oklch(0.93 0.008 240)",
    "--raised": "oklch(0.88 0.01 240)",
    "--line": "oklch(0.72 0.014 240)",
    "--ink": "oklch(0.24 0.012 230)",
    "--muted": "oklch(0.44 0.014 230)",
    "--accent": "oklch(0.50 0.12 245)",
    "--accent-deep": "oklch(0.42 0.11 248)",
    "--on-accent": "var(--bg)",
    "--on-danger": "var(--bg)",
    "--danger": "oklch(0.45 0.16 25)",
    "--danger-ink": "oklch(0.44 0.17 25)",
    "--success": "oklch(0.45 0.122 150)",
    "--success-ink": "oklch(0.42 0.115 150)",
    "--focus": "var(--accent)",
    "--art-spot": "var(--accent)",
    "--tx-hatch": hatchOf("oklch(0.24 0.012 230)"),
    "--tx-vignette": PAPER_VIGNETTE,
    "--tx-grain": PAPER_GRAIN,
  },
  "theme-ink": {
    "--bg": "oklch(0.99 0 0)",
    "--surface": "oklch(0.95 0 0)",
    "--raised": "oklch(0.90 0 0)",
    "--line": "oklch(0.70 0 0)",
    "--ink": "oklch(0.15 0 0)",
    "--muted": "oklch(0.42 0 0)",
    "--accent": "oklch(0.15 0 0)",
    "--accent-deep": "oklch(0.30 0 0)",
    "--on-accent": "var(--bg)",
    "--on-danger": "var(--bg)",
    "--danger": "oklch(0.45 0.16 25)",
    "--danger-ink": "oklch(0.44 0.17 25)",
    "--success": "oklch(0.45 0.122 150)",
    "--success-ink": "oklch(0.42 0.115 150)",
    "--focus": "var(--accent)",
    "--art-spot": "var(--accent)",
    "--tx-hatch": hatchOf("oklch(0.15 0 0)"),
    "--tx-vignette": PAPER_VIGNETTE,
    "--tx-grain": PAPER_GRAIN,
  },
  "theme-gilt": {
    "--bg": "oklch(0.97 0.01 160)",
    "--surface": "oklch(0.93 0.012 160)",
    "--raised": "oklch(0.88 0.014 160)",
    "--line": "oklch(0.72 0.018 160)",
    "--ink": "oklch(0.24 0.018 95)",
    "--muted": "oklch(0.44 0.02 95)",
    "--accent": "oklch(0.50 0.1 88)",
    "--accent-deep": "oklch(0.42 0.085 85)",
    "--on-accent": "var(--bg)",
    "--on-danger": "var(--bg)",
    "--danger": "oklch(0.45 0.16 25)",
    "--danger-ink": "oklch(0.44 0.17 25)",
    "--success": "oklch(0.45 0.122 150)",
    "--success-ink": "oklch(0.42 0.115 150)",
    "--focus": "var(--accent)",
    "--art-spot": "var(--accent)",
    "--tx-hatch": hatchOf("oklch(0.24 0.018 95)"),
    "--tx-vignette": PAPER_VIGNETTE,
    "--tx-grain": PAPER_GRAIN,
  },
};

/** Every theme id in both modes. `THEME_VARS[mode][id]` is a complete set. */
export const THEME_VARS: Readonly<Record<Mode, Readonly<Record<string, Readonly<Record<string, string>>>>>> = { dark: DARK, light: LIGHT };

/** The overrides as a CSS declaration block, for a `<style>` rule or a style attribute. */
export function themeCss(themeId: string, mode: Mode): string {
  const vars = THEME_VARS[mode][themeId];
  if (vars === undefined) return "";
  return Object.entries(vars)
    .map(([token, value]) => `${token}: ${value};`)
    .join(" ");
}
