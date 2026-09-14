"use client";
import dynamic from "next/dynamic";
import type { ReactElement } from "react";
import { useCredentials } from "@/components/game/credentialsStore";
import type { PlayerView } from "@/game/types";

/* CodeMirror and Yjs are browser-only: loaded on the client, never prerendered. */
const SharedEditor = dynamic(() => import("./SharedEditor").then((m) => m.SharedEditor), {
  ssr: false,
  loading: () => <p className="muted">Unrolling the manuscript.</p>,
});

/** Why the keyboard is locked for this player right now; null while they may type. */
export function lockReason(view: PlayerView): string | null {
  if (view.phase === "reveal") return "The Work is over.";
  if (view.me.ejected) return "You were cast out; you may watch.";
  if (view.phase === "freeze" || view.phase === "finalVote") return "Hands off the keyboard until the vote is in.";
  return null;
}

/** The hall's one shared file, for the seat this browser holds. */
export function Editor({ view }: { view: PlayerView }): ReactElement | null {
  const creds = useCredentials(view.code);
  if (creds === undefined || creds === null) return null;
  const reason = lockReason(view);
  return <SharedEditor creds={creds} playerName={view.players.find((p) => p.id === view.me.id)?.name ?? "someone"} readOnly={reason !== null} reason={reason} showRun={view.phase !== "reveal"} />;
}
