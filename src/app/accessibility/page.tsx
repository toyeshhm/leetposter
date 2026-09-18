import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Divider } from "@/components/ui";
import "@/components/leaderboard/leaderboard.css";
import "../doc.css";

export const metadata: Metadata = {
  title: "Accessibility",
  description: "What the code does, checked against the code, and what has not been checked at all.",
};

/**
 * Every claim on this page is one a reader could go and verify: the contrast suite is
 * tests/unit/cosmetics-themes.test.ts, the motion rules are src/app/motion.css, the focus ring and
 * the reduced-motion block are in globals.css, and the device sweep is the one the README records.
 * The last section is the point of the page: no conformance claim, and the gaps named.
 */
export default function AccessibilityPage(): ReactElement {
  return (
    <>
      <SiteHeader />
      <main className="board-page">
        <h1>Accessibility</h1>

        <section className="doc-section">
          <p className="prose">
            The floor is WCAG 2.2 AA. This page says what the code does, and then what nobody has checked. There is no conformance claim here: no audit has
            been carried out by anyone outside this project, and the last section lists what that leaves open.
          </p>
        </section>

        <section className="doc-section">
          <h2>Colour and contrast</h2>
          <p className="prose">
            There are six themes and two modes, so twelve complete colour sets. A unit test computes the contrast of each one from the tokens themselves,
            converting OKLCH to linear sRGB to a relative luminance, rather than trusting a number written in a comment. It fails, and the test suite with it, unless every set resolves inside sRGB, carries body text at 4.5:1 on every surface that text can sit on, reads the accent as text on the page and page-coloured
            text on the accent, holds readable text on the oxblood danger fill, keeps both verdict seals legible on the page, keeps those seals red and green
            even in the monochrome theme where colour is load bearing, and puts light mode on paper and dark mode on stone rather than the other way round.
          </p>
          <p className="prose">
            One token, the quiet rule colour, sits at 1.7:1 on purpose. It draws table rules, dividers and separators and nothing else: no text uses it, and
            no control is outlined in it. Buttons, fields and frames are bordered in the page ink or in the secondary ink at 7.5:1.
          </p>
          <p className="prose">
            Colour is never the only carrier of meaning. Accepted and Rejected each have their own drawing and their own word, and the rejection also names a
            category. The clock&apos;s last minute is a colour change and also a change in the digits, with a screen reader announcement at one minute and at
            ten seconds. A player who has been ejected, and the Changeling at the reveal, are marked with words, not a colour.
          </p>
        </section>

        <section className="doc-section">
          <h2>Motion</h2>
          <p className="prose">
            Motion is opt in, never opt out. Every animation on the site lives inside a{" "}
            <code>prefers-reduced-motion: no-preference</code> query, so the page is complete and correct with the motion stylesheet doing
            nothing at all: a player who asks their machine for stillness gets the whole page with nothing missing and nothing hidden waiting for a transition
            that will never fire. A second rule cuts any remaining animation and transition to effectively zero when reduced motion is asked for.
          </p>
          <p className="prose">
            Nothing on the record moves in any case. Cards, verdicts, votes and the ledger are typeset, not performed. What moves is the light: the candle on
            the landing page, the hatching that carries it, a seat sigil as it is dealt, and the verdict seal as it lands. The clock&apos;s bleed to amber
            under a minute is a colour transition rather than a pulse, and it is written so that skipping the transition still lands on the amber.
          </p>
        </section>

        <section className="doc-section">
          <h2>Keyboard and focus</h2>
          <p className="prose">
            Every action in the app is a native button, link, input, textarea or select. There are no clickable divs and nothing is driven by a hand-rolled
            key handler, so tab order, Enter and Space, and everything your browser and your operating system already do to a form, all work here. The one
            select is drawn by the app instead of using the browser menu, because WebKit ignores a minimum height on the native one, but it is still a real{" "}
            <code>select</code>.
          </p>
          <p className="prose">
            Focus is always visible: a two pixel amber ring drawn outside the element with three pixels of offset, so it reads on any fill, including the
            amber primary button. Nothing suppresses it. Errors sit next to the field that caused them and are linked to it, and notices announce themselves,
            politely for information and immediately for an error.
          </p>
        </section>

        <section className="doc-section">
          <h2>Images and names</h2>
          <p className="prose">
            Every drawing is inline SVG with a role and a title, or it is marked as decoration and hidden from assistive technology when the text beside it
            already says the same thing. The four seats carry an English word anybody can read, Cartographer, Oracle, Warden and Herald, and each also carries
            its own distinct drawing, so the seat is legible whether you read the label, the sigil or both. There are no all-capital sentences anywhere, and
            small caps are kept for short labels such as a seat badge or a table heading, never for a sentence.
          </p>
        </section>

        <section className="doc-section">
          <h2>Text, zoom and touch</h2>
          <p className="prose">
            Type is set on a fixed rem scale and respects the text size set in the browser. Prose is capped at a 68 character measure. On a touch device every
            editable control, the shared editor included, is at least sixteen pixels, since Safari zooms into anything smaller when it gains focus, and the
            text links in the site chrome grow a 44 pixel target without moving. Nothing on the game screen is fixed or sized to the full viewport height, so
            the mobile address bar coming and going does not move the editor, and the page pads the safe area so nothing sits under a notch or a home
            indicator.
          </p>
          <p className="prose">
            Light and dark are free, at <Link href="/settings">Settings</Link>, and follow the system until you choose one.
          </p>
        </section>

        <section className="doc-section">
          <h2>What has been tested</h2>
          <p className="prose">
            The end to end suite runs on Chromium, and the game and shared editor run on WebKit and Firefox as well, with one phone sized page in the tribunal
            test. The screens were swept with browser device profiles, an iPhone in both orientations, a small tablet, an Android phone, a 1366 pixel Firefox
            and a 1920 pixel Chrome, looking for horizontal overflow, elements pushed past the edge of the viewport, tap targets under 44 pixels and console
            errors. The contrast suite described above runs with the rest of the tests, not as part of deploying, so it is only a gate for whoever runs it.
          </p>
        </section>

        <section className="doc-section">
          <h2>What has not been tested</h2>
          <p className="prose">These are gaps, not plans, and they are here because a page like this is worth nothing without them.</p>
          <ul className="doc-list">
            <li>No screen reader audit has been done. Nobody has driven this site with VoiceOver, NVDA, JAWS, Orca or TalkBack.</li>
            <li>There is no automated accessibility scanner in the build. The contrast suite covers colour and only colour; nothing checks names, roles or landmarks.</li>
            <li>The shared editor is CodeMirror. Its keyboard and assistive technology behaviour is CodeMirror&apos;s and has not been reviewed here.</li>
            <li>The device sweep was automated. It looked for overflow, small targets and console errors, and it is not a substitute for a person using the site.</li>
            <li>Nothing has been checked with voice control, a switch device, a screen magnifier or browser zoom past 200 percent.</li>
            <li>The game is timed, and the timings are the host&apos;s to set in the lobby but cannot be extended once a round is running.</li>
            <li>Emulated Android cannot type Enter into the shared editor, so that one path is only testable on a real device and has not been.</li>
            <li>No conformance statement, no VPAT, no third-party audit.</li>
          </ul>
        </section>

        <Divider />
      </main>
      <SiteFooter />
    </>
  );
}
