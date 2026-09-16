import type { ReactElement } from "react";
import { SEAT_TITLES, SeatSigil } from "@/components/art";
import { Frame } from "@/components/ui";
import type { Seat, SpectatorView } from "@/game/types";

/** One seat as a spectator sees it: who holds it and what it knows. The duty line is the holder's, not ours. */
export function WatchPanel({ seat, view }: { seat: Seat; view: SpectatorView }): ReactElement {
  const holders = view.players.filter((p) => !p.ejected && p.seats.includes(seat)).map((p) => p.name);
  const { panel } = view;
  return (
    <Frame title={SEAT_TITLES[seat]} className="panel">
      <div className="panel-head">
        <SeatSigil seat={seat} size={48} decorative />
        <p className="panel-duty">{holders.length === 0 ? "Not yet dealt." : `Held by ${holders.join(" and ")}.`}</p>
      </div>
      <Body seat={seat} panel={panel} />
    </Frame>
  );
}

function Body({ seat, panel }: { seat: Seat; panel: SpectatorView["panel"] }): ReactElement {
  const empty = <p className="muted">No problem set yet.</p>;
  switch (seat) {
    case "tagger":
      return panel.tags === null ? (
        empty
      ) : (
        <ul className="panel-tags" aria-label="Topic tags">
          {panel.tags.map((tag, i) => (
            <li key={`${String(i)}-${tag}`}>{tag}</li>
          ))}
        </ul>
      );
    case "oracle":
      return panel.hints === null ? (
        empty
      ) : (
        <ol className="panel-hints" aria-label="Hints, in order">
          {panel.hints.map((hint, i) => (
            <li key={`${String(i)}-${hint}`}>{hint}</li>
          ))}
        </ol>
      );
    case "bounds":
      return panel.constraints === null ? empty : <pre className="mono panel-pre">{panel.constraints}</pre>;
    case "runner":
      return panel.title === null || panel.url === null ? (
        empty
      ) : (
        <p className="panel-link">
          <a href={panel.url} target="_blank" rel="noreferrer">
            {panel.title}
          </a>
          <span className="muted">opens in a new tab</span>
        </p>
      );
  }
}
