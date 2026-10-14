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

/**
 * Your role, shut until asked for. Crew and Leetposter get the same shut row and the same red word,
 * so a glance over the shoulder reads nothing: not the text, not the colour, not whether the row is there.
 */
export function RoleReveal({ isImposter, seats }: { isImposter: boolean; seats: Seat[] }): ReactElement {
  const held = seats.map((seat) => `the ${SEAT_TITLES[seat]}`).join(" and ");
  return (
    <details className="role" aria-label="Your role">
      <summary>
        <span>Your role</span> <span className="role-hint muted">Open to look; shut it before anyone leans over.</span>
      </summary>
      <div className="role-body">
        {isImposter ? <ChangelingMask size={40} decorative /> : null}
        <p>
          You are <strong className="role-name">{isImposter ? "the Leetposter" : "crew"}</strong>. {isImposter ? `You hold ${held} like anyone else. Lie well.` : `You hold ${held}. Tell it true.`}
        </p>
      </div>
    </details>
  );
}
