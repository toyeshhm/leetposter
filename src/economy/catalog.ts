import type { ItemKind, Rarity } from "@/server/supabase";

/**
 * One cosmetic. Pure data: the store, the pass and the profile all read this list;
 * `items` in Postgres is a mirror seeded from it, never the other way round.
 *
 * `price` is candles. `null` means the item is never sold: it is a pass reward
 * (season and tier set), an achievement badge, or the default everyone owns.
 * `art` names the SVG component the art engineer draws in src/components/cosmetics/.
 */
export interface Item {
  id: string;
  kind: ItemKind;
  name: string;
  description: string;
  rarity: Rarity;
  price: number | null;
  art: string;
  season: string | null;
  tier: number | null;
}

/** Store prices by rarity. Legendary is pass-only, so it never carries a price. */
export const PRICE_BY_RARITY: Readonly<Record<Rarity, number | null>> = { common: 150, uncommon: 300, rare: 600, epic: 1200, legendary: null };

/** Pass items are named by season and tier; the paid track is 30 tiers, so `tier` is 1..30. */
interface Pass {
  season: string;
  tier: number;
}

/** id and art share the slug, so one name finds the row and the drawing. Pass items and badges are never priced. */
function def(kind: ItemKind, slug: string, name: string, description: string, rarity: Rarity, pass: Pass | null = null): Item {
  return {
    id: `${kind}-${slug}`,
    kind,
    name,
    description,
    rarity,
    price: pass === null && kind !== "badge" ? PRICE_BY_RARITY[rarity] : null,
    art: `${kind}-${slug}`,
    season: pass === null ? null : pass.season,
    tier: pass === null ? null : pass.tier,
  };
}

const LONG_NIGHT = "2026-10";
const FROST_WATCH = "2026-11";
const HUSHED_FEAST = "2026-12";
const FIRST_THAW = "2027-01";

/**
 * Site colour schemes as overrides of the tokens in src/app/globals.css. Ember is the
 * default and overrides nothing. The theme engineer sets these on :root when a theme is equipped.
 */
export const THEME_TOKENS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "theme-ember": {},
  "theme-moss": {
    "--bg": "oklch(0.15 0.012 150)",
    "--surface": "oklch(0.2 0.014 150)",
    "--raised": "oklch(0.25 0.014 150)",
    "--line": "oklch(0.34 0.016 150)",
    "--ink": "oklch(0.92 0.014 110)",
    "--muted": "oklch(0.7 0.016 110)",
    "--accent": "oklch(0.74 0.13 130)",
    "--accent-deep": "oklch(0.62 0.12 135)",
  },
  "theme-oxblood": {
    "--bg": "oklch(0.15 0.015 20)",
    "--surface": "oklch(0.2 0.018 20)",
    "--raised": "oklch(0.25 0.018 20)",
    "--line": "oklch(0.34 0.02 20)",
    "--ink": "oklch(0.92 0.012 60)",
    "--muted": "oklch(0.7 0.014 60)",
    "--accent": "oklch(0.68 0.16 25)",
    // 0.56 put bg-coloured button text at 3.93:1 on the hover fill; 0.60 clears AA at 4.65 and is
    // still a visible step down from the base. Caught by tests/unit/cosmetics-themes.test.ts.
    "--accent-deep": "oklch(0.6 0.15 25)",
  },
  "theme-frost": {
    "--bg": "oklch(0.18 0.012 240)",
    "--surface": "oklch(0.23 0.014 240)",
    "--raised": "oklch(0.28 0.014 240)",
    "--line": "oklch(0.38 0.016 240)",
    "--ink": "oklch(0.94 0.008 220)",
    "--muted": "oklch(0.72 0.01 220)",
    "--accent": "oklch(0.82 0.07 220)",
    "--accent-deep": "oklch(0.7 0.08 225)",
  },
  "theme-ink": {
    "--bg": "oklch(0.05 0 0)",
    "--surface": "oklch(0.1 0 0)",
    "--raised": "oklch(0.16 0 0)",
    "--line": "oklch(0.32 0 0)",
    "--ink": "oklch(0.98 0 0)",
    "--muted": "oklch(0.72 0 0)",
    "--accent": "oklch(0.98 0 0)",
    "--accent-deep": "oklch(0.8 0 0)",
  },
  "theme-gilt": {
    "--bg": "oklch(0.17 0.03 160)",
    "--surface": "oklch(0.21 0.032 160)",
    "--raised": "oklch(0.26 0.032 160)",
    "--line": "oklch(0.35 0.034 160)",
    "--ink": "oklch(0.93 0.02 90)",
    "--muted": "oklch(0.7 0.02 90)",
    "--accent": "oklch(0.8 0.14 90)",
    "--accent-deep": "oklch(0.68 0.13 85)",
  },
};

/**
 * Every cosmetic in the game. 64 items: 14 avatars, 8 frames, 12 titles, 6 themes, 8 carets,
 * 10 badges, 6 emotes. Eleven are sold for candles, eight come with achievements, one is the
 * default theme, and 44 fill the four seeded seasons (seven free and four paid per season,
 * the tier-30 paid reward always legendary).
 */
