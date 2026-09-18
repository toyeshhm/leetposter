import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Divider } from "@/components/ui";
import "@/components/leaderboard/leaderboard.css";
import "../doc.css";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Leetposter stores, which table it stores it in, who else sees it, and the three things it keeps in your browser.",
};

/**
 * Written off the schema rather than off a template: every table named here is one in
 * supabase/migrations, every processor is one the code actually calls, and the three localStorage
 * keys are the ones in client/theme.ts, client/api.ts and the Supabase browser client. Retention
 * and deletion say what the code does today, which in both cases is nothing.
 */
export default function PrivacyPage(): ReactElement {
  return (
    <>
      <SiteHeader />
      <main className="board-page">
        <h1>Privacy</h1>
        <p className="prose muted">
          This is written from the database schema, not from a template. It says what is stored, which table it sits in, who else it reaches, and what the app
          cannot do for you yet.
        </p>

        <section className="doc-section">
          <h2>Playing without an account</h2>
          <p className="prose">A hall needs no account, and a guest gives no email address.</p>
          <p className="prose">
            A hall is one row in the rooms table. Its state holds the hall code, the display name every player typed, the seats dealt, the problem in play,
            every card played, the votes and the outcome. Beside it, doc holds the shared file as one base64 snapshot, which is everything anyone typed into the
            editor in that hall.
          </p>
          <p className="prose">
            For a guest that is all of it. A typed display name is the only thing in a hall that points at a person, and it points wherever the person pointed
            it.
          </p>
        </section>

        <section className="doc-section">
          <h2>Accounts</h2>
          <p className="prose">Supabase Auth holds the email address and a hash of the password. This application never sees the password itself.</p>
          <p className="prose">
            Sign-up, sign-in and password changes go from your browser straight to Supabase. The profiles table holds three things: the account id Supabase
            issued, your username, and when it was created. Everything else is keyed to that id.
          </p>
          <ul className="doc-list">
            <li>
              game_results, one row per hall you finished: the seats you held, whether you were the Changeling, whether you won and why, how many cards you
              played, how many of them you altered, whether you were ejected, and how many were at the table.
            </li>
            <li>ratings, your Elo on the overall, crew and changeling ladders, with games and wins.</li>
            <li>friendships, the requests you sent and the ones you accepted.</li>
            <li>wallets, your candles and your lifetime XP.</li>
            <li>inventory and loadouts, the cosmetics you own and the ones you wear.</li>
            <li>pass_progress, your XP in a season, whether the paid pass was bought, and which tiers you claimed.</li>
            <li>quest_progress, one row per quest per period.</li>
            <li>purchases, with the Stripe session id, the amount in cents, and whether it is pending, paid or failed.</li>
          </ul>
          <p className="prose">
            Your username is public: it is on the leaderboard, on your record, and visible to your friends. Every screen that shows it joins the profile on the
            account id rather than keeping a copy, so renaming yourself renames you everywhere at once.
          </p>
        </section>

        <section className="doc-section">
          <h2>Who else it reaches</h2>
          <p className="prose">Four companies, each for one job.</p>
          <ul className="doc-list">
            <li>Supabase holds the database and the accounts. Every table named above lives there.</li>
            <li>Vercel hosts the site. A server error is written as a single JSON line to the Vercel logs and kept for as long as Vercel keeps logs.</li>
            <li>
              Stripe takes the payment for the season pass. Card details are typed on the checkout page Stripe hosts, and never reach this application or its
              database. What comes back is a session id, an amount and a status.
            </li>
            <li>
              Groq reads pasted problems. POST /api/parse sends the whole pasted text to api.groq.com, to the model openai/gpt-oss-120b, when the built-in
              parser cannot make enough of the paste or when someone presses Sort with the model. Paste nothing you would not hand to a third party.
            </li>
          </ul>
        </section>

        <section className="doc-section">
          <h2>What gets fetched from elsewhere</h2>
          <p className="prose">Three outside addresses, and only one of them is contacted by your own browser.</p>
          <p className="prose">
            When a problem is pasted, this server asks leetcode.com/graphql for the site copy of it, and reads a public list of contest ratings from
            raw.githubusercontent.com. Both requests come from the server, so they carry the server address rather than yours.
          </p>
          <p className="prose">
            The first time Python is run in a hall, your browser downloads Pyodide from cdn.jsdelivr.net. That request comes from your machine and shows your IP
            address to that CDN. JavaScript runs in a worker built inside the page and downloads nothing.
          </p>
        </section>

        <section className="doc-section">
          <h2>What is kept in your browser</h2>
          <p className="prose">No cookies at all, so there is nothing to consent to. Three things in local storage, and no more.</p>
          <ul className="doc-list">
            <li>leetposter.mode, holding light, dark or system. A preference about how the page is lit, and nothing else.</li>
            <li>
              leetposter.credentials.CODE, one entry per hall, holding the hall code, your player id and a secret seat token. This one is a credential: anyone
              with that browser profile can take your seat in that hall while the entry is there. It is written when you join and removed when the hall no
              longer knows that seat, so on a shared computer it outlives the round.
            </li>
            <li>
              The Supabase auth token, written by the Supabase client under a key beginning sb-, holding the access and refresh tokens for a signed-in account.
              Signing out removes it.
            </li>
          </ul>
        </section>

        <section className="doc-section">
          <h2>Security</h2>
          <p className="prose">Every table is closed to the public keys, and only the server can read one.</p>
          <p className="prose">
            Row level security is enabled on every table and no policies are defined, so the anonymous and signed-in keys can read and write nothing at all.
            Everything goes through the API routes, which hold the service role key on the server. Passwords are handled by Supabase Auth and never seen here.
            Card details only ever reach Stripe. The Stripe webhook is checked with a constant-time HMAC over the signed payload, and a delivery whose timestamp
            is more than five minutes old is refused.
          </p>
        </section>

        <section className="doc-section">
          <h2>How long it is kept</h2>
          <p className="prose">Halls are never deleted. That is a gap, not a policy.</p>
          <p className="prose">
            There is no purge, no expiry and no scheduled clean-up for the rooms table in the code today, so a hall row stays in the database indefinitely,
            along with the display names everyone typed and the full snapshot of the shared file. Account rows last as long as the account.
          </p>
        </section>

        <section className="doc-section">
          <h2>What you can and cannot do today</h2>
          <p className="prose">You can change your name and your password. You cannot yet delete your account or export what it holds.</p>
          <p className="prose">
            Your username and your password are both changed at <Link href="/settings">settings</Link>, and a password change is checked against the current
            one first.
          </p>
          <p className="prose">
            Neither account deletion nor a data export is built. The only delete in the app removes a friend. The account tables all cascade from the profile
            row, so deleting one would take them with it, but hall records would stay: a display name in a hall is a typed string with no link back to an
            account, so it cannot be found by account id.
          </p>
        </section>

        <section className="doc-section">
          <h2>No analytics</h2>
          <p className="prose">There is no analytics, no tracking pixel and no third-party script on any page.</p>
          <p className="prose">Both typefaces are self-hosted at build time, so reading a page sends no font request anywhere.</p>
        </section>

        <section className="doc-section">
          <h2>Children</h2>
          <p className="prose">
            Leetposter is not meant for children under 13. The age rules are in the <Link href="/terms">terms</Link>.
          </p>
        </section>

        <section className="doc-section">
          <h2>Changes</h2>
          <p className="prose">This notice can change, and the version on this page is the current one.</p>
        </section>

        <Divider />
      </main>
      <SiteFooter />
    </>
  );
}
