"use client";
import Link from "next/link";
import { useEffect, useState, type ReactElement } from "react";
import { ApiError, call, errorMessage } from "@/client/api";
import { AcceptedMark, ChangelingMask, CrewEmblem, RejectedSeal, SEAT_TITLES } from "@/components/art";
import { CardBody } from "@/components/game/CardsLog";
import { PHASE_NAMES, outcomeWords } from "@/components/game/copy";
import { ProblemText } from "@/components/game/ProblemText";
import { SeatTruth } from "@/components/game/RevealSeat";
import { Badge, Divider, Frame, Notice, Timer } from "@/components/ui";
import { mmss } from "@/components/ui/clock";
import { cx } from "@/components/ui/cx";
import { SEATS } from "@/game/types";
import type { SpectatorView } from "@/game/types";
import { WatchPanel } from "./WatchPanel";
import { WatchVotes } from "./WatchVotes";
import "@/components/game/game.css";
import "@/components/game/build.css";
import "@/components/game/reveal.css";
import "./spectate.css";

export const WATCH_POLL_MS = 2000;

type Loaded = { view: SpectatorView; clockOffset: number } | { gone: string } | null;

/** /room/[code]/watch: every seat at once, no hand to play. Polls the spectate route every two seconds. */
export function WatchScreen({ code }: { code: string }): ReactElement {
  const [loaded, setLoaded] = useState<Loaded>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async (): Promise<void> => {
      try {
        const view = await call<SpectatorView>(`/api/rooms/${encodeURIComponent(code)}/spectate`, { method: "GET" });
        if (!live) return;
        setLoaded({ view, clockOffset: view.clock.serverNow - Date.now() });
        setError(null);
      } catch (e: unknown) {
        if (!live) return;
        // An unknown hall is not a hiccup: stop polling and say so.
        if (e instanceof ApiError && e.code === "not-found") {
          setLoaded({ gone: e.message });
          return;
        }
        setError(errorMessage(e));
      }
      timer = setTimeout(() => void poll(), WATCH_POLL_MS);
    };
    void poll();
    return () => {
      live = false;
      if (timer !== null) clearTimeout(timer);
    };
  }, [code]);

  if (loaded === null) {
    return (
      <main className="room">
        <p className="muted">{error ?? "Finding the hall."}</p>
      </main>
    );
  }
  if ("gone" in loaded) {
    return (
      <main className="room watch-gone">
        <Notice kind="error">{loaded.gone}</Notice>
        <Link href="/halls">See the halls board</Link>
      </main>
    );
  }
  const { view, clockOffset } = loaded;
  return (
    <main className="room">
      <header className="room-head">
        <h1 className="room-phase">{PHASE_NAMES[view.phase]}</h1>
        <p className="room-hall">
          <span className="room-hall-label">Hall</span>
          <span className="room-code">{view.code}</span>
        </p>
        <p className="room-me">
          <span className="room-name">Watching</span>
          <span className="muted">every seat, no hand to play</span>
        </p>
        <Link href="/halls" className="room-leave">
          All halls
        </Link>
      </header>
      {error === null ? null : <Notice kind="error">{error}</Notice>}
      {view.phase === "lobby" ? (
        <Notice>
          The hall is still gathering. <Link href={`/room/${view.code}`}>Take a seat</Link> while the door is open, or stay and watch.
        </Notice>
      ) : null}
      {view.phase === "reveal" ? <Unmasking view={view} /> : null}
      <div className="watch-grid">
        <section className="watch-main" aria-label="The statement, the seats and the record">
          <ProblemText problem={view.problem} />
          <div className="watch-panels">
            {SEATS.map((seat) => (
              <WatchPanel key={seat} seat={seat} view={view} />
            ))}
          </div>
          <Record view={view} />
        </section>
        <aside className="watch-side" aria-label="Clock and table">
          <Clock view={view} clockOffset={clockOffset} />
          <Submissions view={view} />
          <Roster view={view} />
          <WatchVotes view={view} clockOffset={clockOffset} />
        </aside>
      </div>
      {view.phase === "reveal" && view.reveal !== null ? <Truth view={view} /> : null}
    </main>
  );
}

function Clock({ view, clockOffset }: { view: SpectatorView; clockOffset: number }): ReactElement {
  const { phaseEndsAt, buildRemainingMs } = view.clock;
  const running = (view.phase === "reading" || view.phase === "building") && phaseEndsAt !== null;
  let label: string;
  switch (view.phase) {
    case "lobby":
      label = "Not yet begun";
      break;
    case "reading":
      label = "The Reading ends in";
      break;
    case "building":
      label = "The Work ends in";
      break;
    case "freeze":
      label = "The Work, paused";
      break;
    case "finalVote":
    case "reveal":
      label = "The Work is over";
      break;
  }
  return (
    <div className={cx("clock", running && "clock-big")}>
      <span className="clock-label">{label}</span>
      {running ? <Timer targetAt={phaseEndsAt} clockOffset={clockOffset} /> : <span className="timer-paused tabular">{mmss(buildRemainingMs)}</span>}
    </div>
  );
}

