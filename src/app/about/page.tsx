import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Divider } from "@/components/ui";
import { problemIndex } from "@/server/problems";
import "@/components/leaderboard/leaderboard.css";
import "../doc.css";

export const metadata: Metadata = {
  title: "About",
  description: "What Leetposter is, what the bank holds, and what the site is drawn and built with.",
};

/**
 * The colophon. Everything here is checkable against the repo: the bank is counted at build time,
 * the faces are the two `next/font` loads in layout.tsx, and the stack is the one in package.json.
 * Nothing about who made it, where, or when, because none of that is in the repo to read.
 */
export default function AboutPage(): ReactElement {
  const bank = problemIndex({});
  return (
    <>
      <SiteHeader />
      <main className="board-page">
        <h1>About</h1>

        <section className="doc-section">
          <h2>What it is</h2>
          <p className="prose">
            Leetposter is a social deduction game for programmers. Four to eight people take one hard algorithm problem, forty minutes and a shared file.
            Every seat holds one channel of information on top of the statement everyone can see: the Cartographer holds the tags, the Oracle holds the hints
            in order, the Warden holds the constraints, the Herald carries the file to the Judge and comes back with a verdict. One player is the Changeling.
            They hold a seat like anyone else, see only that seat, and may lie on every card they play and in every sentence they say.
          </p>
          <p className="prose">
            Cards are the record. At the reveal every card is laid next to the truth it was meant to carry, and the crew find out what the table was working
            from. On a problem from the bank the verdict is the one thing that cannot be faked, because the Judge in the Hall runs the file and records what it
            finds; on a problem the host brought from elsewhere the Herald types the verdict in, and a Changeling holding that seat can lie about it like
            anything else.
          </p>
          <p className="prose">
            It is free and it runs in the browser. Nothing to install, and no account needed to take a seat. <Link href="/rules">How to play</Link> has the
            seats, the clock and the win conditions in full.
          </p>
        </section>

        <section className="doc-section">
          <h2>The bank</h2>
          <p className="prose">
            The Hall has its own problems. {bank.length} of them are written for this game, set in the world of the lore bible that problem authors write
            from: a candlelit stone hall where a company of scribes argues over a manuscript before the candle burns down. None of them are borrowed. You can{" "}
            <Link href="/problems">read the bank</Link> without an account.
          </p>
          <p className="prose">
            Each problem ships with a statement and its worked examples, an input and output format, a constraints block, tags from a fixed list, two to four
            hints in order, a difficulty and a rating, a Python reference solution, an independent brute force solution written a second way, sample cases and
            between eight and twenty five hidden tests. A checker runs both solutions against every test through the real python3 before a problem is allowed
            in. That is what makes the four seats worth holding: the tags the Cartographer declares, the hints the Oracle gives up and the bounds the Warden
            reads are the problem&apos;s own, so a lie about them is a lie about something.
          </p>
        </section>

        <section className="doc-section">
          <h2>The drawing</h2>
          <p className="prose">
            Each drawing is a React component rather than a file: the ink is the surrounding text colour, so a drawing takes the colour of whatever it sits in and works in
            both modes and every theme; the one warm spot is a single custom property, which is how an Accepted seal turns green without a second drawing;
            tone is hatching from a function that returns path data, never a grey fill or a blur; and at forty eight pixels and up the outline is displaced by
            a turbulence filter so the line reads as cut rather than plotted. The two page textures, a diagonal hatch and a grain, are generated in CSS and SVG
            for the same reason.
          </p>
        </section>

        <section className="doc-section">
          <h2>The type</h2>
          <p className="prose">
            Set in IM Fell English and Alegreya Sans. IM Fell English is a digitisation of the Fell types, cut for Oxford in the 1600s, worn edges included; it
            carries the wordmark, the page titles, the frame captions and the reveal, and it is never used for a label, a button or a number. Alegreya Sans, a
            humanist sans with tabular figures and real small caps, does everything else. Both come from Google Fonts under an open licence, and next/font
            downloads them at build, so they are served from this site and your browser never asks Google for them.
          </p>
        </section>

        <section className="doc-section">
          <h2>How it is built</h2>
          <p className="prose">
            Next.js on Vercel, in TypeScript with strict on. All the game logic is a pure reducer over one state object, which is why the clock, the votes and
            the verdicts can be tested without a browser; the unit suite holds the game rules, the server modules and the API routes at one hundred percent of
            statements and branches.
          </p>
          <p className="prose">
            A hall is one row in a Supabase Postgres table: the state, a version so two actions landing at once cannot overwrite each other, and the last
            saved state of the shared file. The shared file is a Yjs document in CodeMirror. Edits and carets travel straight between browsers over one
            Supabase Realtime channel per hall, and the whole document is written back to the row a couple of seconds after the last edit, so a reload or a
            late arrival starts from what is there. Python runs on your own machine through Pyodide, fetched from a CDN the first time anyone presses Run;
            JavaScript runs in a small worker beside it. The season pass goes through Stripe Checkout. There is no analytics dependency, and the app sets no
            cookies at all.
          </p>
          <p className="prose">
            Light and dark both ship, free, at <Link href="/settings">Settings</Link>, and follow the system until you choose. Six themes across two modes make
            twelve colour sets, and every one of them has its contrast computed from the tokens themselves in CI rather than checked by eye.{" "}
            <Link href="/accessibility">Accessibility</Link> says what that covers and what it does not.
          </p>
        </section>

        <Divider />
      </main>
      <SiteFooter />
    </>
  );
}
