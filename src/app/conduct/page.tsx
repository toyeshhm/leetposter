import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Divider } from "@/components/ui";
import "@/components/leaderboard/leaderboard.css";
import "../doc.css";

export const metadata: Metadata = {
  title: "Code of conduct",
  description: "Lying inside the game is the game. This is the part that is not the game.",
};

/**
 * Not decorative: a hall is four to eight people, free text on the record, a shared file anyone can
 * overwrite, and a vote that throws someone out. Every limit named here is one the app actually
 * has, and the things it does not have (live moderation, a review queue) are said plainly.
 */
export default function ConductPage(): ReactElement {
  return (
    <>
      <SiteHeader />
      <main className="board-page">
        <h1>Code of conduct</h1>

        <section className="doc-section">
          <p className="prose">
            A hall is four to eight people arguing for forty minutes while one of them lies. It is supposed to be uncomfortable. This page is about the part
            that is not the game.
          </p>
        </section>

        <section className="doc-section">
          <h2>Lying is the game. Harassment is not.</h2>
          <p className="prose">
            The Changeling lies on cards and out loud, and that is the whole design. Crew speculate, hedge and are wrong in public, and that is their cover.
            Accusing someone of being the Changeling on no evidence at all is a legal move, and nobody owes an apology for it when the round ends.
          </p>
          <p className="prose">
            None of that reaches the person holding the seat. Their name, their accent, where they are from, their race, their gender, their religion, their
            disability, their age and how fast they write code are not material. A round is a licence to lie about a problem for forty minutes, and it is not
            a licence for anything else.
          </p>
        </section>

        <section className="doc-section">
          <h2>What other people see you type</h2>
          <p className="prose">This app publishes three things you type, to people who are not you.</p>
          <ul className="doc-list">
            <li>
              The display name you take in a hall. Up to 24 characters, anything you like, and everyone in that hall sees it for as long as the hall lives,
              spectators included.
            </li>
            <li>
              The username on your account. Three to twenty lowercase letters, digits or underscores. It goes on the <Link href="/leaderboard">leaderboard</Link>{" "}
              for anyone to read, signed in or not, and it stays with the account.
            </li>
            <li>
              The text on the cards you play: a list of tags, a hint, a bound, the failing case on a report card. Cards are the record and they are read by
              the whole hall as they are played.
            </li>
          </ul>
          <p className="prose">
            Out of bounds in all three: slurs and harassment, sexual content, threats, another person&apos;s real name or contact details, pretending to be
            another player, and anything illegal where you are. A name chosen so that it reads as an insult to someone at the table is out of bounds whatever
            it happens to spell.
          </p>
        </section>

        <section className="doc-section">
          <h2>The shared file</h2>
          <p className="prose">
            The editor is one file with live carets and everyone in the hall can edit all of it. There is nothing stopping you deleting someone else&apos;s
            work, and doing it is not a play: a Changeling wins by lying about the problem, not by wrecking the file. The same goes for pasting a wall of text
            over the top of a solution or filling the file with abuse.
          </p>
        </section>

        <section className="doc-section">
          <h2>Votes</h2>
          <p className="prose">
            A vote throws a player out of the round. It is a move in a game about who is lying and it carries nothing about the person. Arranging in advance
            to eject the same player every night regardless of what happened in the round is not playing the game, it is using it.
          </p>
        </section>

        <section className="doc-section">
          <h2>What this app does and does not do</h2>
          <p className="prose">
            Halls are not moderated while they run. Nobody is reading your hall, no card is reviewed before the table sees it, and a display name is checked
            for length and nothing else. A hall code is known only to the people you send it to, so the first line of defence is who you invite; listing a
            hall on the <Link href="/halls">halls board</Link> makes it watchable by anyone for as long as it keeps moving. You can leave a hall at any time.
          </p>
          <p className="prose">
            What is reserved: a username or a typed display name can be changed or removed, and an account can be suspended or closed, for anything on this
            page.
          </p>
        </section>

        <Divider />
      </main>
      <SiteFooter />
    </>
  );
}