export const CATALOG: readonly Item[] = [
  // avatars
  def("avatar", "hooded-scribe", "The Scribe", "A hood, a quill, and no opinion on whose code this is.", "common"),
  def("avatar", "plain-hood", "Plain Hood", "The Company issues one to everyone; most never take it off.", "common"),
  def("avatar", "deep-hood", "Deep Hood", "Pulled low enough that the candle finds only a chin.", "common", { season: FIRST_THAW, tier: 15 }),
  def("avatar", "veiled", "The Veiled", "A veil over the hood, for those who would rather not be read.", "uncommon", { season: LONG_NIGHT, tier: 25 }),
  def("avatar", "wide-hat", "Wide Hat", "A brim wide enough to hide a hint under.", "uncommon", { season: LONG_NIGHT, tier: 20 }),
  def("avatar", "tall-hat", "Tall Hat", "A capotain, worn by the sort of person who reads the bounds twice.", "uncommon", { season: FROST_WATCH, tier: 25 }),
  def("avatar", "half-mask", "Half Mask", "Covers exactly the half that would give it away.", "rare", { season: HUSHED_FEAST, tier: 20 }),
  def("avatar", "beaked-mask", "Beaked Mask", "The Company's physician, who diagnoses off-by-ones by smell.", "rare", { season: HUSHED_FEAST, tier: 25 }),
  def("avatar", "raven", "The Raven", "It sat at the table one night and nobody had the nerve to vote it out.", "rare", { season: FIRST_THAW, tier: 20 }),
  def("avatar", "candle-bearer", "Candle-Bearer", "Holds the light for the others and sees nothing but wax.", "epic", { season: FIRST_THAW, tier: 1 }),
  def("avatar", "lantern-hood", "Lantern Hood", "A hood lit from inside, which is either brave or careless.", "epic", { season: FIRST_THAW, tier: 20 }),
  def("avatar", "warden", "The Warden", "Keeps the ledger of every hall and has never once been wrong in it.", "legendary", { season: LONG_NIGHT, tier: 30 }),
  def("avatar", "dov", "Dov", "Cast out with a chain still on; the chain broke before Dov did.", "legendary", { season: FROST_WATCH, tier: 30 }),
  def("avatar", "cat", "The Cat", "Sits on the manuscript at the worst moment and has never been cast out.", "legendary", { season: HUSHED_FEAST, tier: 30 }),
  // frames
  def("frame", "rope", "Plain Rope", "A loop of hemp, tied by someone who tied it once before.", "common"),
  def("frame", "iron", "Iron", "Cold, black, and riveted, like the Company's opinion of your runtime.", "common", { season: HUSHED_FEAST, tier: 15 }),
  def("frame", "wax-seal", "Wax Seal", "A red seal on a ring of parchment, unbroken so far.", "uncommon", { season: LONG_NIGHT, tier: 15 }),
  def("frame", "brambles", "Brambles", "Thorns all the way round; do not lean on it.", "uncommon", { season: FROST_WATCH, tier: 15 }),
  def("frame", "chain", "Chain", "Nine links, one of them mended.", "rare", { season: FROST_WATCH, tier: 10 }),
  def("frame", "cracked-stone", "Cracked Stone", "A ring of the north gate, with the crack the frost put in it.", "rare", { season: FIRST_THAW, tier: 25 }),
  def("frame", "gilded", "Gilded", "Gold leaf on oak, for those who submit before the candle is a stub.", "epic", { season: HUSHED_FEAST, tier: 20 }),
  def("frame", "candle-ring", "Candle Ring", "Twelve candles in a circle, all of them still lit.", "legendary", { season: FIRST_THAW, tier: 30 }),
  // titles
  def("title", "the-trusted", "the Trusted", "The table said so, once.", "common"),
  def("title", "off-by-one", "Off By One", "Close enough to hurt.", "common"),
  def("title", "owes-the-table-a-drink", "Owes the Table a Drink", "Cast out while honest; the debt stands.", "common"),
  def("title", "never-cast-out", "Never Cast Out", "Either very trusted or very quiet.", "uncommon", { season: FIRST_THAW, tier: 5 }),
  def("title", "reads-hints-verbatim", "Reads Hints Verbatim", "Every word of the panel and not one more.", "uncommon", { season: LONG_NIGHT, tier: 5 }),
  def("title", "of-the-long-night", "of the Long Night", "Sat the first season through.", "uncommon", { season: LONG_NIGHT, tier: 30 }),
  def("title", "frost-watcher", "Frost-Watcher", "Kept the north gate through the second season.", "uncommon", { season: FROST_WATCH, tier: 30 }),
  def("title", "first-thaw", "of the First Thaw", "Was there when the ink stopped freezing.", "uncommon", { season: FIRST_THAW, tier: 30 }),
  def("title", "twice-masked", "Twice Masked", "Wore two faces and was believed in both.", "rare", { season: HUSHED_FEAST, tier: 5 }),
  def("title", "keeper-of-the-ledger", "Keeper of the Ledger", "Trusted with the Warden's own book for one season.", "rare", { season: HUSHED_FEAST, tier: 30 }),
  def("title", "unbroken-chain", "Unbroken Chain", "The one link Dov could not snap.", "rare", { season: FROST_WATCH, tier: 20 }),
  def("title", "warden-of-the-north-gate", "Warden of the North Gate", "The gate that lets nothing in and, so far, nothing out.", "epic", { season: LONG_NIGHT, tier: 20 }),
  // themes
  {
    id: "theme-ember",
    kind: "theme",
    name: "Ember",
    description: "The candle as it is: amber on stone. Everyone owns it.",
    rarity: "common",
    price: null,
    art: "theme-ember",
    season: null,
    tier: null,
  },
  def("theme", "moss", "Moss", "Damp green stone and a paler flame; the hall after rain.", "uncommon"),
  def("theme", "oxblood", "Oxblood", "Dark red walls and bone ink, like the Warden's private study.", "uncommon"),
  def("theme", "frost", "Frost", "Cool bone on slate; the only theme that does not warm the room.", "rare", { season: FROST_WATCH, tier: 20 }),
  def("theme", "ink", "Ink", "Pure black and white, for those who find colour a distraction.", "rare"),
  def("theme", "gilt", "Gilt", "Gold on deep green, the feast-hall hangings taken down once a year.", "epic", { season: HUSHED_FEAST, tier: 10 }),
  // carets
  def("caret", "bone", "Bone", "The plain cursor, the colour of old ink on older paper.", "common"),
  def("caret", "candle", "Candle", "A cursor the colour of the flame itself.", "common", { season: LONG_NIGHT, tier: 10 }),
  def("caret", "rust", "Rust", "Iron left out in the rain; it still points.", "uncommon", { season: FROST_WATCH, tier: 10 }),
  def("caret", "soot", "Soot", "Grey-black, nearly invisible, which some prefer.", "uncommon", { season: FROST_WATCH, tier: 5 }),
  def("caret", "moss", "Moss", "A green cursor for a green table.", "uncommon", { season: HUSHED_FEAST, tier: 10 }),
  def("caret", "oxblood", "Oxblood", "Dark red, the colour of a card that was not played true.", "uncommon", { season: FIRST_THAW, tier: 10 }),
  def("caret", "guttering", "Guttering", "A cursor that flickers like a candle in a draught, and steadies when you type.", "epic", { season: LONG_NIGHT, tier: 10 }),
  def("caret", "wisp", "Wisp", "Leaves a thread of pale smoke behind it that fades in a second.", "epic", { season: FIRST_THAW, tier: 10 }),
  // badges: one per achievement (src/server/achievements.ts) and two per season, never sold
  def("badge", "first-candle", "First Candle", "Sat through one hall to the unmasking.", "common"),
  def("badge", "company-of-five", "Company of Five", "Five halls, start to finish.", "common"),
  def("badge", "unmasked", "Unmasked", "Sat with the crew when the Changeling was cast out.", "uncommon"),
  def("badge", "silver-tongue", "Silver Tongue", "Won as the Changeling.", "uncommon"),
  def("badge", "clean-hands", "Clean Hands", "Won with the crew three times, every card played as written.", "rare"),
  def("badge", "cast-out", "Cast Out", "Cast out while crew. The table owes you a drink.", "uncommon"),
  def("badge", "long-night", "Long Night", "Ten halls. The candle is a stub.", "rare"),
  def("badge", "two-faces", "Two Faces", "Won as the Changeling with two or more cards altered.", "rare"),
  def("badge", "season-long-night", "The Long Night", "Was at the table in the first season.", "uncommon", { season: LONG_NIGHT, tier: 1 }),
  def("badge", "season-frost-watch", "The Frost Watch", "Was at the table in the second season.", "uncommon", { season: FROST_WATCH, tier: 1 }),
  // emotes, played at the reveal
  def("emote", "snuff", "Snuff", "Two fingers pinch a candle out.", "common"),
  def("emote", "bell", "Bell", "A small bell, rung once.", "uncommon", { season: HUSHED_FEAST, tier: 1 }),
  def("emote", "raised-cup", "Raised Cup", "A cup lifted to whoever was right.", "uncommon", { season: LONG_NIGHT, tier: 1 }),
  def("emote", "slow-clap", "Slow Clap", "Three claps, none of them sincere.", "uncommon", { season: FROST_WATCH, tier: 1 }),
  def("emote", "broken-seal", "Broken Seal", "A wax seal cracks in half.", "rare", { season: FIRST_THAW, tier: 1 }),
  def("emote", "mask-slip", "Mask Slip", "A mask slides an inch and is pushed back up.", "rare", { season: HUSHED_FEAST, tier: 1 }),
];

/** Achievement badges share the achievement's id: `badge-${achievementId}`. */
export function badgeForAchievement(achievementId: string): string {
  return `badge-${achievementId}`;
}

/** Look up one item; throws on an unknown id so a typo in seasons or quests fails loudly. */
export function itemById(id: string): Item {
  const found = CATALOG.find((item) => item.id === id);
  if (found === undefined) throw new Error(`No catalog item ${id}`);
  return found;
}
