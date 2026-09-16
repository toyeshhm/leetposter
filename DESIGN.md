# Design

Companion to PRODUCT.md. Tokens live in `src/app/globals.css`; art in `src/components/art/`; primitives in `src/components/ui/`; the gallery at `/design` renders all of it.

## Visual Theme & Atmosphere

A white-line woodcut printed on stone. The page is near-black because the room is dark; the ink is bone-white because it is the light. Tone is built from hatching, never from grey fills or blur. One warm spot color, candle amber, appears only where a flame, wax or the primary action would be. The mood sentence used to compose the palette: "a candle guttering on a stone table at two in the morning, wax pooled, five screens glowing on five faces".

First reflex rejected: purple-glow dark gaming. Second reflex rejected: Diablo brown and gold. What is left: scratchboard.

Register: the game screen is product register (fixed rem type, familiar controls, restrained color). The landing is brand register (one hero plate, one candle, larger display type). Same tokens, different scale.

## Modes

Two modes, one system. Dark is the default and the one the art was cut for: a white-line woodcut on
stone. Light is the same block printed the usual way round, dark line on paper, with each theme's
lightness ramp inverted and its hue kept. Deliberately not cream or parchment (see the
anti-references): light backgrounds sit at chroma 0.004 to 0.01 toward the theme's own hue, never
defaulted warm.

The choice is free and per browser (`leetposter.mode` in localStorage: `light`, `dark`, `system`),
set at `/settings`, and it layers over the cosmetic themes rather than replacing them: an equipped
Moss stays Moss in both. `system` follows `prefers-color-scheme` live. A blocking script in
`layout.tsx`, generated from `themeCss("theme-ember", "light")` so the tokens have one source, puts
the mode on `<html>` before the first paint; `ThemeIsland` then swaps in the equipped theme.
`--on-danger` carries the text on the oxblood fill, since `--ink` is the page ink and inverts.

All twelve sets (six themes, two modes) are verified in `tests/unit/cosmetics-themes.test.ts`, which
computes contrast from the tokens themselves rather than trusting a number in a comment.

## Motion

`src/app/motion.css`. Everything is opt-in under `prefers-reduced-motion: no-preference`, never
opt-out: a reveal that starts hidden and waits for a transition ships blank in a background tab or a
headless render, so the page is correct with the file doing nothing and motion is added on top.

Nothing on the record moves (principle 1). What moves is the light: the hero candle flickers on
irregular keyframes (a flame on a clean sine reads as a logo), the hatching that carries its reach
draws itself in once on load, a seat sigil inks in as it is dealt, and a verdict seal stamps down and
settles. The clock under a minute is a 900ms colour bleed rather than a pulse, and lives outside the
media query: a skipped transition still lands on the amber.

## Color Palette & Roles

Seed from `palette.mjs`: seed-122, oklch(0.600 0.158 150), a lichen green. The brief fixes the spot color to a warm candle or wax hue, so the seed is not the spot; it is the success color (Accepted, Crew) and nothing else. All values OKLCH.

| Token | Value | Role |
|---|---|---|
| `--bg` | oklch(0.15 0.006 200) | page. Faintly cold: wet stone at night, not blue dark mode |
| `--surface` | oklch(0.20 0.008 200) | frames, fields, panels |
| `--raised` | oklch(0.25 0.008 200) | hover on surfaces, secondary button fill |
| `--line` | oklch(0.34 0.01 200) | quiet rules only, never text |
| `--ink` | oklch(0.92 0.012 85) | bone-white text and all linework (`currentColor`) |
| `--muted` | oklch(0.70 0.014 85) | secondary text |
| `--accent` | oklch(0.78 0.155 78) | candle amber: primary action, timer under a minute, focus, spot color in art |
| `--accent-deep` | oklch(0.66 0.14 62) | primary hover, flame core |
| `--danger` | oklch(0.44 0.15 25) | oxblood fill: danger button, Rejected seal |
| `--danger-ink` | oklch(0.72 0.17 25) | danger text on dark |
| `--success` | oklch(0.62 0.15 150) | Accepted fill |
| `--success-ink` | oklch(0.72 0.15 150) | success text on dark |
| `--focus` | = `--accent` | focus ring |
| `--art-spot` | = `--accent` | the one spot color inside SVG art; override per context (`--art-spot: var(--success)` on an Accepted verdict) |

Verified contrast (WCAG 2): ink/bg 15.7, muted/bg 7.5, muted/raised 6.1, accent/bg 9.8, bg-on-accent (primary button text) 9.8, ink-on-danger 6.6, danger-ink/bg 7.5, success-ink/bg 8.5, accent-deep/bg 6.1. `--line` is 1.7:1 by design and is never used for text or essential borders.

Strategy: Restrained on the game screen (accent well under 10% of any view), Committed on the landing where the hero plate carries amber in the flame and the call to action.

