"use client";
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { errorMessage } from "@/client/api";
import { useRoom } from "@/client/useRoom";
import { Lobby } from "@/components/lobby/Lobby";
import { Notice } from "@/components/ui";
import type { Action } from "@/game/types";
import { BuildingPhase, type BoardProps } from "./BuildingPhase";
import { GameHeader } from "./GameHeader";
import { JoinForm } from "./JoinForm";
import { ReadingPhase } from "./ReadingPhase";
import { RevealScreen } from "./RevealScreen";
import { clearCredentials, useCredentials } from "./credentialsStore";
import "./game.css";

/** The whole game at /room/[code]: join, then every phase, rendered from the polled PlayerView. */
export function RoomScreen({ code }: { code: string }): ReactElement {
  const creds = useCredentials(code);
  const { view, error, clockOffset, send, busy } = useRoom(creds ?? null);
  const [actionError, setActionError] = useState<string | null>(null);
  const act = useCallback(
    (action: Action): Promise<boolean> =>
      send(action).then(
        () => {
          setActionError(null);
          return true;
        },
        (failure: unknown) => {
          setActionError(errorMessage(failure));
          return false;
        },
      ),
    [send],
  );

  // A token the hall no longer knows, or a hall that is gone, is not a seat: forget it and offer the door.
  const lost = error !== null && (error.code === "unauthorized" || error.code === "not-found") ? error.message : null;
  useEffect(() => {
    if (lost !== null) clearCredentials(code);
  }, [lost, code]);

  if (creds === undefined) {
    return (
      <main className="room">
        <p className="muted">Opening the hall.</p>
      </main>
    );
  }
  if (creds === null) return <JoinForm code={code} reason={lost} />;
  if (view === null) {
    return <main className="room">{error === null ? <p className="muted">Taking your seat.</p> : <Notice kind="error">{error.message}</Notice>}</main>;
  }
  return (
    <main className="room">
      <GameHeader view={view} />
      {actionError === null ? null : <Notice kind="error">{actionError}</Notice>}
      {error === null || error.message === actionError ? null : <Notice kind="error">{error.message}</Notice>}
      <Board view={view} clockOffset={clockOffset} send={send} act={act} busy={busy} />
    </main>
  );
}

function Board({ view, clockOffset, send, act, busy }: BoardProps & { send: (action: Action) => Promise<void> }): ReactElement {
  switch (view.phase) {
    case "lobby":
      return <Lobby view={view} send={send} busy={busy} />;
    case "reading":
      return <ReadingPhase view={view} clockOffset={clockOffset} />;
    case "building":
    case "freeze":
    case "finalVote":
      return <BuildingPhase view={view} clockOffset={clockOffset} act={act} busy={busy} />;
    case "reveal":
      return <RevealScreen view={view} />;
  }
}
