import type { ReactElement } from "react";
import { Badge } from "@/components/ui";
import type { Card, PlayerView } from "@/game/types";
import { CATEGORY_WORDS, clockTime } from "./copy";
import { playerName } from "./select";

/** The record: every card, in the order it was played. Nothing here animates. */
export function CardsLog({ view }: { view: PlayerView }): ReactElement {
  const cards = [...view.cards].sort((a, b) => a.at - b.at);
  return (
    <section className="log" aria-labelledby="log-title">
      <h2 id="log-title" className="section-title">
        The record
      </h2>
      {cards.length === 0 ? (
        <p className="muted">No cards yet. The record begins with the first one.</p>
      ) : (
        <ol className="log-list">
          {cards.map((entry) => (
            <li key={entry.id} className="log-entry">
              <Badge seat={entry.seat} />
              <span className="log-who">{playerName(view, entry.playerId)}</span>
              <time className="log-at tabular" dateTime={new Date(entry.at).toISOString()}>
                {clockTime(entry.at)}
              </time>
              <div className="log-body">
                <CardBody card={entry.card} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** One card's words. Shared with the reveal. */
export function CardBody({ card }: { card: Card }): ReactElement {
  switch (card.kind) {
    case "tags":
      return (
        <p>
          Declares tags: <span className="log-tags">{card.tags.join(", ")}</span>
        </p>
      );
    case "hint":
      return (
        <p>
          Hint {card.index + 1}: {card.text}
        </p>
      );
    case "bound":
      return <p>Bound: {card.text}</p>;
    case "report":
      return (
        <>
          <p>Rejected: {CATEGORY_WORDS[card.category]}</p>
          <pre className="mono log-pre">{card.failingCase}</pre>
        </>
      );
  }
}
