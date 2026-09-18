import type { Metadata } from "next";
import Link from "next/link";
import { Fragment, type ReactElement } from "react";
import { AcceptedMark, BallotIcon, ChangelingMask, CrewEmblem, FreezeBell, RejectedSeal, SEAT_TITLES, SeatSigil } from "@/components/art";
import { CATEGORY_WORDS, PHASE_NAMES, duration } from "@/components/game/copy";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Divider } from "@/components/ui";
import { DEFAULT_SETTINGS, REPORT_CATEGORIES, SEATS } from "@/game/types";
import type { Seat } from "@/game/types";
import { achievements } from "@/server/achievements";
import "@/components/leaderboard/leaderboard.css";
import "./rules.css";

export const metadata: Metadata = {
  title: "How to play",
  description: "The whole game: the four seats, the Changeling, the record, the clock, the two votes, the judge and how a hall is won.",
};

/** What each seat is handed, and what it is allowed to put on the record. Straight off the reducer. */
const SEAT_ROWS: Record<Seat, { sees: string; plays: string }> = {
  tagger: { sees: "the topic tags", plays: "one Declare tags card" },
  oracle: { sees: "the hints, in order", plays: "Reveal hint cards, in order" },
  bounds: { sees: "the constraints block", plays: "Declare bound cards, any number" },
  runner: { sees: "the title and the link", plays: "Submit, plus a report card on a rejection" },
};

/** The six phases, their timings and what happens in each. Times come from the defaults, never retyped. */
const NIGHT: { name: string; when: string | null; text: string }[] = [
  {
    name: PHASE_NAMES.lobby,
    when: null,
    text: "The host puts the problem in, by pasting a whole page or by typing a title, a number or a link and letting the app fetch it. Starting the hall deals the seats and picks the Changeling, both in secret.",
  },
  {
    name: PHASE_NAMES.reading,
    when: duration(DEFAULT_SETTINGS.readMs),
    text: "Everyone reads the statement alone and opens their own panel. Nobody plays anything yet. When the reading runs out the hall rolls into the work on its own.",
  },
  {
    name: PHASE_NAMES.building,
    when: duration(DEFAULT_SETTINGS.buildMs),
    text: "One shared file with live carets and a language picker, and the argument on the call. Cards and submissions go on the record as they happen. This clock stops while a Tribunal is running and starts again when the Tribunal ends.",
  },
  {
    name: PHASE_NAMES.freeze,
    when: `${duration(DEFAULT_SETTINGS.freezeDiscussionMs)}, then ${duration(DEFAULT_SETTINGS.freezeVoteMs)}`,
    text: "Anyone can ring the bell, once each. The editor locks and the table votes on who to cast out. A Tribunal can happen more than once a night, or not at all.",
  },
  {
    name: PHASE_NAMES.finalVote,
    when: `${duration(DEFAULT_SETTINGS.finalDiscussionMs)}, then ${duration(DEFAULT_SETTINGS.finalVoteMs)}`,
    text: "The last vote, forced. It starts when the work clock reaches zero, or the moment the last attempt comes back rejected.",
  },
  {
    name: PHASE_NAMES.reveal,
    when: null,
    text: "The Changeling is named. The final file is there, read only, and every seat's true panel sits beside every card played from it, with the ballots underneath.",
  },
];

/** Names and descriptions come from the rules that award them, so a mark on this page cannot be wrong. */
const MARKS = achievements([]);

/**
 * How to play, in full. A stranger should be able to read this page and sit a hall. Every number,
 * seat name, phase name, verdict category and mark is imported from the code that enforces it, so
 * the page cannot drift from the game the way a hand-typed rules document does.
 */
