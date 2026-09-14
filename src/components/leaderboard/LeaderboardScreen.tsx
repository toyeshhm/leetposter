"use client";

import { useEffect, useState, type ReactElement } from "react";
import { call, errorMessage } from "@/client/api";
import { useSession } from "@/client/session";
import { Button, Notice } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import type { Board, BoardRow, LeaderboardPage } from "@/server/ratings";
import "./leaderboard.css";

const BOARDS: { id: Board; name: string }[] = [
  { id: "overall", name: "Overall" },
  { id: "crew", name: "Crew" },
  { id: "changeling", name: "Changeling" },
  { id: "solves", name: "Solves" },
  { id: "changeling-wins", name: "Changeling wins" },
];

type Loaded = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; page: LeaderboardPage };

/** Five boards, one ranked table. Signed in, your own line is marked, and shown under the table when it is off it. */
export function LeaderboardScreen(): ReactElement {
  const session = useSession();
  const [board, setBoard] = useState<Board>("overall");
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const waiting = session.status === "loading";
  const token = session.status === "in" && session.accessToken !== null ? session.accessToken : undefined;

  useEffect(() => {
    if (waiting) return;
    let live = true;
    call<LeaderboardPage>(`/api/leaderboard?board=${board}`, { method: "GET" }, token)
      .then((page) => {
        if (live) setLoaded({ status: "ready", page });
      })
      .catch((error: unknown) => {
        if (live) setLoaded({ status: "error", message: errorMessage(error) });
      });
    return () => {
      live = false;
    };
  }, [board, token, waiting]);

  return (
    <>
      <div className="board-switch" role="group" aria-label="Board">
        {BOARDS.map((b) => (
          <Button
            key={b.id}
            variant={b.id === board ? "secondary" : "ghost"}
            aria-pressed={b.id === board}
            onClick={() => {
              setBoard(b.id);
              setLoaded({ status: "loading" });
            }}
          >
            {b.name}
          </Button>
        ))}
      </div>
      {loaded.status === "loading" ? <p className="muted">Reading the record.</p> : null}
      {loaded.status === "error" ? <Notice kind="error">{loaded.message}</Notice> : null}
      {loaded.status === "ready" ? <Table page={loaded.page} /> : null}
    </>
  );
}

function Table({ page }: { page: LeaderboardPage }): ReactElement {
  const counting = page.board === "solves" || page.board === "changeling-wins";
  const name = BOARDS.find((b) => b.id === page.board)?.name ?? page.board;
  if (page.rows.length === 0) return <p className="muted">No halls on the record yet.</p>;
  const mine = (row: BoardRow): boolean => page.me !== null && row.username === page.me.username;
  return (
    <>
      <table className="board" aria-label={`${name} board`}>
        <thead>
          <tr>
            <th scope="col" className="board-num">
              Rank
            </th>
            <th scope="col">Player</th>
            <th scope="col" className="board-num">
              {counting ? "Count" : "Rating"}
            </th>
            <th scope="col" className="board-num board-wide">
              Games
            </th>
            <th scope="col" className="board-num board-wide">
              Wins
            </th>
          </tr>
        </thead>
        <tbody>
          {page.rows.map((row) => (
            <tr key={row.username} className={cx(mine(row) && "board-me")}>
              <td className={cx("board-num", row.rank <= 3 && "board-top")}>{String(row.rank)}</td>
              <td>@{row.username}</td>
              <td className="board-num">{String(row.score)}</td>
              <td className="board-num board-wide">{String(row.games)}</td>
              <td className="board-num board-wide">{String(row.wins)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {page.me !== null && !page.rows.some(mine) ? (
        <p className="board-mine" aria-label="Your place">
          <span>#{String(page.me.rank)}</span>
          <span>@{page.me.username}</span>
          <span>{String(page.me.score)}</span>
          <span className="muted">
            {String(page.me.games)} games, {String(page.me.wins)} wins
          </span>
        </p>
      ) : null}
    </>
  );
}