function Submissions({ view }: { view: SpectatorView }): ReactElement {
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

function Roster({ view }: { view: SpectatorView }): ReactElement {
  const voted = new Set(view.activeVote?.votedIds ?? []);
  return (
    <section className="roster" aria-labelledby="watch-roster-title">
      <h2 id="watch-roster-title" className="section-title">
        At the table
      </h2>
      <ul className="roster-list">
        {view.players.map((p) => (
          <li key={p.id} className="roster-row" data-ejected={p.ejected}>
            <span className="roster-name">{p.name}</span>
            {p.username === null ? null : <span className="roster-note">as @{p.username}</span>}
            {p.isHost ? <span className="roster-note">host</span> : null}
            {p.seats.map((seat) => (
              <Badge key={seat} seat={seat} />
            ))}
            {p.isImposter === true ? <span className="roster-word">Changeling</span> : null}
            {p.ejected ? <span className="roster-note">cast out</span> : null}
            {!p.ejected && p.freezeUsed ? <span className="roster-note">bell rung</span> : null}
            {voted.has(p.id) ? <span className="roster-note">voted</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Record({ view }: { view: SpectatorView }): ReactElement {
  const cards = [...view.cards].sort((a, b) => a.at - b.at);
  const name = (id: string): string => view.players.find((p) => p.id === id)?.name ?? "someone";
  return (
    <section className="log" aria-labelledby="watch-log-title">
      <h2 id="watch-log-title" className="section-title">
        The record
      </h2>
      {cards.length === 0 ? (
        <p className="muted">No cards yet. The record begins with the first one.</p>
      ) : (
        <ol className="log-list">
          {cards.map((entry) => (
            <li key={entry.id} className="log-entry">
              <Badge seat={entry.seat} />
              <span className="log-who">{name(entry.playerId)}</span>
              <time className="log-at tabular" dateTime={new Date(entry.at).toISOString()}>
                {new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
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

/** The outcome and the Changeling, named. Only rendered at the reveal. */
function Unmasking({ view }: { view: SpectatorView }): ReactElement | null {
  const { outcome, reveal } = view;
  if (outcome === null || reveal === null) return null;
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
      <section className="reveal-mask-body" aria-label="The Changeling">
        <ChangelingMask size={120} decorative />
        <div>
          {changelings.map((p) => {
            const seats = reveal.players.find((r) => r.id === p.id)?.seats ?? [];
            return (
              <div key={p.id}>
                <h2 className="reveal-title">{p.name}</h2>
                <p className="reveal-reason">
                  was the Changeling{seats.length === 0 ? "" : `, seated as ${seats.map((s) => SEAT_TITLES[s]).join(" and ")}`}.{p.ejected ? " Cast out." : " Never cast out."}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** Every seat's cards against the truth, as the players see it. */
function Truth({ view }: { view: SpectatorView }): ReactElement | null {
  const { reveal } = view;
  if (reveal === null) return null;
  return (
    <>
      <Divider>The record, against the truth</Divider>
      <section className="reveal-seats" aria-label="Every seat, every card">
        {view.players.map((p) => {
          const seats = reveal.players.find((r) => r.id === p.id)?.seats ?? [];
          const cards = view.cards.filter((c) => c.playerId === p.id).sort((a, b) => a.at - b.at);
          const played = [...new Set([...seats, ...cards.map((c) => c.seat)])];
          return (
            <Frame key={p.id} title={p.name} className="reveal-player">
              <p className="reveal-player-head">
                {p.isImposter === true ? <ChangelingMask size={24} decorative /> : null}
                {played.map((seat) => (
                  <Badge key={seat} seat={seat} />
                ))}
                <span className={cx("reveal-word", p.isImposter === true ? "reveal-lie" : "reveal-true")}>{p.isImposter === true ? "the Changeling" : "crew"}</span>
                {p.ejected ? <span className="muted">cast out</span> : null}
              </p>
              {played.length === 0 ? <p className="muted">Held no seat.</p> : null}
              {played.map((seat) => (
                <SeatTruth key={seat} seat={seat} problem={reveal.problem} cards={cards.filter((c) => c.seat === seat)} />
              ))}
            </Frame>
          );
        })}
      </section>
    </>
  );
}
