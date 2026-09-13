import { SEATS } from "./types";
import type { Player, Seat } from "./types";
import { at } from "./util";

/**
 * Assign seats and the imposter. Seats: the first four players (in shuffled order) get one each
 * of tagger/oracle/bounds/runner; players 5..8 get a duplicate of oracle, tagger, bounds, oracle
 * (in that order) so extra seats create "two oracles disagree, one is lying" deduction.
 * Exactly one imposter, chosen uniformly. Returns new player objects (no mutation).
 */
export function deal(players: Player[], random: () => number): Player[] {
  // Shuffling the seat list is the same permutation as shuffling the players, and keeps join order.
  const seats = shuffle([...SEATS, ...EXTRA_SEATS].slice(0, players.length), random);
  const imposterId = at(players, Math.floor(random() * players.length)).id;
  return players.map((p, i) => ({ ...p, seats: [at(seats, i)], isImposter: p.id === imposterId }));
}

export const EXTRA_SEATS: readonly Seat[] = ["oracle", "tagger", "bounds", "oracle"];

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = at(out, i);
    out[i] = at(out, j);
    out[j] = a;
  }
  return out;
}
