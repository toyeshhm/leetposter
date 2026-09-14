/** One game_results row (supabase/migrations/0003_accounts.sql). Declared here so the rules stay pure and importable anywhere. */
export interface GameResultRow {
  id: string;
  user_id: string;
  code: string;
  played_at: string;
  seats: string[];
  was_imposter: boolean;
  won: boolean;
  reason: string;
  cards_played: number;
  cards_altered: number;
  ejected: boolean;
  players: number;
}

export const ACHIEVEMENT_IDS = ["first-candle", "company-of-five", "unmasked", "silver-tongue", "clean-hands", "cast-out", "long-night", "two-faces"] as const;

export interface Achievement {
  id: (typeof ACHIEVEMENT_IDS)[number];
  name: string;
  description: string;
  earned: boolean;
  progress: { have: number; need: number };
}

interface Rule {
  id: Achievement["id"];
  name: string;
  description: string;
  /** How many qualifying games earn it. */
  need: number;
  qualifies: (row: GameResultRow) => boolean;
}

const RULES: Rule[] = [
  { id: "first-candle", name: "First Candle", description: "Sat through one hall to the unmasking.", need: 1, qualifies: () => true },
  { id: "company-of-five", name: "Company of Five", description: "Five halls, start to finish.", need: 5, qualifies: () => true },
  {
    id: "unmasked",
    name: "Unmasked",
    description: "Sat with the crew when the Changeling was cast out.",
    need: 1,
    qualifies: (r) => !r.was_imposter && r.won && r.reason === "imposter-ejected",
  },
  { id: "silver-tongue", name: "Silver Tongue", description: "Won as the Changeling.", need: 1, qualifies: (r) => r.was_imposter && r.won },
  {
    id: "clean-hands",
    name: "Clean Hands",
    description: "Won with the crew three times, every card played as written.",
    need: 3,
    qualifies: (r) => !r.was_imposter && r.won && r.cards_played >= 1 && r.cards_altered === 0,
  },
  { id: "cast-out", name: "Cast Out", description: "Cast out while crew. The table owes you a drink.", need: 1, qualifies: (r) => !r.was_imposter && r.ejected },
  { id: "long-night", name: "Long Night", description: "Ten halls. The candle is a stub.", need: 10, qualifies: () => true },
  {
    id: "two-faces",
    name: "Two Faces",
    description: "Won as the Changeling with two or more cards altered.",
    need: 1,
    qualifies: (r) => r.was_imposter && r.won && r.cards_altered >= 2,
  },
];

/** Every achievement, earned or not, computed from the player's rows. Never stored. */
export function achievements(rows: GameResultRow[]): Achievement[] {
  return RULES.map(({ id, name, description, need, qualifies }) => {
    const have = rows.filter(qualifies).length;
    return { id, name, description, earned: have >= need, progress: { have, need } };
  });
}
