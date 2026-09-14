/**
 * Elo over halls. A hall is one match: the Changeling versus the crew as a body.
 * Pure: results.ts loads the current rows, calls rateHall, and stores what comes back.
 */

export const LADDERS = ["overall", "crew", "changeling"] as const;
export type Ladder = (typeof LADDERS)[number];

// ponytail: K = 32 (the classic chess club value; a few halls move a rating visibly) and every guest or
// unrated account plays as 1200. Tune K if ratings swing too hard once the table has a history.
export const K = 32;
export const DEFAULT_RATING = 1200;

export interface Ratings {
  overall: number;
  crew: number;
  changeling: number;
}

export interface HallPlayer {
  /** null for a guest: they weigh in at 1200 and take nothing away. */
  userId: string | null;
  isImposter: boolean;
  rating: Ratings;
}

export interface RatingChange {
  userId: string;
  ladder: Ladder;
  rating: number;
  won: boolean;
}

/** Probability that a rated `a` beats a rated `b`. Symmetric: expected(a, b) + expected(b, a) = 1. */
export function expected(a: number, b: number): number {
  return 1 / (1 + 10 ** ((b - a) / 400));
}

function bump(rating: number, opponent: number, won: boolean): number {
  return Math.round(rating + K * ((won ? 1 : 0) - expected(rating, opponent)));
}

function overallOf(p: HallPlayer): number {
  return p.userId === null ? DEFAULT_RATING : p.rating.overall;
}

/**
 * New ratings for every account player at the table, one entry per ladder touched.
 * The crew rate against the Changeling's overall rating; the Changeling rates against the crew's mean.
 * Overall moves for everyone, crew only for the crew, changeling only for the Changeling.
 */
export function rateHall(players: HallPlayer[], winner: "crew" | "imposter"): RatingChange[] {
  const changeling = players.find((p) => p.isImposter);
  const crew = players.filter((p) => !p.isImposter);
  const rc = changeling === undefined ? DEFAULT_RATING : overallOf(changeling);
  const rcrew = crew.length === 0 ? DEFAULT_RATING : crew.reduce((sum, p) => sum + overallOf(p), 0) / crew.length;
  const changes: RatingChange[] = [];
  for (const p of players) {
    if (p.userId === null) continue;
    const won = (winner === "imposter") === p.isImposter;
    const opponent = p.isImposter ? rcrew : rc;
    const own: Ladder = p.isImposter ? "changeling" : "crew";
    changes.push(
      { userId: p.userId, ladder: "overall", rating: bump(p.rating.overall, opponent, won), won },
      { userId: p.userId, ladder: own, rating: bump(p.rating[own], opponent, won), won },
    );
  }
  return changes;
}
