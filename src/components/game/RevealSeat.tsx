import type { ReactElement } from "react";
import { SEAT_TITLES } from "@/components/art";
import { cx } from "@/components/ui/cx";
import type { Card, CardEntry, Problem, Seat } from "@/game/types";
import { CardBody } from "./CardsLog";
import { norm } from "./copy";

interface SeatTruthProps {
  seat: Seat;
  problem: Problem;
  cards: CardEntry[];
}

/** One seat's true panel beside the cards played from it, each card judged against the truth. */
export function SeatTruth({ seat, problem, cards }: SeatTruthProps): ReactElement {
  return (
    <div className="reveal-seat">
      <div className="reveal-truth">
        <h3 className="section-title">What the {SEAT_TITLES[seat]} knew</h3>
        <Truth seat={seat} problem={problem} />
      </div>
      <div className="reveal-record">
        <h3 className="section-title">What they played</h3>
        {cards.length === 0 ? (
          <p className="muted">No cards.</p>
        ) : (
          <ol className="reveal-cards">
            {cards.map((entry) => (
              <li key={entry.id}>
                <CardVerdict card={entry.card} problem={problem} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Truth({ seat, problem }: { seat: Seat; problem: Problem }): ReactElement {
  switch (seat) {
    case "tagger":
      return (
        <ul className="panel-tags" aria-label="True tags">
          {problem.tags.map((tag, i) => (
            <li key={`${String(i)}-${tag}`}>{tag}</li>
          ))}
        </ul>
      );
    case "oracle":
      return (
        <ol className="panel-hints" aria-label="True hints">
          {problem.hints.map((hint, i) => (
            <li key={`${String(i)}-${hint}`}>{hint}</li>
          ))}
        </ol>
      );
    case "bounds":
      return <pre className="mono panel-pre">{problem.constraints}</pre>;
    case "runner":
      return (
        <>
          <p className="panel-link">
            <a href={problem.url} target="_blank" rel="noreferrer">
              {problem.title}
            </a>
          </p>
          <p className="muted">Verdicts are never faked. Reports can be.</p>
        </>
      );
  }
}

function Mark({ ok, yes, no }: { ok: boolean; yes: string; no: string }): ReactElement {
  return <span className={cx("reveal-word", ok ? "reveal-true" : "reveal-lie")}>{ok ? yes : no}</span>;
}

/** A card with the verdict on it: true or false, as written or altered, found or not found. */
function CardVerdict({ card, problem }: { card: Card; problem: Problem }): ReactElement {
  switch (card.kind) {
    case "tags": {
      const truth = problem.tags.map(norm);
      const missed = problem.tags.filter((t) => !card.tags.some((d) => norm(d) === norm(t)));
      return (
        <>
          <p className="reveal-tags">
            <span>Declared</span>
            {card.tags.map((tag, i) => {
              const ok = truth.includes(norm(tag));
              return (
                <span key={`${String(i)}-${tag}`} className={cx("reveal-tag", ok ? "reveal-true" : "reveal-lie")}>
                  {tag}
                  <Mark ok={ok} yes="true" no="false" />
                </span>
              );
            })}
          </p>
          {missed.length > 0 ? <p className="muted">Left out: {missed.join(", ")}</p> : null}
        </>
      );
    }
    case "hint": {
      const truth = problem.hints[card.index];
      const ok = truth !== undefined && norm(truth) === norm(card.text);
      return (
        <>
          <p>
            Hint {card.index + 1}: {card.text} <Mark ok={ok} yes="as written" no="altered" />
          </p>
          {ok ? null : <p className="muted">The hint reads: {truth ?? "nothing; there is no such hint"}</p>}
        </>
      );
    }
    case "bound": {
      const ok = norm(problem.constraints).includes(norm(card.text));
      return (
        <p>
          Bound: {card.text} <Mark ok={ok} yes="in the constraints" no="not in the constraints" />
        </p>
      );
    }
    case "report":
      return <CardBody card={card} />;
  }
}
