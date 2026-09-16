/*
 * Editor cursor colours, catalog kind "caret". A caret is a colour, not a drawing, so this is a
 * map rather than a component: the editor sets `--caret` from it and puts the item id in
 * `data-caret` so cosmetics.css can flicker the two that move. Bone and Candle follow the
 * equipped theme; the rest are fixed so a player's colour is their colour in every hall.
 */
export const CARET_COLORS: Readonly<Record<string, string>> = {
  "caret-bone": "var(--ink)",
  "caret-candle": "var(--accent)",
  "caret-rust": "oklch(0.62 0.13 45)",
  "caret-soot": "oklch(0.55 0.012 240)",
  "caret-moss": "oklch(0.7 0.12 145)",
  "caret-oxblood": "oklch(0.6 0.16 25)",
  "caret-guttering": "var(--accent)",
  "caret-wisp": "oklch(0.86 0.02 250)",
};
