import Link from "next/link";
import type { ReactElement } from "react";
import { ChangelingMask } from "@/components/art";
import { Badge } from "@/components/ui";
import type { PlayerView } from "@/game/types";
import { PHASE_NAMES } from "./copy";

/** The phase in the game's voice, the hall code (the lobby shows it large already), who I am, and the way out. */
export function GameHeader({ view }: { view: PlayerView }): ReactElement {
  const me = view.players.find((p) => p.id === view.me.id);
  return (
    <header className="room-head">
      <h1 className="room-phase">{PHASE_NAMES[view.phase]}</h1>
      {view.phase === "lobby" ? null : (
        <p className="room-hall">
          <span className="room-hall-label">Hall</span>
          <span className="room-code">{view.code}</span>
        </p>
      )}
      <p className="room-me">
        {view.me.isImposter ? <ChangelingMask size={24} title="You are the Changeling" /> : null}
        <span className="room-name">{me?.name ?? "You"}</span>
        {view.me.seats.map((seat) => (
          <Badge key={seat} seat={seat}>
            you
          </Badge>
        ))}
        {view.me.ejected ? <span className="muted">cast out</span> : null}
      </p>
      <Link href="/" className="room-leave">
        Leave the hall
      </Link>
    </header>
  );
}
