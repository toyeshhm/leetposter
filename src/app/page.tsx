import Link from "next/link";
import type { ReactElement } from "react";
import {
  AcceptedMark,
  BallotIcon,
  ChangelingMask,
  FreezeBell,
  HeroPlate,
  HourglassIcon,
  RejectedSeal,
  SeatSigil,
  SEAT_TITLES,
  type ArtProps,
} from "@/components/art";
import { CardBody } from "@/components/game/CardsLog";
import { duration } from "@/components/game/copy";
import { SeatTruth } from "@/components/game/RevealSeat";
import { Entry } from "@/components/lobby/Entry";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { CandleMark } from "@/components/store/CandleMark";
import { Badge, Divider, Frame } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { DEFAULT_SETTINGS, type Seat } from "@/game/types";
import { problemIndex, type ProblemSummary } from "@/server/problems";
import { ROUND_BALLOTS, ROUND_CARDS, ROUND_PROBLEM, ROUND_RATING, ROUND_SEATS, roundPlayer, TAGGER_CARDS } from "./round";
import styles from "./page.module.css";
import "@/components/game/game.css";
import "@/components/game/build.css";
import "@/components/game/reveal.css";
import "@/components/leaderboard/leaderboard.css";

/** A card's place in the round, as minutes and seconds into the build. Never a wall clock. */
function elapsed(ms: number): string {
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  return `${String(minutes).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** The night, step by step. Every timing is read off DEFAULT_SETTINGS, so none of them can go stale. */
const NIGHT: {
  Art: ((props: ArtProps) => ReactElement) | null;
  step: string;
  time: string;
  what: string;
}[] = [
  {
    Art: HourglassIcon,
    step: "The reading",
    time: duration(DEFAULT_SETTINGS.readMs),
    what: "Everyone reads the statement alone and opens their own panel. Nobody speaks.",
  },
  {
    Art: null,
    step: "The work",
    time: duration(DEFAULT_SETTINGS.buildMs),
    what: "One shared file with live carets and a language picker. Python and JavaScript run in the browser on your own machine. Every card played goes on the record as it is played.",
  },
  {
    Art: FreezeBell,
    step: "The tribunal",
    time: `${duration(DEFAULT_SETTINGS.freezeDiscussionMs)}, then ${duration(DEFAULT_SETTINGS.freezeVoteMs)}`,
    what: "Anyone may ring the bell, once, after the first three minutes and until ninety seconds are left. Hands off the keyboard. Ninety seconds of argument, fifteen to vote. Eject the Changeling and the crew win. Eject a crewmate and they go quiet for the rest of the night.",
  },
  {
    Art: AcceptedMark,
    step: "The judge",
    time: `${String(DEFAULT_SETTINGS.maxSubmissions)} attempts`,
    what: "Only the Herald submits. Accepted ends the night and the crew win. The fourth rejection closes the door and starts the last vote.",
  },
  {
    Art: BallotIcon,
    step: "The reckoning",
    time: `${duration(DEFAULT_SETTINGS.finalDiscussionMs)}, then ${duration(DEFAULT_SETTINGS.finalVoteMs)}`,
    what: "When the candle is out there is one last vote, with no skip. A tie counts for the Changeling.",
  },
  {
    Art: ChangelingMask,
    step: "The unmasking",
    time: "last",
    what: "Every card laid next to the truth, every vote in order, the final file, and the Changeling named.",
  },
];

/** What one seat is holding, straight off the printed round's problem. */
function SeatPanel({ seat }: { seat: Seat }): ReactElement {
  switch (seat) {
    case "tagger":
      return (
        <ul className="panel-tags">
          {ROUND_PROBLEM.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      );
    case "bounds":
      return <pre className="mono panel-pre">{ROUND_PROBLEM.constraints}</pre>;
    case "oracle": {
      const [first, ...rest] = ROUND_PROBLEM.hints;
      return (
        <>
          <ol className="panel-hints">
            <li>{first}</li>
          </ol>
          <details className={styles.hintsMore}>
            <summary>{String(rest.length)} more hints, in order</summary>
            <ol className="panel-hints" start={2}>
              {rest.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ol>
          </details>
        </>
      );
    }
    case "runner":
      return (
        <p className="panel-link">
          <Link href={ROUND_PROBLEM.url}>{ROUND_PROBLEM.title}</Link>
        </p>
      );
  }
}

export default function Home(): ReactElement {
  const bank = problemIndex({});
  const ratings = bank.map((p) => p.rating);
  // Lowest, median and highest, picked by position so the three rows follow the bank rather than a list of titles.
  const picks: ProblemSummary[] = [bank[0], bank[Math.floor((bank.length - 1) / 2)], bank[bank.length - 1]].filter(
    (p): p is ProblemSummary => p !== undefined,
  );

  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="wordmark">
          <div className={styles.plate}>
            <HeroPlate />
          </div>
          <h1 id="wordmark" className={styles.wordmark}>
            Leetposter
          </h1>
          <p className={styles.lede}>Four to eight programmers, one hard problem, forty minutes, and one of you is lying.</p>
          <p className={styles.heroNote}>Free, in the browser. Nothing to install, and no account needed to take a seat.</p>
        </section>

        <section id="enter" aria-label="Enter a hall">
          <Entry />
          <p className={styles.entryNote}>A hall code is five letters. Anyone holding it can take a seat or watch.</p>
        </section>

        <Divider>One round, printed</Divider>

        <p className="prose">
          Nobody played this round. It is one problem out of the bank, dealt and set the way a hall would have it, so you can see what forty minutes looks like
          before you spend them. The problem is real and you can read every word of it. The names are the hall&apos;s own.
        </p>

        <section className={styles.band} aria-labelledby="deal">
          <h2 id="deal" className={styles.bandName}>
            The deal
          </h2>
          <p className="prose">
            Everyone gets the statement. This one is {ROUND_PROBLEM.title}, rated {ROUND_RATING}. A chain of n halls has been lost and all that survives is a
            strip of marks reading &lt;, &gt; or ?, one for each step. Count the orderings that agree with every mark still legible. On top of that statement,
            each seat holds one channel nobody else can see.
          </p>
          <div className={styles.dealPanels}>
            {ROUND_SEATS.map((row) => (
              <Frame key={row.id} title={`${SEAT_TITLES[row.seat]}: ${row.player}`}>
                <div className={styles.panelHead}>
                  <SeatSigil seat={row.seat} size={48} decorative />
                </div>
                <SeatPanel seat={row.seat} />
                <p className={styles.caption}>{row.note}</p>
              </Frame>
            ))}
          </div>
          <div className="changeling-note">
            <ChangelingMask size={48} decorative />
            <p>One of the five is the Changeling. They see their own panel and nothing else, and they may lie about all of it.</p>
          </div>
        </section>

        <section className={styles.band} aria-labelledby="night">
          <h2 id="night" className={styles.bandName}>
            Forty minutes, and a candle
          </h2>
          <table className={cx("board", styles.night)}>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Mark</span>
                </th>
                <th scope="col">Step</th>
                <th scope="col" className="board-num">
                  Runs for
                </th>
                <th scope="col">What happens</th>
              </tr>
            </thead>
            <tbody>
              {NIGHT.map(({ Art, step, time, what }) => (
                <tr key={step}>
                  <td className={styles.nightGlyph}>{Art === null ? null : <Art size={28} decorative />}</td>
                  <th scope="row" className={styles.nightStep}>
                    {step}
                  </th>
                  <td className="board-num">{time}</td>
                  <td className={styles.nightWhat}>{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.band} aria-labelledby="record">
          <h2 id="record" className={styles.bandName}>
            The record
          </h2>
          <p className="prose">
            Every card played goes down in the order it was played, with the seat it came from and how far into the round it landed. Voice is free. Speculate,
            hedge, be wrong. The record is not free.
          </p>
          <ol className="log-list">
            {ROUND_CARDS.map((entry) => (
              <li key={entry.id} className="log-entry">
                <Badge seat={entry.seat} />
                <span className="log-who">{roundPlayer(entry.playerId)}</span>
                <span className={cx("log-at", "tabular")}>{elapsed(entry.at)}</span>
                <div className="log-body">
                  <CardBody card={entry.card} />
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.band} aria-labelledby="bell">
          <div className={styles.bellHead}>
            <FreezeBell size={64} decorative />
            <h2 id="bell" className={styles.bandName}>
              The bell
            </h2>
          </div>
          <p className="prose">
            Someone rings it at minute twenty-seven. The editor locks and hands come off the keyboard. Ninety seconds of argument, fifteen to vote. A plurality
            strictly above every other option, Skip included, casts a player out. A tie goes to Skip.
          </p>
          <ul className="reveal-ballots">
            {ROUND_BALLOTS.map((vote) => (
              <li key={vote.voterId}>
                <span>{roundPlayer(vote.voterId)}</span>
                <span className="muted">voted</span>
                <span>{vote.targetId === null ? "Skip" : roundPlayer(vote.targetId)}</span>
              </li>
            ))}
          </ul>
          <p className={styles.result}>
            <BallotIcon size={24} decorative />
            No one was cast out. Two for Cass, one for Dov, two for Skip, and nothing stood above everything else.
          </p>
        </section>

        <section className={styles.band} aria-labelledby="unmasking">
          <h2 id="unmasking" className={styles.bandName}>
            The unmasking
          </h2>
          <p className="prose">The round ends and every card is laid next to the truth it was meant to carry.</p>
          <Frame title="Cass">
            <div className={styles.panelHead}>
              <ChangelingMask size={24} title="The Changeling" />
            </div>
            <SeatTruth seat="tagger" problem={ROUND_PROBLEM} cards={TAGGER_CARDS} />
          </Frame>
          <Frame className="reveal-banner reveal-banner-bare">
            <div>
              <p className="reveal-title">The Changeling wins.</p>
              <p className="reveal-reason muted">The candle burned out with nothing accepted, and the Reckoning tied.</p>
            </div>
          </Frame>
          <p>Prefix sums were the whole answer. The table spent thirty minutes not looking for them.</p>
        </section>

        <section className={styles.band} aria-labelledby="bank">
          <h2 id="bank" className={styles.bandName}>
            The Judge and the bank
          </h2>
          <div className={styles.verdicts}>
            <span className={cx(styles.verdict, styles.accepted)}>
              <AcceptedMark size={96} decorative />
              <span className={styles.verdictWord}>Accepted</span>
            </span>
            <span className={styles.verdict}>
              <RejectedSeal size={96} decorative />
              <span className={styles.verdictWord}>Rejected</span>
            </span>
          </div>
          <p className="prose">
            The Herald sends the crew&apos;s file and the Judge answers Accepted or Rejected with a category. It does not explain. Four attempts, and the fourth
            rejection starts the last vote. The verdict is the one thing the Changeling cannot fake.
          </p>
          <p className="prose">
            {bank.length} problems written for this hall, rated {Math.min(...ratings)} to {Math.max(...ratings)}. None of them are borrowed. Each one carries its
            own tags, its hints in order, its constraints and its tests, which is what makes the four seats work at all.
          </p>
          <table className="board">
            <thead>
              <tr>
                <th scope="col">Problem</th>
                <th scope="col" className="board-num">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody>
              {picks.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/problems/${p.id}`}>{p.title}</Link>
                  </td>
                  <td className="board-num">{p.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <Link href="/problems">Read the bank</Link>
          </p>
        </section>

        <Divider />

        <section className={cx(styles.truth, "prose")} aria-labelledby="truth">
          <h2 id="truth">The truth rule</h2>
          <p>
            Cards are the record, and at the unmasking every card is laid next to the truth. The crew fill every card truthfully. Voice is free for everyone:
            speculate, hedge, be wrong. That is the honest players&apos; cover.
          </p>
          <p>
            The Changeling holds a seat like anyone else, sees only that seat&apos;s panel, and may lie on any card and in any sentence. The one thing never
            faked is the verdict.
          </p>
        </section>

        <section className={styles.sit} aria-labelledby="sit">
          <CandleMark size={32} decorative />
          <h2 id="sit" className={styles.bandName}>
            Four is a game
          </h2>
          <p className={styles.sitProse}>
            Three of you is a study group. Four is a game. Eight is a hall that will not shut up for forty minutes. Bring the voice call. The app holds the
            record so nobody has to remember who said what.
          </p>
          <Link href="#enter" className="btn btn-secondary">
            Open a hall
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
