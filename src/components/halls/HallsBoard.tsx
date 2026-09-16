"use client";

import Link from "next/link";
import { useEffect, useState, type ReactElement } from "react";
import { call, errorMessage } from "@/client/api";
import { PHASE_NAMES } from "@/components/game/copy";
import { Notice } from "@/components/ui";
import { MAX_PLAYERS } from "@/game/types";
import type { HallRow } from "@/server/store";
import "@/components/leaderboard/leaderboard.css";
import "./halls.css";

const REFRESH_MS = 10_000;

type Loaded = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; halls: HallRow[] };

/** Listed halls that moved in the last fifteen minutes, refreshed while the page is open. */
export function HallsBoard(): ReactElement {
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async (): Promise<void> => {
      try {
        const { halls } = await call<{ halls: HallRow[] }>("/api/halls", { method: "GET" });
        if (live) setLoaded({ status: "ready", halls });
      } catch (e: unknown) {
        if (live) setLoaded({ status: "error", message: errorMessage(e) });
      }
      if (live) timer = setTimeout(() => void poll(), REFRESH_MS);
    };
    void poll();
    return () => {
      live = false;
      if (timer !== null) clearTimeout(timer);
    };
  }, []);

  if (loaded.status === "loading") return <p className="muted">Reading the board.</p>;
  if (loaded.status === "error") return <Notice kind="error">{loaded.message}</Notice>;
  if (loaded.halls.length === 0) {
    return (
      <p className="muted prose">No hall is listed right now. A host lists theirs from the lobby, under The board, and it stays here while the hall moves.</p>
    );
  }
  return (
    <table className="board" aria-label="Listed halls">
      <thead>
        <tr>
          <th scope="col">Hall</th>
          <th scope="col">Host</th>
          <th scope="col">Phase</th>
          <th scope="col" className="board-num">
            Seats
          </th>
          <th scope="col" className="board-num board-wide">
            Rating
          </th>
          <th scope="col">
            <span className="sr-only">Open</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {loaded.halls.map((h) => (
          <tr key={h.code}>
            <td className="halls-code">{h.code}</td>
            <td>{h.host}</td>
            <td>{PHASE_NAMES[h.phase]}</td>
            <td className="board-num">
              {String(h.players)} of {String(MAX_PLAYERS)}
            </td>
            <td className="board-num board-wide">{h.rating === null ? <span className="muted">unrated</span> : String(h.rating)}</td>
            <td className="halls-open">
              {h.watchable ? (
                <Link href={`/room/${h.code}/watch`}>Watch</Link>
              ) : (
                <Link href={`/room/${h.code}`}>Take a seat</Link>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
