import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Divider } from "@/components/ui";
import "@/components/leaderboard/leaderboard.css";
import "../doc.css";

export const metadata: Metadata = {
  title: "Purchases and refunds",
  description: "The one thing sold for money, what payment unlocks, and what a refund does and does not do.",
};

/**
 * The seller page Stripe expects. It describes the till that exists: one Checkout Session for one
 * season pass (server/economy/stripe.ts), a webhook literal-typed to checkout.session.completed
 * and nothing else, and no automatic_tax on the session. Where the code cannot back a promise, the
 * page says what actually happens instead of making one.
 */
export default function RefundsPage(): ReactElement {
  return (
    <>
      <SiteHeader />
      <main className="board-page">
        <h1>Purchases and refunds</h1>
        <p className="prose muted">
          One thing is sold for money. This page says what it is, what payment unlocks, and what a refund does and does not do, which is not the same as what a
          refund ought to do.
        </p>

        <section className="doc-section">
          <h2>What is for sale</h2>
          <p className="prose">The season pass, for the season running at the time. Nothing else.</p>
          <p className="prose">
            Candles, the currency inside the game, are earned by playing and cannot be bought. Cosmetics are bought with candles, not with money. There is one
            checkout in the whole app and it opens for the pass.
          </p>
          <p className="prose">
            The price and the currency are the ones Stripe shows on the checkout page before you pay, and the total there, including any tax Stripe adds to it,
            is what is charged. The amount is not held in this app: it reads back whatever Stripe charged and records it against the purchase.
          </p>
        </section>

        <section className="doc-section">
          <h2>What payment unlocks, and when</h2>
          <p className="prose">Payment unlocks the paid track of that season, thirty tiers deep, and normally within seconds of the checkout completing.</p>
          <p className="prose">
            Access begins when Stripe tells the server the session completed, not when the browser returns from checkout. Until that message arrives the
            purchase sits marked pending.
          </p>
          <p className="prose">
            Payment on its own hands over no items. Every tier is claimed by you, once you hold the XP that tier opens at, and only while the season is
            running. A tier left unclaimed when the season ends stays unclaimed, and a pass does not carry into the next season. The tiers, the XP they open at
            and the dates of the season are all on the <Link href="/pass">pass</Link> page.
          </p>
        </section>

        <section className="doc-section">
          <h2>What a refund does</h2>
          <p className="prose">A refund returns the money. It does not take the pass back on its own.</p>
          <p className="prose">
            A refund is issued in Stripe, and the money goes back by the route it came. How long it takes from there is between Stripe and your bank.
          </p>
          <p className="prose">
            The part worth knowing: this server listens for one Stripe event, checkout.session.completed, and no other. A refund, and a chargeback, both leave
            the purchase recorded as paid and leave the paid track unlocked. Access is removed by hand or not at all. If a refund is agreed, treat taking the
            access back as a separate step somebody performs, not as something the payment system does by itself.
          </p>
        </section>

        <section className="doc-section">
          <h2>If you are in the EEA or the UK</h2>
          <p className="prose">You keep the full fourteen-day right to change your mind, whether or not you have used the pass.</p>
          <p className="prose">
            Digital content bought online carries a fourteen-day right of withdrawal, and that right is normally lost once delivery begins with the express
            consent of the buyer and their acknowledgement that the right goes with it. Leetposter does not ask for that consent at checkout. Until it does,
            buyers in the European Economic Area and the United Kingdom keep the right in full.
          </p>
        </section>

        <section className="doc-section">
          <h2>Payments that do not go through</h2>
          <p className="prose">A checkout that is abandoned or declined unlocks nothing and charges nothing.</p>
          <p className="prose">
            It leaves a purchase recorded as pending, which is a record of an attempt rather than a debt. Buying the pass again for a season you already hold
            adds nothing, which is why the buy button is not shown once the paid track is open.
          </p>
        </section>

        <Divider />
      </main>
      <SiteFooter />
    </>
  );
}
