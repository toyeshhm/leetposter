# Product

## Register

product

The game screen (`/room/[code]`) is product register: people are in a timed task with a liar in the room. The landing (`/`) is brand register: one hero, one candle, one call to action. Both share one visual system (DESIGN.md).

## Users

Four to eight programmer friends on a late-night voice call. Screens are the only light in the room. They have 40 minutes, one hard algorithm problem, one shared editor somewhere else, and this app open in a side window. They glance at it between arguments: what does my seat know, who played what card, how long is left, who is lying.

Job to be done: hold the record. Cards, clock, votes, verdicts. Voice is where the game happens; the app is the table the manuscript sits on.

## Product Purpose

A social-deduction party game for programmers. Every seat holds one channel of truth about the problem; one player, the Changeling, sees every channel and lies. The app deals seats, keeps the clock, records cards and submissions as the official record, runs freezes and votes, and shows the truth next to every card at the reveal.

Success: a group finishes a round without the app ever being the thing they argue about, and the reveal screen makes the Changeling's lies legible in one glance.

## Brand Personality

Inked, candlelit, sly.

- Inked: everything on screen looks cut or drawn by hand. Heavy bone-white line on near-black, cross-hatching for tone, one warm spot color where a candle or wax would be.
- Candlelit: the surface is dark because the room is dark. Light is scarce and it comes from one place.
- Sly: the Changeling is smiling somewhere on every screen. Ornament is allowed to be slightly wrong.

Voice: plain sentences, sentence case, in-world nouns (Cartographer, Oracle, Warden, Herald, Crew, Changeling) used as names, not lore dumps. Verdicts are stated, never softened. No exclamation marks. No em dashes.

## Anti-references

- Purple-glow "dark mode gaming" (Discord-adjacent neon, glassy cards, gradient text).
- Diablo-brown: leather, embossed gold, bevelled metal buttons, parchment scrolls as UI.
- Skyrim-Uncial fantasy fonts, blackletter body copy, MedievalSharp.
- Stock noise PNG overlays; stock fantasy illustration; anything AI-rendered or raster.
- The SaaS card kit: rounded identical cards, soft grey shadows, eyebrow labels over every section.
- Cream or parchment page backgrounds.

## Design Principles

1. The record is sacred. Cards, verdicts and votes are typeset like entries in a ledger: fixed rem scale, tabular numerals, aligned columns. Nothing animates that is on the record.
2. One light source. Emphasis is spent once per screen (the timer under a minute, the primary action, the verdict). Everything else is bone on black.
3. Hand-cut, not rendered. Every image is an original SVG with visible linework. If a shape could be a stock icon, redraw it until it could not.
4. Familiar controls, strange ornament. Inputs, buttons and lists behave exactly like the browser's. The strangeness lives in the sigils, the frames and the hero, never in the affordances.
5. Voice is the game. The interface never nags, celebrates or apologises. It states what happened and what is left.

## Accessibility & Inclusion

- WCAG 2.2 AA minimum: body text ≥ 4.5:1, large text and UI borders ≥ 3:1. Every token pair in DESIGN.md is verified.
- Keyboard first: every action is a native `button`, `input`, `textarea` or `a`. Visible focus ring on everything.
- Reduced motion honoured: motion is opt-in under `prefers-reduced-motion: no-preference`, so a player who asks for stillness gets the page with nothing animating and nothing missing.
- Light and dark both ship, free, at `/settings`, and follow the system by default. All twelve theme-and-mode combinations are contrast-verified in CI, not by eye.
- Color never carries meaning alone: Accepted and Rejected have distinct glyphs and words, the timer's urgency is also in its text and `aria-live`.
- Every SVG has `role="img"` and a title; decorative ornaments are `aria-hidden`.
- Seat names are English words a non-native speaker can read; the four seats also carry distinct sigils for people who do not read the labels.