export default function RulesPage(): ReactElement {
  return (
    <>
      <SiteHeader />
      <main className="rules">
        <section>
          <h1>How to play</h1>
          <p className="rules-lede">
            Four to eight programmers, one hard problem, forty minutes, and one of you is lying. This is the whole game. Nothing is held back for
            later.
          </p>
        </section>

        <section>
          <h2>The hall</h2>
          <p>
            A hall is a group on a voice call with one algorithm problem in front of them. The app deals the seats, keeps the clock, records every card
            and every ballot, and at the end lays the record next to the truth. The game happens on the call. The app is the table the record sits on.
          </p>
          <p>
            Everyone reads the same statement, examples included. On top of it, each seat holds one channel of information that nobody else can see.
            Exactly one player is the Changeling.
          </p>
          <p>
            Fewer than four people can open a hall, which is useful for trying the app out. The four seats go round the table instead: three players
            hold two, one and one, and a host alone holds all four. It stops being a game at that size, because there is nobody left to disagree with.
          </p>
        </section>

        <section>
          <h2>The seats</h2>
          <p>
            Seats are dealt in secret when the host starts, and from then on they are public: everyone can see who holds what. What stays private is
            what is written on each panel, and which of you is the Changeling.
          </p>
          <table className="board">
            <thead>
              <tr>
                <th scope="col">Seat</th>
                <th scope="col">Sees</th>
                <th scope="col">Plays</th>
              </tr>
            </thead>
            <tbody>
              {SEATS.map((seat) => (
                <tr key={seat}>
                  <th scope="row">
                    <span className="rules-seat">
                      <SeatSigil seat={seat} size={24} decorative />
                      {SEAT_TITLES[seat]}
                    </span>
                  </th>
                  <td>{SEAT_ROWS[seat].sees}</td>
                  <td>{SEAT_ROWS[seat].plays}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            The Cartographer declares tags once, and must declare exactly as many as the problem carries. That count is public, so a Cartographer
            cannot quietly drop one. They can only name the wrong ones.
          </p>
          <p>
            The Oracle gives up hints in order, one at a time, and no further than the problem has hints. A hint card carries whatever the Oracle
            typed. The box arrives prefilled with the true hint, and nothing compares the two until the unmasking.
          </p>
          <p>
            The Warden declares bounds, as many as the crew asks for, in whatever words they like. A bound is free text and is never checked, before
            or after. So is a report card. Only tags and hints are marked against the truth at the end.
          </p>
          <p>
            The Herald holds the title and the link, and is the only player who may submit. A rejection is not only a verdict: it comes with a report
            card naming the error and the failing case, and that card goes on the record like any other.
          </p>
          <p>
            Above four players the deal grows, and it grows in a fixed order: a fifth seat is a second Oracle, a sixth a second Cartographer, a seventh
            a second Warden, an eighth a third Oracle. Every seat is shuffled before it is handed out, so the fifth person through the door is not the
            one who gets the second Oracle. Two holders of one seat who disagree have told the crew that one of them is lying.
          </p>
          <p>
            Each holder of a doubled seat keeps their own place in the order. Two Oracles both start at the first hint, so two hint cards can carry the
            same number and different words. That is the point of a second Oracle.
          </p>
        </section>

        <section>
          <h2 className="rules-head">
            <ChangelingMask size={40} decorative />
            The Changeling
          </h2>
          <p>
            One player, picked at random when the host starts. The Changeling holds an ordinary seat and sees only that seat&apos;s panel, the same as
            anyone else. They are not given the answer. They are given permission to lie.
          </p>
          <p>
            They may lie on any card and in any sentence. A Changeling in the Oracle&apos;s seat can reveal a hint that reads nothing like the true
            one, because the card carries what was typed and is only held against the truth at the unmasking.
          </p>
        </section>

        <section>
          <h2>The record</h2>
          <p>
            Cards are the official record. At the unmasking every card is laid next to the truth it was meant to carry, and the differences are marked.
          </p>
          <p>The crew fill every card truthfully. That is the only rule about what anyone types.</p>
          <p>
            Voice is free, for everyone. Speculate, hedge, argue hard for the wrong answer, be wrong out loud. That is what gives an honest player
            cover, and it is why the Changeling has to work for it.
          </p>
        </section>

        <section>
          <h2>The night</h2>
          <ol className="rules-steps">
            {NIGHT.map((step) => (
              <li key={step.name}>
                <p className="rules-step">
                  <span className="rules-name">{step.name}</span>
                  {step.when === null ? null : <span className="rules-when tabular">{step.when}</span>}
                </p>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="muted">
            Those are the defaults. Before the hall starts, the host can set the reading anywhere from 0 to 30 minutes, the work from 5 to 120, and the
            attempts from 1 to 10. Everything else is fixed.
          </p>
        </section>

        <section>
          <h2 className="rules-head">
            <FreezeBell size={40} decorative />
            {PHASE_NAMES.freeze}
          </h2>
          <p>
            Anyone still at the table can ring the bell, once a night. The window opens {duration(DEFAULT_SETTINGS.freezeOpensAfterMs)} into the work
            and closes with {duration(DEFAULT_SETTINGS.freezeClosesBeforeEndMs)} left. The editor locks, hands come off the keyboard, and the work clock
            stops. {duration(DEFAULT_SETTINGS.freezeDiscussionMs)} of argument, then {duration(DEFAULT_SETTINGS.freezeVoteMs)} to vote, with Skip on the
            ballot.
          </p>
          <p>
            Cast out the Changeling and the crew win there and then. Cast out a crewmate and they go read only for the rest of the night: no more
            cards, no more ballots. They keep their seat, except the Herald&apos;s, which passes to a random player still seated, because somebody has
            to be able to submit. Then the work resumes where it stopped.
          </p>
        </section>

        <section>
          <h2 className="rules-head">
            <BallotIcon size={40} decorative />
            {PHASE_NAMES.finalVote}
          </h2>
          <p>
            The last vote, and nobody calls it. It starts when the work clock reaches zero, or the moment the last attempt comes back rejected.{" "}
            {duration(DEFAULT_SETTINGS.finalDiscussionMs)} of argument, {duration(DEFAULT_SETTINGS.finalVoteMs)} to vote, and there is no Skip.
          </p>
          <p>
            Cast out the Changeling and the crew win. Anything else, a crewmate cast out or nobody cast out at all, and the Changeling wins.
          </p>
        </section>

        <section>
          <h2>How a ballot is counted</h2>
          <ul className="rules-points">
            <li>Ballots do not open until the discussion ends. Until then there is nothing to cast.</li>
            <li>
              A player is cast out only by a count strictly above every other option. Two options level at the top cast nobody out.
            </li>
            <li>
              In a Tribunal, a ballot never cast counts as a skip, so a silent table protects itself by default. A tie goes to Skip and everyone stays.
            </li>
            <li>In the Reckoning there is no Skip, and silence is simply not a vote. A tie casts nobody out, which is a win for the Changeling.</li>
            <li>A ballot can be recast while the round is open. The last one is the one that counts.</li>
            <li>The round resolves the moment every player still seated has voted, rather than waiting the clock out.</li>
          </ul>
        </section>

        <section>
          <h2>The judge</h2>
          <div className="rules-verdicts">
            <span className="rules-verdict rules-accepted">
              <AcceptedMark size={64} decorative />
              Accepted
            </span>
            <span className="rules-verdict">
              <RejectedSeal size={64} decorative />
              Rejected
            </span>
          </div>
          <p>
            Only the Herald submits, and the hall allows {DEFAULT_SETTINGS.maxSubmissions} attempts. Accepted ends the night at once and the crew win.
            When the attempts run out on a rejection, the work closes and the Reckoning starts.
          </p>
          <p>A rejection comes back under one of five headings, and the Herald files a report card naming that heading and the case that failed.</p>
          <ul className="rules-points">
            {REPORT_CATEGORIES.map((category) => (
              <li key={category}>{CATEGORY_WORDS[category]}</li>
            ))}
          </ul>
          <p>
            Where the problem carries its own tests, the Judge in the hall runs the shared file against them in the Herald&apos;s browser and an
            Accepted is recorded by the Judge rather than typed by anyone. A rejection only prefills the report card: the Herald still signs it, so a
            Changeling holding the Herald&apos;s seat can write down a case that never failed. Where the judge sits outside the hall, the Herald takes
            the verdict it gave and records it as given, and that rule rests on the table the way the truth rule does.
          </p>
        </section>

        <section>
          <h2 className="rules-head">
            <CrewEmblem size={40} decorative />
            Winning
          </h2>
          <p>The crew win when the judge accepts a submission, or when the Changeling is cast out, in a Tribunal or in the Reckoning.</p>
          <p>
            The Changeling wins when the candle burns out or every attempt is spent, and they are still at the table once the Reckoning is over. There
            is no draw.
          </p>
        </section>

        <section>
          <h2>The marks</h2>
          <p>
            Eight marks sit against an account. They are counted from halls you played signed in, and from nothing else. There is nothing to buy and
            nothing to claim.
          </p>
          <dl className="rules-marks">
            {MARKS.map((mark) => (
              <Fragment key={mark.id}>
                <dt>{mark.name}</dt>
                <dd>{mark.description}</dd>
              </Fragment>
            ))}
          </dl>
        </section>

        <section>
          <h2>Sitting down</h2>
          <p>
            A hall code is five letters. Anyone holding it can take a seat or watch, and no account is needed to play. Every problem in the bank was
            written for this game and you can read all of them before you start.
          </p>
          <p>
            <Link href="/">Open a hall</Link>, or <Link href="/problems">read the bank</Link>.
          </p>
        </section>

        <Divider />
      </main>
      <SiteFooter />
    </>
  );
}
