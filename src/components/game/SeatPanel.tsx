import type { ReactElement, ReactNode } from "react";
import { ChangelingMask, SEAT_TITLES, SeatSigil } from "@/components/art";
import { Frame } from "@/components/ui";
import type { PanelView, Seat } from "@/game/types";
import { SEAT_DUTIES } from "./copy";

interface SeatPanelProps {
  seat: Seat;
  panel: PanelView;
  /** Actions for the seat, rendered under the panel. */
  children?: ReactNode;
}

/** One seat's private panel in a Frame with its sigil, plus whatever the seat may play. */
export function SeatPanel({ seat, panel, children }: SeatPanelProps): ReactElement {
  return (
    <Frame title={SEAT_TITLES[seat]} className="panel">
      <div className="panel-head">
        <SeatSigil seat={seat} size={48} decorative />
        <p className="panel-duty">{SEAT_DUTIES[seat]}</p>
      </div>
      <PanelBody seat={seat} panel={panel} />
      {children}
    </Frame>
  );
}

function PanelBody({ seat, panel }: { seat: Seat; panel: PanelView }): ReactElement {
  const empty = <p className="muted">Nothing to see here.</p>;
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

/** The one line the Changeling reads and the crew never does. */
export function ChangelingNote({ seats, size = 64 }: { seats: Seat[]; size?: number }): ReactElement {
  const held = seats.map((seat) => `the ${SEAT_TITLES[seat]}`).join(" and ");
  return (
    <div className="changeling-note">
      <ChangelingMask size={size} decorative />
      <p>You are the Changeling. You hold {held} like anyone else. Lie well.</p>
    </div>
  );
}
