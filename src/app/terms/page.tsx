import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Divider } from "@/components/ui";
import "@/components/leaderboard/leaderboard.css";
import "../doc.css";

export const metadata: Metadata = {
  title: "Terms",
  description: "What you agree to by taking a seat, making an account or buying the season pass.",
};

/**
 * The terms of use. Every clause is checkable against the code: the username rule is the regex in
 * profiles.ts and the check in 0003_accounts.sql, the seat token is the localStorage credential in
 * client/api.ts, and the pass is the one thing stripe.ts opens a till for. Clauses that would need
 * a fact nobody has supplied (an entity, an address, a governing law) are absent, not invented.
 */
export default function TermsPage(): ReactElement {
  return (
    <>
      <SiteHeader />
      <main className="board-page">
        <h1>Terms</h1>
        <p className="prose muted">
          These terms cover Leetposter, the game at this site. Each section opens with the plain version and gives the detail after it. Taking a seat in a hall,
          making an account or buying the season pass means you agree to them.
        </p>

        <section className="doc-section">
          <h2>1. Who may play</h2>
          <p className="prose">Leetposter is for people aged 13 and over.</p>
          <p className="prose">
            In the European Economic Area you must be at least 16 unless a parent or guardian has consented on your behalf. You must be 18 or over to buy the
            season pass, or have the permission of whoever holds the card you pay with.
          </p>
        </section>

        <section className="doc-section">
          <h2>2. Seats, accounts and names</h2>
          <p className="prose">You can play without an account. If you make one, the name you choose is public.</p>
          <p className="prose">
            A seat in a hall is held by a secret token your browser keeps, not by a login. Anyone using that browser profile holds that seat until the token is
            gone. On a shared computer, treat it as a password.
          </p>
          <p className="prose">
            An account is an email address and a password, both handled by Supabase Auth. A username is 3 to 20 characters, lowercase letters, digits and
            underscores only. It appears on the leaderboard, on your record and to your friends. Display names are typed fresh in each hall and are shown to
            everyone there, including anyone watching.
          </p>
          <p className="prose">
            We may rename or remove a username or a typed display name, and we may close an account, where a name breaks these terms or the code of conduct. You
            are responsible for what happens under your account, including anything done by someone you let use it.
          </p>
        </section>

        <section className="doc-section">
          <h2>3. Conduct</h2>
          <p className="prose">Lying inside the game is the game. Harassment is not.</p>
          <p className="prose">
            A hall is four to eight people sharing a problem, a file and usually a voice call, and it ends by voting someone out. Where the line falls is set out
            at the <Link href="/conduct">code of conduct</Link>, which is part of these terms.
          </p>
        </section>

        <section className="doc-section">
          <h2>4. What you write</h2>
          <p className="prose">What you type stays yours. You let us store it and show it to the rest of your hall so the round can run.</p>
          <p className="prose">
            That covers the cards you play, the display name you type, any problem text you paste, and everything typed into the shared file. The file is saved
            as one whole document, so anything typed in it is kept with the hall.
          </p>
          <p className="prose">
            Paste only what you have the right to paste. A problem statement written by somebody else stays theirs, and pasting it into a hall does not change
            that. Nothing pasted is reviewed before it appears. We may remove anything and end the hall it is in.
          </p>
        </section>

        <section className="doc-section">
          <h2>5. The season pass</h2>
          <p className="prose">The pass is bought once, for the season running at the time, and it unlocks that season and no other.</p>
          <p className="prose">
            Payment goes through Stripe Checkout. The price and the currency are the ones Stripe shows you before you pay. Buying the pass unlocks the paid track
            of that season, thirty tiers deep.
          </p>
          <p className="prose">
            Payment on its own hands over nothing. Each tier is claimed by you, once you hold the XP that tier opens at, and only while the season is running. XP
            is earned by playing. A tier left unclaimed when the season ends stays unclaimed, and a pass does not carry into the next season.
          </p>
          <p className="prose">
            What a refund does, and what it does not do, is set out at <Link href="/refunds">purchases and refunds</Link>.
          </p>
        </section>

        <section className="doc-section">
          <h2>6. Candles, cosmetics and tiers</h2>
          <p className="prose">Nothing you hold inside the game is property, and none of it is worth money.</p>
          <p className="prose">
            Candles are earned by playing. They are not sold, and there is no way to buy them with money. Candles, cosmetics, titles, themes and pass tiers are a
            limited, personal, revocable licence to use them inside Leetposter. They cannot be transferred, sold or exchanged for money, and they have no value
            outside the game.
          </p>
          <p className="prose">If Leetposter closes, everything held inside it goes with it. Any right you have as a consumer under the law is not affected by that.</p>
        </section>

        <section className="doc-section">
          <h2>7. Suspension and closing an account</h2>
          <p className="prose">We can suspend or close an account for breaking these terms, and you can stop playing whenever you like.</p>
          <p className="prose">
            We may also remove a name or end a hall, for the same reasons or where the law requires it. There is no way to delete an account from inside the app
            today, and the <Link href="/privacy">privacy notice</Link> says so plainly rather than promising otherwise.
          </p>
        </section>

        <section className="doc-section">
          <h2>8. The game as it is</h2>
          <p className="prose">Leetposter is offered as it is, with no promise that it will work.</p>
          <p className="prose">
            We do not promise that a hall will stay up, that a round will finish, that the shared file will keep what you typed, or that the site will be free of
            faults. Problems, ratings, seats, seasons and rewards can change or be withdrawn. To the extent the law allows, warranties that are not written here
            are excluded.
          </p>
        </section>

        <section className="doc-section">
          <h2>9. Limits on liability</h2>
          <p className="prose">If a round goes wrong, what you can recover is limited.</p>
          <p className="prose">
            To the extent the law allows, we are not liable for lost work, lost time, lost rating, lost cosmetics, or anything that follows from a hall or a round
            going wrong. Where liability cannot be excluded, it is limited to what you paid us in the twelve months before the claim. Nothing here limits
            liability for death or personal injury caused by negligence, for fraud, or for anything else the law does not allow to be limited.
          </p>
        </section>

        <section className="doc-section">
          <h2>10. Changes</h2>
          <p className="prose">These terms can change, and the version on this page is the one that applies.</p>
          <p className="prose">A change that would materially worsen a season pass already bought does not apply to that pass.</p>
        </section>

        <section className="doc-section">
          <h2>11. LeetCode</h2>
          <p className="prose">Leetposter is not affiliated with, endorsed by or sponsored by LeetCode. LeetCode is a trademark of its owner.</p>
        </section>

        <Divider />
      </main>
      <SiteFooter />
    </>
  );
}