## Typography Rules

Two families on a contrast axis, loaded with `next/font/google` in `src/app/layout.tsx`:

- Display: IM Fell English (`--font-display`). A digitisation of the 1600s Fell types, worn edges included. Used for the wordmark, page titles, frame captions and the reveal. Never below 18px, never for labels, buttons or data.
- UI: Alegreya Sans (`--font-ui`). Humanist, small-caps and tabular figures available. Everything else.

Fixed rem scale (product register), ratio about 1.2 with a jump at display sizes: `--text-xs` 0.75rem, `--text-sm` 0.875rem, `--text-base` 1rem, `--text-md` 1.125rem, `--text-lg` 1.375rem, `--text-xl` 1.75rem, `--text-2xl` 2.25rem, `--text-3xl` 3rem. Body is 1rem/1.5 on the game screen; ink on black gets line-height 1.55 for prose. Prose measure capped at 68ch (`.prose`).

Numbers on the record (timer, submission counts, votes) use `font-variant-numeric: tabular-nums`. Headings get `text-wrap: balance`; paragraphs `text-wrap: pretty`. No all-caps sentences; small caps only for seat badges.

## Component Stylings

- Buttons (`src/components/ui/Button.tsx`): square corners, 2px border. Primary: amber fill, bg-colored text. Secondary: transparent, ink border. Danger: oxblood fill, ink text. Ghost: no border, muted text. Hover shifts the fill one step (accent to accent-deep, transparent to raised); active nudges down 1px; disabled is 45% opacity with no pointer; loading swaps the leading glyph for the hourglass and sets `aria-busy`.
- Field: native `input` or `textarea`, 2px ink border on `--surface`, label above in the UI face at 500 weight, error below in `--danger-ink` linked via `aria-describedby`, `aria-invalid` set.
- Frame: a bordered panel with the four `FrameCorner` ornaments overlapping the border. Optional caption in the display face sitting on the top rule. One level only: a Frame inside a Frame renders as a plain block.
- Timer: `mm:ss` from `targetAt` and `clockOffset`, tabular, bleeds to `--accent` over 900ms under sixty seconds, `aria-live="polite"`.
- Badge: seat sigil at 20px plus the in-world seat name in small caps; the imposter and ejected states are words, not colors.
- Notice: full 2px border (never a side stripe), info in ink on surface, error in `--danger-ink` with an oxblood border, `role="status"` / `role="alert"`.
- Divider: two 2px rules meeting at the `RuleOrnament` lozenge.

## Art

Every image is an original SVG React component. Ink is `currentColor`, the spot is `.spot { fill: var(--art-spot) }`, tone is hatching from `hatch()` in `src/components/art/hatch.ts`, edges are roughened by an `feTurbulence` displacement filter at sizes 48px and up. Each takes `size` (width in px) and an optional `title`, and renders `role="img"` with a `<title>`.

Seat sigils: Cartographer (compass rose over a torn map), Oracle (eye inside a candle flame), Warden (portcullis under a chain with a measuring rule), Herald (sealed scroll with a raven). The Changeling mask is a hatched half-mask with an amber crack; the Crew emblem is a candle behind an open book inside a rope ring. The landing hero is a long table, five hooded figures, one candle; the light is drawn as hatching that thins with distance, and the shadow of the figure on the right does not match its body.

## Layout Principles

- Content column 72rem max; the game screen is a two-column grid (record on the left, panel and actions on the right) that stacks under 56rem.
- Spacing scale on a 4px base: `--space-1` to `--space-16`. Vary rhythm: tight inside a frame, generous between frames.
- No cards. Frames are the only bordered container and never nest.
- Z-index scale: dropdown 10, sticky 20, backdrop 30, modal 40, toast 50, tooltip 60.
- Square corners everywhere. Weight comes from 2px rules and ornament, not radius or shadow.

## Depth & Elevation

Flat. Depth is drawn: hatching, corner ornaments and a 2px rule. Surfaces carry two textures, both generated in CSS/SVG (no raster): a 4px diagonal hatch at 2% ink on the page, and a `feTurbulence` grain data-URI at 5% on `--surface`. A radial vignette darkens the page edges by a few percent so the centre reads as the lit part of the table. No box-shadows, no blur, no glass.

## Motion

Product timings: 160ms ease-out on color and border changes. The only autonomous motion is the hourglass on a loading button turning over every 1.4s; `prefers-reduced-motion` stops it and every transition.

## Do's and Don'ts

Do: draw a new sigil rather than reach for an icon set. Do: state verdicts in words and glyphs. Do: keep amber under 10% of a game view.

Don't: gradient text, side-stripe borders, glass, eyebrow labels on every section, rounded card grids, cream backgrounds, raster noise, display type in a button, any color as the only carrier of meaning.
