"use client";
import { useState, type ReactElement } from "react";
import { BallotIcon } from "@/components/art";
import { Button, Frame, Notice, Timer } from "@/components/ui";
import { mmss } from "@/components/ui/clock";
import { useServerNow } from "@/components/ui/useServerNow";
import { cx } from "@/components/ui/cx";
import type { VoteRoundView } from "@/game/types";
import type { BoardProps } from "./BuildingPhase";
import { playerName } from "./select";

/** A freeze or the final vote, in place of the actions. Discussion first, then the ballot opens. */
export function Tribunal({ view, ...rest }: BoardProps): ReactElement {
  const round = view.activeVote;
  if (round === null) return <Notice>The tribunal has decided. Fetching the verdict.</Notice>;
  return <Ballot key={round.startedAt} round={round} view={view} {...rest} />;
}

function Ballot({ round, view, clockOffset, act, busy }: BoardProps & { round: VoteRoundView }): ReactElement {
  const now = useServerNow(clockOffset);
  const stage = now !== null && now >= round.discussionEndsAt ? "vote" : "discussion";
  // Which name is pressed is local; whether a ballot is in comes from the server, so a reload does not forget it.
  const [ballot, setBallot] = useState<string | null | undefined>(undefined);
  const voted = round.votedIds.includes(view.me.id);
  const final = round.kind === "final";
  const canVote = stage === "vote" && !view.me.ejected;
  const cast = async (targetId: string | null): Promise<void> => {
    if (await act({ type: "vote", targetId })) setBallot(targetId);
  };
  const lead = final
    ? `${view.submissionsLeft === 0 ? "Every submission was rejected." : "The candle is out."} One last vote, and no one may skip.`
    : `${playerName(view, round.calledBy)} called a tribunal. Hands off the editor.`;
  const note = view.me.ejected
    ? "You were cast out. You watch; you do not vote."
    : stage === "discussion"
      ? "Ballots open when the discussion ends."
      : voted
        ? "Your ballot is in. You may change it until the vote closes."
        : "Cast your ballot. You may change it until the vote closes.";
  return (
    <Frame title={final ? "The Reckoning" : "Tribunal"} className="tribunal">
      <div className="tribunal-head">
        <BallotIcon size={48} decorative />
        <p className="tribunal-lead">{lead}</p>
      </div>
      <div className="tribunal-clocks">
        <div className={cx("clock", stage === "discussion" && "clock-live clock-big")}>
          <span className="clock-label">Discussion</span>
          <Timer targetAt={round.discussionEndsAt} clockOffset={clockOffset} />
        </div>
        <div className={cx("clock", stage === "vote" && "clock-live clock-big")}>
          <span className="clock-label">Vote</span>
          {stage === "vote" ? (
            <Timer targetAt={round.voteEndsAt} clockOffset={clockOffset} />
          ) : (
            <span className="timer-paused tabular">{mmss(round.voteEndsAt - round.discussionEndsAt)}</span>
          )}
        </div>
      </div>
      <p className="tribunal-note">{note}</p>
      <div className="ballots" role="group" aria-label="Ballot">
        {view.players
          .filter((p) => !p.ejected)
          .map((p) => (
            <Button
              key={p.id}
              variant={ballot === p.id ? "primary" : "secondary"}
              aria-pressed={ballot === p.id}
              disabled={!canVote}
              loading={busy}
              onClick={() => {
                void cast(p.id);
              }}
            >
              {p.id === view.me.id ? `${p.name} (you)` : p.name}
            </Button>
          ))}
        {final ? null : (
          <Button
            variant={ballot === null ? "primary" : "secondary"}
            aria-pressed={ballot === null}
            disabled={!canVote}
            loading={busy}
            onClick={() => {
              void cast(null);
            }}
          >
            Skip
          </Button>
        )}
      </div>
      <p className="tribunal-voted">
        <span className="clock-label">Voted</span>
        {round.votedIds.length === 0 ? <span className="muted">no one yet</span> : <span>{round.votedIds.map((id) => playerName(view, id)).join(", ")}</span>}
      </p>
    </Frame>
  );
}
