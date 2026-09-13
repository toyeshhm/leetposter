import { SEATS } from "@/game/types";
import type { PanelView, PlayerView, Seat, VoteRoundView } from "@/game/types";
import { mmss } from "@/components/ui/clock";
import { duration } from "./copy";

/** Whether this view carries the panel for a seat (own seats, or every seat for the Changeling and at the reveal). */
export function panelHas(panel: PanelView, seat: Seat): boolean {
  switch (seat) {
    case "tagger":
      return panel.tags !== null;
    case "oracle":
      return panel.hints !== null;
    case "bounds":
      return panel.constraints !== null;
    case "runner":
      return panel.title !== null;
  }
}

/** Seats whose panel I can see: mine first, then the rest. */
export function visibleSeats(view: PlayerView): Seat[] {
  const held = view.me.seats;
  return [...held, ...SEATS.filter((seat) => !held.includes(seat) && panelHas(view.panel, seat))];
}

export function holdersOf(view: PlayerView, seat: Seat): string[] {
  return view.players.filter((p) => p.seats.includes(seat)).map((p) => p.name);
}

export function playerName(view: PlayerView, id: string | null): string {
  return view.players.find((p) => p.id === id)?.name ?? "someone";
}

/** Why the tribunal bell cannot be rung right now; null when it can. */
export function freezeReason(view: PlayerView): string | null {
  if (view.canCallFreeze) return null;
  if (view.me.ejected) return "You were cast out.";
  if (view.me.freezeUsed) return "You have rung your bell. One tribunal per player.";
  if (view.phase !== "building") return "No tribunal can be called right now.";
  const { buildMs, freezeOpensAfterMs, freezeClosesBeforeEndMs } = view.settings;
  const elapsed = buildMs - view.clock.buildRemainingMs;
  if (elapsed < freezeOpensAfterMs) {
    return `Opens after ${duration(freezeOpensAfterMs)} of work, ${mmss(freezeOpensAfterMs - elapsed)} to go.`;
  }
  if (view.clock.buildRemainingMs < freezeClosesBeforeEndMs) return `Closed for the last ${duration(freezeClosesBeforeEndMs)} of work.`;
  return "No tribunal can be called right now.";
}

/** The last resolved vote round, if it resolved within `withinMs` of the server clock. */
export function recentResult(view: PlayerView, withinMs: number): VoteRoundView | null {
  const last = view.votes.at(-1);
  if (last === undefined) return null;
  const { result } = last;
  if (result === null) return null;
  return view.clock.serverNow - result.resolvedAt <= withinMs ? last : null;
}
