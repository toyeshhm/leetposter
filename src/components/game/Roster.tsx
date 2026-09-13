import type { ReactElement } from "react";
import { Badge } from "@/components/ui";
import type { PlayerView } from "@/game/types";

/** Who sits where. States are words, never colors. */
export function Roster({ view }: { view: PlayerView }): ReactElement {
  const voted = new Set(view.activeVote?.votedIds ?? []);
  return (
    <section className="roster" aria-labelledby="roster-title">
      <h2 id="roster-title" className="section-title">
        At the table
      </h2>
      <ul className="roster-list">
        {view.players.map((p) => (
          <li key={p.id} className="roster-row" data-ejected={p.ejected}>
            <span className="roster-name">{p.name}</span>
            {p.id === view.me.id ? <span className="roster-note">you</span> : null}
            {p.isHost ? <span className="roster-note">host</span> : null}
            {p.seats.map((seat) => (
              <Badge key={seat} seat={seat} />
            ))}
            {p.isImposter === true ? <span className="roster-word">Changeling</span> : null}
            {p.ejected ? <span className="roster-note">cast out</span> : null}
            {!p.ejected && p.freezeUsed ? <span className="roster-note">bell rung</span> : null}
            {voted.has(p.id) ? <span className="roster-note">voted</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
