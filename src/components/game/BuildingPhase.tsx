import type { ReactElement } from "react";
import { AcceptedMark, RejectedSeal } from "@/components/art";
import { Editor } from "@/components/editor/Editor";
import { Notice, Timer } from "@/components/ui";
import { mmss } from "@/components/ui/clock";
import { cx } from "@/components/ui/cx";
import type { Action, PlayerView, Seat } from "@/game/types";
import { CardsLog } from "./CardsLog";
import { ProblemText } from "./ProblemText";
import { Roster } from "./Roster";
import { ChangelingNote, SeatPanel } from "./SeatPanel";
import { FreezeButton, SeatAction } from "./SeatActions";
import { holdersOf, playerName, recentResult, visibleSeats } from "./select";
import { Tribunal } from "./Tribunal";
import "./build.css";

/** What every board under the Work needs: the view, the clock offset, and a way to act. */
export interface BoardProps {
  view: PlayerView;
  clockOffset: number;
  act: (action: Action) => Promise<boolean>;
  busy: boolean;
}

/** The Work, and the tribunals that interrupt it. Three columns on a desk, one on a phone (the ballot first, then the file). */
export function BuildingPhase({ view, clockOffset, act, busy }: BoardProps): ReactElement {
  const inVote = view.phase !== "building";
  return (
    <>
      {view.me.ejected ? <Notice>You were cast out. You can watch the table, not act at it.</Notice> : null}
      <div className={cx("build-grid", inVote && "build-vote")}>
        <aside className="build-side" aria-label="Clock and table">
          <BuildClock view={view} clockOffset={clockOffset} />
          <Submissions view={view} />
          <Roster view={view} />
        </aside>
        <section className="build-main" aria-label="Your seat and the record">
          <LastVerdict view={view} />
          {inVote ? <Tribunal view={view} clockOffset={clockOffset} act={act} busy={busy} /> : null}
          <Editor view={view} />
          {inVote ? null : <Actions view={view} act={act} busy={busy} />}
          <CardsLog view={view} />
        </section>
        <section className="build-problem">
          <ProblemText problem={view.problem} />
        </section>
      </div>
    </>
  );
}

function Actions({ view, act, busy }: Omit<BoardProps, "clockOffset">): ReactElement {
  const others = visibleSeats(view).filter((seat) => !view.me.seats.includes(seat));
  const panel = (seat: Seat): ReactElement => {
    const held = view.me.seats.includes(seat);
    return (
      <SeatPanel key={seat} seat={seat} panel={view.panel} held={held} holders={holdersOf(view, seat)}>
        {held ? <SeatAction seat={seat} view={view} act={act} busy={busy} /> : null}
      </SeatPanel>
    );
  };
  return (
    <>
      {view.me.isImposter ? <ChangelingNote size={40} /> : null}
      {view.me.seats.map((seat) => panel(seat))}
      <FreezeButton view={view} act={act} busy={busy} />
      {others.length === 0 ? null : (
        // The Changeling sees every panel; folded, so the record they must keep straight stays in reach.
        <details className="panels-more">
          <summary>{others.length === 1 ? "The other panel" : `The other ${others.length === 2 ? "two" : "three"} panels`}</summary>
          {others.map((seat) => panel(seat))}
        </details>
      )}
    </>
  );
}

function BuildClock({ view, clockOffset }: { view: PlayerView; clockOffset: number }): ReactElement {
  const { phaseEndsAt, buildRemainingMs } = view.clock;
  const running = view.phase === "building" && phaseEndsAt !== null;
  const label = view.phase === "finalVote" ? "The Work is over" : running ? "The Work ends in" : "The Work, paused";
  return (
    <div className={cx("clock", running && "clock-big")}>
      <span className="clock-label">{label}</span>
      {running ? <Timer targetAt={phaseEndsAt} clockOffset={clockOffset} /> : <span className="timer-paused tabular">{mmss(buildRemainingMs)}</span>}
      {view.phase === "freeze" ? <span className="muted">Hands off the editor until the vote is in.</span> : null}
      {view.phase === "finalVote" ? <span className="muted">{view.submissionsLeft === 0 ? "Every submission was rejected." : "The candle is out."}</span> : null}
    </div>
  );
}

function Submissions({ view }: { view: PlayerView }): ReactElement {
  const max = view.settings.maxSubmissions;
  return (
    <div className="subs">
      <span className="clock-label">Submissions</span>
      <div className="subs-row">
        <span className="subs-count tabular">
          {view.submissions.length} of {max}
        </span>
        <span className="subs-marks">
          {view.submissions.map((s) =>
            s.verdict === "accepted" ? (
              <span key={s.n} className="verdict-accepted">
                <AcceptedMark size={24} title={`Submission ${String(s.n)}: accepted`} />
              </span>
            ) : (
              <span key={s.n} className="verdict-rejected">
                <RejectedSeal size={24} title={`Submission ${String(s.n)}: rejected`} />
              </span>
            ),
          )}
          {Array.from({ length: Math.max(0, max - view.submissions.length) }, (_, i) => (
            <span key={`left-${String(i)}`} className="subs-empty" aria-hidden="true" />
          ))}
        </span>
      </div>
    </div>
  );
}

/** The last tribunal's result, shown for half a minute after it resolves. */
function LastVerdict({ view }: { view: PlayerView }): ReactElement | null {
  const round = recentResult(view, 30_000);
  if (round === null) return null;
  const { result } = round;
  if (result === null) return null;
  const who = round.kind === "final" ? "The Reckoning" : "The tribunal";
  return <Notice>{result.ejectedId === null ? `${who} cast out no one.` : `${who} cast out ${playerName(view, result.ejectedId)}.`}</Notice>;
}
