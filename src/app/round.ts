import type { CardEntry, Problem, Seat, Vote } from "@/game/types";
import { bankById } from "@/problems";

/* The printed round. Nobody played it: the problem, its rating, its tags, its hints and its
   constraints are read off the bank, the seats and the cast follow README.md and lore.md, and the
   cards are composed here. Five players, so the fifth seat is a second Oracle (README.md). */

const found = bankById("dov-forgot-the-link-marks");
if (found === null) throw new Error("round.ts: the printed round's problem left the bank");
// Bound again so the narrowing holds inside the helpers below, not just at the top level.
const bank = found;

export const ROUND_PROBLEM: Problem = {
  title: bank.title,
  // The real statement page, not leetcode.com: this problem was written for this game.
  url: `/problems/${bank.id}`,
  statement: bank.statement,
  tags: [...bank.tags],
  hints: [...bank.hints],
  constraints: bank.constraints,
  bankId: bank.id,
  rating: bank.rating,
};

/** The rating again, unconditionally: `Problem.rating` is optional and the landing prints it. */
export const ROUND_RATING: number = bank.rating;

/** One hint off the bank. The schema guarantees at least two; this says so to the compiler. */
function hint(index: number): string {
  const text = bank.hints[index];
  if (text === undefined) throw new Error(`round.ts: the printed round's problem has no hint ${String(index + 1)}`);
  return text;
}

/** Elapsed time into the round, as minutes and seconds. See the note above ROUND_CARDS. */
function at(minutes: number, seconds: number): number {
  return (minutes * 60 + seconds) * 1000;
}

export interface RoundSeat {
  /** What `CardEntry.playerId` and `Vote.voterId` below point at. */
  id: string;
  player: string;
  seat: Seat;
  /** The caption printed under this seat's panel. */
  note: string;
}

/** Five players, so the fifth seat doubles the Oracle. The two Oracles sit together in the deal. */
export const ROUND_SEATS: RoundSeat[] = [
  {
    id: "cass",
    player: "Cass",
    seat: "tagger",
    note: "Declares the tags once, exactly as many as there are, on the record.",
  },
  {
    id: "warden",
    player: "Sabe of the North Gate",
    seat: "bounds",
    note: "Declares a bound whenever the crew needs one.",
  },
  {
    id: "brin",
    player: "Brin",
    seat: "oracle",
    note: "Gives up the next hint when the table asks for it.",
  },
  {
    id: "ada",
    player: "Ada",
    seat: "oracle",
    note: "The fifth player at a table doubles the Oracle. Ada holds the same hints, in the same order. Two holders of one seat who disagree have told the crew that one of them is lying.",
  },
  {
    id: "dov",
    player: "Dov",
    seat: "runner",
    note: "Carries the file to the Judge and comes back with a verdict.",
  },
];

/** The name at a seat. Throws rather than printing an id, so a renamed row cannot ship silently. */
export function roundPlayer(playerId: string): string {
  const row = ROUND_SEATS.find((s) => s.id === playerId);
  if (row === undefined) throw new Error(`round.ts: nobody at this table is called ${playerId}`);
  return row.player;
}

/* `at` here is elapsed time into the build, not a wall clock. CardsLog renders clockTime(entry.at)
   because a live hall has a real timestamp; this round has none, and a wall clock on a round nobody
   played is false precision. The landing formats these itself. Do not "fix" this back. */

/**
 * The five cards, in the order they were played. The tag card declares three tags because three is
 * the true count and the count is public, so the card is legal: two-pointers is the lie and
 * prefix-sums is the omission the table never went looking for.
 */
export const ROUND_CARDS: CardEntry[] = [
  {
    id: "card-tags",
    playerId: "cass",
    seat: "tagger",
    at: at(4, 12),
    card: { kind: "tags", tags: ["dp", "combinatorics", "two-pointers"] },
  },
  {
    id: "card-hint-1",
    playerId: "brin",
    seat: "oracle",
    at: at(9, 40),
    card: { kind: "hint", index: 0, text: hint(0) },
  },
  {
    id: "card-bound",
    playerId: "warden",
    seat: "bounds",
    at: at(17, 5),
    card: { kind: "bound", text: "2 <= n <= 3000" },
  },
  {
    id: "card-report",
    playerId: "dov",
    seat: "runner",
    at: at(26, 31),
    card: { kind: "report", category: "time-limit", failingCase: 'case 41: n = 3000, marks = "????…"' },
  },
  {
    id: "card-hint-2",
    playerId: "brin",
    seat: "oracle",
    at: at(33, 18),
    card: { kind: "hint", index: 1, text: hint(1) },
  },
];

/** What the Cartographer played, for the unmasking. Filtered, so it cannot fall out of step. */
export const TAGGER_CARDS: CardEntry[] = ROUND_CARDS.filter((entry) => entry.seat === "tagger");

/** The tribunal's ballots. A null target is Skip, exactly as a hall records it. */
export const ROUND_BALLOTS: Vote[] = [
  { voterId: "ada", targetId: "cass" },
  { voterId: "brin", targetId: "cass" },
  { voterId: "cass", targetId: "dov" },
  { voterId: "dov", targetId: null },
  { voterId: "warden", targetId: null },
];
