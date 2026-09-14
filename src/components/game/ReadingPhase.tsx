import type { ReactElement } from "react";
import { Timer } from "@/components/ui";
import type { PlayerView } from "@/game/types";
import { ProblemText } from "./ProblemText";
import { ChangelingNote, SeatPanel } from "./SeatPanel";

/** Five minutes alone with the statement and your own panel. */
export function ReadingPhase({ view, clockOffset }: { view: PlayerView; clockOffset: number }): ReactElement {
  return (
    <div className="read-grid">
      <ProblemText problem={view.problem} />
      <aside className="read-side" aria-label="Your seat">
        <div className="clock clock-big">
          <span className="clock-label">The Reading ends in</span>
          {view.clock.phaseEndsAt === null ? null : <Timer targetAt={view.clock.phaseEndsAt} clockOffset={clockOffset} />}
        </div>
        {view.me.isImposter ? <ChangelingNote seats={view.me.seats} /> : null}
        {view.me.seats.map((seat) => (
          <SeatPanel key={seat} seat={seat} panel={view.panel} />
        ))}
      </aside>
    </div>
  );
}
