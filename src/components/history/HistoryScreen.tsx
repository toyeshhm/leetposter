"use client";

import Link from "next/link";
import { useEffect, useState, type ReactElement } from "react";
import { call, errorMessage, fetchAchievements, fetchHistory } from "@/client/api";
import { useSession } from "@/client/session";
import { ChangelingMask } from "@/components/art";
import { outcomeWords } from "@/components/game/copy";
import { Badge, Divider, Frame, Notice } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { SEATS, type Outcome, type Seat } from "@/game/types";
import type { Achievement, GameResultRow } from "@/server/achievements";
import type { LeaderboardPage } from "@/server/ratings";
import { MARKS } from "./Marks";
import "./history.css";

type Loaded =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; games: GameResultRow[]; achievements: Achievement[]; ratings: LeaderboardPage["ratings"] };

/** The signed-in player's record of games and achievements. */
export function HistoryScreen(): ReactElement {
  const session = useSession();
  const token = session.accessToken;
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    if (token === null) return;
    let live = true;
    Promise.all([fetchHistory(token), fetchAchievements(token), call<LeaderboardPage>("/api/leaderboard?board=overall", { method: "GET" }, token)])
      .then(([h, a, l]) => {
        if (live) setLoaded({ status: "ready", games: h.games, achievements: a.achievements, ratings: l.ratings });
      })
      .catch((error: unknown) => {
        if (live) setLoaded({ status: "error", message: errorMessage(error) });
      });
    return () => {
      live = false;
    };
  }, [token]);

  if (session.status === "loading") return <p className="muted">Opening the ledger.</p>;
  if (session.status !== "in" || token === null) {
    return (
      <Notice>
        The ledger is kept for those who sign in and choose a name. <Link href="/account">Sign in or sign up</Link> and your halls are remembered.
      </Notice>
    );
  }
  if (loaded.status === "loading") return <p className="muted">Opening the ledger.</p>;
  if (loaded.status === "error") return <Notice kind="error">{loaded.message}</Notice>;
  return (
    <div className="history">
      <h1 className="history-title">{session.username ?? "Your"} record</h1>
      {loaded.ratings === null ? null : (
        <p className="history-elo" aria-label="Your ratings">
          <span>Overall {String(loaded.ratings.overall.rating)}</span>
          <span>Crew {String(loaded.ratings.crew.rating)}</span>
          <span>Changeling {String(loaded.ratings.changeling.rating)}</span>
          <span className="muted">
            {String(loaded.ratings.overall.games)} {loaded.ratings.overall.games === 1 ? "hall" : "halls"} rated
          </span>
          <Link href="/leaderboard">Leaderboard</Link>
        </p>
      )}
      <Divider>The halls</Divider>
      <Games games={loaded.games} />
      <Divider>Achievements</Divider>
      <Frame className="marks-frame">
        <ul className="marks" aria-label="Achievements">
          {loaded.achievements.map((a) => {
            const Mark = MARKS[a.id];
            return (
              <li key={a.id} className={cx("mark", !a.earned && "mark-unearned")}>
                <Mark size={72} decorative />
                <h3 className="mark-name">{a.name}</h3>
                <p className="mark-text">{a.description}</p>
                {a.earned ? (
                  <p className="mark-earned">Earned</p>
                ) : (
                  <p className="mark-progress">
                    {String(a.progress.have)} of {String(a.progress.need)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </Frame>
    </div>
  );
}

const REASONS: readonly Outcome["reason"][] = ["accepted", "imposter-ejected", "time", "final-vote", "submissions"];
const isReason = (s: string): s is Outcome["reason"] => (REASONS as readonly string[]).includes(s);
const isSeat = (s: string): s is Seat => (SEATS as readonly string[]).includes(s);

function Games({ games }: { games: GameResultRow[] }): ReactElement {
  if (games.length === 0) return <p className="muted">No halls yet. Sit through one to the unmasking, signed in, and it lands here.</p>;
  return (
    <ol className="games" aria-label="Your halls">
      {games.map((g) => {
        // Won as crew or lost as the Changeling means the crew took it; the reason reads the same either way.
        const winner: Outcome["winner"] = g.won === g.was_imposter ? "imposter" : "crew";
        const reason = isReason(g.reason) ? outcomeWords({ winner, reason: g.reason }).reason : g.reason;
        return (
          <li key={g.id} className="game">
            <p className="game-when">
              <time dateTime={g.played_at}>{new Date(g.played_at).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}</time>
              <span className="mono">Hall {g.code}</span>
              <span className="muted">{String(g.players)} at the table</span>
            </p>
            <p className="game-seats">
              {g.was_imposter ? <ChangelingMask size={24} decorative /> : null}
              <span className={cx("game-role", g.was_imposter ? "game-lie" : "game-true")}>{g.was_imposter ? "the Changeling" : "crew"}</span>
              {g.seats.filter(isSeat).map((seat) => (
                <Badge key={seat} seat={seat} />
              ))}
              {g.ejected ? <span className="muted">cast out</span> : null}
            </p>
            <p className="game-outcome">
              <strong>{g.won ? "Won." : "Lost."}</strong> {reason}
            </p>
            <p className="muted game-cards">
              {String(g.cards_played)} {g.cards_played === 1 ? "card" : "cards"} played, {String(g.cards_altered)} altered.
            </p>
          </li>
        );
      })}
    </ol>
  );
}
