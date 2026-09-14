import Link from "next/link";
import type { ReactElement } from "react";
import { ChangelingMask, CrewEmblem, SEAT_TITLES } from "@/components/art";
import { Editor } from "@/components/editor/Editor";
import { Badge, Divider, Frame, Notice } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import type { PlayerView, PublicPlayer, Seat } from "@/game/types";
import { outcomeWords } from "./copy";
import { SeatTruth } from "./RevealSeat";
import { playerName } from "./select";
import "./reveal.css";

/** Unmasking: the outcome, the Changeling, every card against the truth, and how the votes fell. */
export function RevealScreen({ view }: { view: PlayerView }): ReactElement {
  const { reveal, outcome } = view;
  if (reveal === null || outcome === null) return <Notice>The reveal is on its way.</Notice>;
  const crew = outcome.winner === "crew";
  const words = outcomeWords(outcome);
  const changelings = view.players.filter((p) => reveal.imposterIds.includes(p.id));
  return (
    <div className="reveal">
      <Frame className={cx("reveal-banner", !crew && "reveal-banner-bare")}>
        {crew ? <CrewEmblem size={96} title="The Crew" /> : null}
        <div>
          <h2 className="reveal-title">{words.title}</h2>
          <p className="reveal-reason">{words.reason}</p>
        </div>
      </Frame>

      <Divider>Unmasked</Divider>
      <section className="reveal-mask-body" aria-label="The Changeling">
        <ChangelingMask size={160} decorative />
        <div>
          {changelings.map((p) => (
            <div key={p.id}>
              <h2 className="reveal-title">{p.name}</h2>
              <p className="reveal-reason">
                was the Changeling{seatsHeld(view, p).length === 0 ? "" : `, seated as ${seatsHeld(view, p).map((s) => SEAT_TITLES[s]).join(" and ")}`}.
                {p.ejected ? " Cast out." : " Never cast out."}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Divider>The record, against the truth</Divider>
      <section className="reveal-seats" aria-label="Every seat, every card">
        {view.players.map((p) => {
          const isChangeling = reveal.imposterIds.includes(p.id);
          const cards = view.cards.filter((c) => c.playerId === p.id).sort((a, b) => a.at - b.at);
          const seats = seatsHeld(view, p);
          return (
            <Frame key={p.id} title={p.name} className="reveal-player">
              <p className="reveal-player-head">
                {isChangeling ? <ChangelingMask size={24} decorative /> : null}
                {seats.map((seat) => (
                  <Badge key={seat} seat={seat} />
                ))}
                <span className={cx("reveal-word", isChangeling ? "reveal-lie" : "reveal-true")}>{isChangeling ? "the Changeling" : "crew"}</span>
                {p.ejected ? <span className="muted">cast out</span> : null}
              </p>
              {seats.length === 0 ? <p className="muted">Held no seat.</p> : null}
              {seats.map((seat) => (
                <SeatTruth key={seat} seat={seat} problem={reveal.problem} cards={cards.filter((c) => c.seat === seat)} />
              ))}
            </Frame>
          );
        })}
      </section>

      <Divider>The final code</Divider>
      <Editor view={view} />

      <Divider>The votes</Divider>
      <VoteHistory view={view} />

      <p className="reveal-again">
        <Link href="/" className="btn btn-primary">
          Play again
        </Link>
      </p>
    </div>
  );
}

/** Seats a player held at any point: their seats now, plus any seat they played a card from (the Herald seat moves on ejection). */
function seatsHeld(view: PlayerView, player: PublicPlayer): Seat[] {
  const truth = view.reveal?.players.find((p) => p.id === player.id)?.seats ?? [];
  const played = view.cards.filter((c) => c.playerId === player.id).map((c) => c.seat);
  return [...new Set([...truth, ...played])];
}

function VoteHistory({ view }: { view: PlayerView }): ReactElement {
  if (view.votes.length === 0) return <p className="muted">No tribunal was called, and the Reckoning never came.</p>;
  const numbered = view.votes.map((round, i) => ({ round, n: view.votes.slice(0, i + 1).filter((r) => r.kind === "freeze").length }));
  return (
    <ol className="reveal-votes">
      {numbered.map(({ round, n }) => {
        const title = round.kind === "final" ? "The Reckoning" : `Tribunal ${String(n)}, called by ${playerName(view, round.calledBy)}`;
        const result =
          round.result === null ? "Never resolved." : round.result.ejectedId === null ? "No one was cast out." : `${playerName(view, round.result.ejectedId)} was cast out.`;
        return (
          <li key={round.startedAt} className="reveal-vote">
            <h3 className="section-title">{title}</h3>
            <p>{result}</p>
            <ul className="reveal-ballots">
              {(round.votes ?? []).map((v) => (
                <li key={v.voterId}>
                  <span>{playerName(view, v.voterId)}</span>
                  <span className="muted">voted</span>
                  <span>{v.targetId === null ? "Skip" : playerName(view, v.targetId)}</span>
                </li>
              ))}
              {round.votes !== null && round.votes.length === 0 ? (
                <li>
                  <span className="muted">No ballots were cast.</span>
                </li>
              ) : null}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
