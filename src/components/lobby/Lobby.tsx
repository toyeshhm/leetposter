"use client";
import { useState, type ReactElement } from "react";
import { errorMessage } from "@/client/api";
import { Button, Frame, Notice } from "@/components/ui";
import { MIN_PLAYERS, type Action, type PlayerView } from "@/game/types";
import { ProblemForm } from "./ProblemForm";
import { Roster, SeatLegend } from "./Roster";
import { SettingsForm } from "./SettingsForm";
import "./lobby.css";

interface Note {
  kind: "info" | "error";
  text: string;
}

function HostControls({ view, send, busy }: { view: PlayerView; send: (action: Action) => Promise<void>; busy: boolean }): ReactElement {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enough = view.players.length >= MIN_PLAYERS;
  const canStart = view.problemReady && enough;

  const start = async (): Promise<void> => {
    setStarting(true);
    setError(null);
    try {
      await send({ type: "start" });
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setStarting(false);
    }
  };

  const readiness = [
    view.problemReady ? "The problem is set." : "No problem yet.",
    enough ? "Enough at the table." : `${String(MIN_PLAYERS - view.players.length)} more needed at the table.`,
  ].join(" ");

  return (
    <>
      <ProblemForm send={send} busy={busy} problem={view.problem} />
      <SettingsForm send={send} busy={busy} settings={view.settings} />
      <Frame title="Begin">
        <div className="lobby-stack">
          <p className="muted prose">{readiness} Seats and the Changeling are dealt the moment you begin. Nobody joins after that.</p>
          <div className="lobby-actions">
            <Button variant="primary" disabled={!canStart || busy} loading={starting} onClick={() => void start()}>
              Begin the reading
            </Button>
          </div>
          {error === null ? null : <Notice kind="error">{error}</Notice>}
        </div>
      </Frame>
    </>
  );
}

/** The hall before the deal: code, roster, seat legend, and the host's controls. */
export function Lobby({ view, send, busy }: { view: PlayerView; send: (action: Action) => Promise<void>; busy: boolean }): ReactElement {
  const [copyNote, setCopyNote] = useState<Note | null>(null);

  const copyLink = async (): Promise<void> => {
    const link = `${window.location.origin}/room/${view.code}`;
    // ponytail: clipboard is absent on insecure origins and some webviews; say so instead of throwing.
    if (!("clipboard" in navigator)) {
      setCopyNote({ kind: "error", text: `This browser will not copy. The link is ${link}` });
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopyNote({ kind: "info", text: "Link copied. Send it to the others." });
    } catch (e: unknown) {
      setCopyNote({ kind: "error", text: `Could not copy (${errorMessage(e)}). The link is ${link}` });
    }
  };

  return (
    <div className="lobby">
      <header className="lobby-head">
        <div>
          <p className="muted">The hall</p>
          <p className="lobby-code">{view.code}</p>
        </div>
        <Button variant="secondary" onClick={() => void copyLink()}>
          Copy link
        </Button>
        {copyNote === null ? null : (
          <Notice kind={copyNote.kind} className="lobby-copy-note">
            {copyNote.text}
          </Notice>
        )}
      </header>

      <div className="lobby-grid">
        <Frame title="At the table">
          <Roster players={view.players} meId={view.me.id} />
        </Frame>
        <Frame title="The seats">
          <SeatLegend />
        </Frame>
      </div>

      {view.me.isHost ? (
        <HostControls view={view} send={send} busy={busy} />
      ) : (
        <Notice>Waiting for the host to set the problem and begin the reading. Keep the voice call open.</Notice>
      )}
    </div>
  );
}
