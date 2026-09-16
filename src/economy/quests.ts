import type { Seat } from "@/game/types";

/**
 * One condition the server checks against a single recorded hall (a game_results row plus what
 * the after-hall hook knows). A quest's progress is the number of halls that satisfy its rule,
 * so `goal` is always a count of halls.
 */
export type QuestRule =
  | { kind: "halls" }
  | { kind: "win"; as: "crew" | "changeling" | "any" }
  /** A hall in which you played at least n cards exactly as written. */
  | { kind: "cards-true"; n: number }
  | { kind: "tribunal-called" }
  /** The hall ended in Accepted while you were crew. */
  | { kind: "accepted" }
  /** The hall's problem was rated at least this and the crew solved it. */
  | { kind: "rating-at-least"; rating: number }
  | { kind: "seat"; seat: Seat }
  /** The Changeling was cast out while you were crew. */
  | { kind: "cast-out-changeling" }
  /** You were the Changeling, won, and were never cast out. */
  | { kind: "survive" };

export interface Quest {
  id: string;
  cadence: "daily" | "weekly";
  name: string;
  description: string;
  /** Halls that must satisfy `rule`. */
  goal: number;
  xp: number;
  candles: number;
  rule: QuestRule;
}

export const QUEST_POOL: readonly Quest[] = [
  // daily
  { id: "d-one-hall", cadence: "daily", name: "One Candle", description: "Sit one hall to the reveal.", goal: 1, xp: 100, candles: 15, rule: { kind: "halls" } },
  { id: "d-three-halls", cadence: "daily", name: "Three Candles", description: "Sit three halls to the reveal.", goal: 3, xp: 200, candles: 30, rule: { kind: "halls" } },
  { id: "d-win-any", cadence: "daily", name: "Any Means", description: "Win a hall on either side.", goal: 1, xp: 120, candles: 20, rule: { kind: "win", as: "any" } },
  { id: "d-win-crew", cadence: "daily", name: "Honest Work", description: "Win a hall as crew.", goal: 1, xp: 140, candles: 20, rule: { kind: "win", as: "crew" } },
  { id: "d-win-changeling", cadence: "daily", name: "Silver Tongue", description: "Win a hall as the Changeling.", goal: 1, xp: 180, candles: 30, rule: { kind: "win", as: "changeling" } },
  { id: "d-cards-true", cadence: "daily", name: "As Written", description: "Play two cards true in one hall.", goal: 1, xp: 120, candles: 20, rule: { kind: "cards-true", n: 2 } },
  { id: "d-tribunal", cadence: "daily", name: "Call the Table", description: "Sit a hall where a tribunal was called.", goal: 1, xp: 100, candles: 15, rule: { kind: "tribunal-called" } },
  { id: "d-accepted", cadence: "daily", name: "Green Ink", description: "Be crew when a hall ends in Accepted.", goal: 1, xp: 160, candles: 25, rule: { kind: "accepted" } },
  { id: "d-rated", cadence: "daily", name: "Above the Salt", description: "Solve a problem rated 1400 or higher.", goal: 1, xp: 160, candles: 25, rule: { kind: "rating-at-least", rating: 1400 } },
  { id: "d-runner", cadence: "daily", name: "Hold the Keys", description: "Hold the runner seat for a hall.", goal: 1, xp: 120, candles: 20, rule: { kind: "seat", seat: "runner" } },
  { id: "d-oracle", cadence: "daily", name: "Speak the Answer", description: "Hold the oracle seat for a hall.", goal: 1, xp: 120, candles: 20, rule: { kind: "seat", seat: "oracle" } },
  { id: "d-cast-out", cadence: "daily", name: "Unmasking", description: "Be crew when the Changeling is cast out.", goal: 1, xp: 160, candles: 25, rule: { kind: "cast-out-changeling" } },
  // weekly
  { id: "w-ten-halls", cadence: "weekly", name: "The Long Table", description: "Sit ten halls to the reveal.", goal: 10, xp: 600, candles: 90, rule: { kind: "halls" } },
  { id: "w-win-crew", cadence: "weekly", name: "Company Kept", description: "Win three halls as crew.", goal: 3, xp: 500, candles: 80, rule: { kind: "win", as: "crew" } },
  { id: "w-win-changeling", cadence: "weekly", name: "Two Faces", description: "Win two halls as the Changeling.", goal: 2, xp: 600, candles: 90, rule: { kind: "win", as: "changeling" } },
  { id: "w-cards-true", cadence: "weekly", name: "Clean Hands", description: "Play three cards true in each of three halls.", goal: 3, xp: 500, candles: 80, rule: { kind: "cards-true", n: 3 } },
  { id: "w-accepted", cadence: "weekly", name: "Three Green Marks", description: "Be crew for three halls that end in Accepted.", goal: 3, xp: 600, candles: 90, rule: { kind: "accepted" } },
  { id: "w-rated", cadence: "weekly", name: "High Table", description: "Solve a problem rated 1700 or higher.", goal: 1, xp: 700, candles: 100, rule: { kind: "rating-at-least", rating: 1700 } },
  { id: "w-survive", cadence: "weekly", name: "Never Unmasked", description: "Win as the Changeling without being cast out.", goal: 1, xp: 800, candles: 120, rule: { kind: "survive" } },
  { id: "w-bounds", cadence: "weekly", name: "Know the Limits", description: "Hold the bounds seat in five halls.", goal: 5, xp: 400, candles: 60, rule: { kind: "seat", seat: "bounds" } },
];

const PICKS = 3;

/** FNV-1a over UTF-16 code units; small, deterministic, good enough to shuffle a list of twelve. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * `PICKS` draws without replacement, driven by an xorshift32 seeded from `seed`. A zero seed
 * would keep x at zero and draw the first three in pool order, which is still a valid draw.
 */
function pick(pool: readonly Quest[], seed: string): Quest[] {
  const rest = [...pool];
  const picked: Quest[] = [];
  let x = fnv1a(seed);
  while (picked.length < PICKS) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    picked.push(...rest.splice(x % rest.length, 1));
  }
  return picked;
}

/** ISO 8601 week, "YYYY-Www", in UTC. Weeks start Monday; week 1 holds the year's first Thursday. */
export function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${String(d.getUTCFullYear())}-W${String(week).padStart(2, "0")}`;
}

/** Today's three daily and this week's three weekly quests, the same for everyone, chosen by hashing the period. */
export function questsFor(date: Date): { daily: Quest[]; weekly: Quest[]; period: { daily: string; weekly: string } } {
  const daily = date.toISOString().slice(0, 10);
  const weekly = isoWeek(date);
  return {
    daily: pick(
      QUEST_POOL.filter((q) => q.cadence === "daily"),
      daily,
    ),
    weekly: pick(
      QUEST_POOL.filter((q) => q.cadence === "weekly"),
      weekly,
    ),
    period: { daily, weekly },
  };
}
