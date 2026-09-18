"use client";
import type { ReactElement } from "react";
import { Timer } from "@/components/ui";
import { mmss } from "@/components/ui/clock";
import { useServerNow } from "@/components/ui/useServerNow";
import { cx } from "@/components/ui/cx";
import type { SpectatorView, VoteRoundView } from "@/game/types";

/** Tribunals as a spectator sees them: the live one with its clocks and who has voted, the settled ones with their ballots. */
export function WatchVotes({ view, clockOffset }: { view: SpectatorView; clockOffset: number }): ReactElement | null {
  if (view.votes.length === 0) return null;
  const name = (id: string | null): string => view.players.find((p) => p.id === id)?.name ?? "someone";
  const numbered = view.votes.map((round, i) => ({ round, n: view.votes.slice(0, i + 1).filter((r) => r.kind === "freeze").length }));
  return (
    <section className="watch-votes" aria-labelledby="watch-votes-title">
      <h2 id="watch-votes-title" className="section-title">
        Tribunals
      </h2>
      <ol className="reveal-votes">
        {numbered.map(({ round, n }) => (
          <li key={round.startedAt} className="reveal-vote">
            <h3 className="section-title">{round.kind === "final" ? "The Reckoning" : `Tribunal ${String(n)}, called by ${name(round.calledBy)}`}</h3>
            {round.result === null ? (
              <Live round={round} clockOffset={clockOffset} voted={round.votedIds.map(name)} />
            ) : (
              <>
                <p>{round.result.ejectedId === null ? "No one was cast out." : `${name(round.result.ejectedId)} was cast out.`}</p>
                <ul className="reveal-ballots">
                  {(round.votes ?? []).map((v) => (
                    <li key={v.voterId}>
                      <span>{name(v.voterId)}</span>
                      <span className="muted">voted</span>
                      <span>{v.targetId === null ? "Skip" : name(v.targetId)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Live({ round, clockOffset, voted }: { round: VoteRoundView; clockOffset: number; voted: string[] }): ReactElement {
  const now = useServerNow(clockOffset);
  const stage = now !== null && now >= round.discussionEndsAt ? "vote" : "discussion";
  return (
    <>
      <div className="tribunal-clocks">
        <div className={cx("clock", stage === "discussion" && "clock-live")}>
          <span className="clock-label">Discussion</span>
          <Timer targetAt={round.discussionEndsAt} clockOffset={clockOffset} />
        </div>
        <div className={cx("clock", stage === "vote" && "clock-live")}>
          <span className="clock-label">Vote</span>
          {stage === "vote" ? <Timer targetAt={round.voteEndsAt} clockOffset={clockOffset} /> : <span className="timer-paused tabular">{mmss(round.voteEndsAt - round.discussionEndsAt)}</span>}
        </div>
      </div>
      <p className="tribunal-voted">
        <span className="clock-label">Voted</span>
        {voted.length === 0 ? <span className="muted">no one yet</span> : <span>{voted.join(", ")}</span>}
      </p>
    </>
  );
}
