import type { ReactElement } from "react";
import { ChangelingMask, SEAT_TITLES, SeatSigil } from "@/components/art";
import { MAX_PLAYERS, MIN_PLAYERS, SEATS, type PublicPlayer, type Seat } from "@/game/types";
import "./lobby.css";

/** Who is at the table. Seats are not dealt until the reading begins, so names only. */
export function Roster({ players, meId }: { players: PublicPlayer[]; meId: string }): ReactElement {
  const missing = MIN_PLAYERS - players.length;
  return (
    <div className="lobby-stack">
      <ol className="lobby-roster">
        {players.map((p) => (
          <li key={p.id}>
            <span className="lobby-name">{p.name}</span>
            {p.username === null ? null : <span className="muted">as @{p.username}</span>}
            {p.isHost ? <span className="muted">host</span> : null}
            {p.id === meId ? <span className="muted">you</span> : null}
          </li>
        ))}
      </ol>
      <p className="muted tabular">
        {players.length} of {MAX_PLAYERS} seats taken.{missing > 0 ? ` ${String(missing)} more before the reading can begin.` : ""}
      </p>
    </div>
  );
}

const SEAT_LINES: Record<Seat, string> = {
  tagger: "Sees the topic tags. Declares exactly as many as the problem carries.",
  oracle: "Sees the hints, in order. Gives them up one at a time when the table asks.",
  bounds: "Sees the constraints. Declares bounds, as many as it likes.",
  runner: "Sees the title and the link. The only one who submits to the judge.",
};

/** The four seats and the one thing that is not a seat. */
export function SeatLegend(): ReactElement {
  return (
    <ul className="lobby-legend">
      {SEATS.map((seat) => (
        <li key={seat}>
          <SeatSigil seat={seat} size={40} decorative />
          <div>
            <p className="lobby-name">{SEAT_TITLES[seat]}</p>
            <p className="muted">{SEAT_LINES[seat]}</p>
          </div>
        </li>
      ))}
      <li>
        <ChangelingMask size={40} decorative />
        <div>
          <p className="lobby-name">The Changeling</p>
          <p className="muted">Holds a seat like anyone else and sees only that seat&apos;s panel. May lie on any card. Cannot fake a verdict.</p>
        </div>
      </li>
    </ul>
  );
}
