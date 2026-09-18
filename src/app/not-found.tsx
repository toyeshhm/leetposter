import Link from "next/link";
import type { ReactElement } from "react";
import { ChangelingMask } from "@/components/art";
import { SiteHeader } from "@/components/site/SiteHeader";
import "@/components/leaderboard/leaderboard.css";

/**
 * Every notFound() in the app lands here: an id the bank does not hold, and the two design pages,
 * which close themselves in production. Without this file all three fall back to Next's own white
 * sans-serif page, outside the system entirely. Voice follows error.tsx.
 */
export default function NotFound(): ReactElement {
  return (
    <>
      <SiteHeader />
      <main className="board-page">
        <ChangelingMask size={160} />
        <h1>No such hall.</h1>
        <p className="prose">
          The code on the door does not open anything. A hall code is five letters, and it never carries an I or an O. Check yours again, or start a hall
          of your own.
        </p>
        <nav aria-label="Ways on">
          <p>
            <Link href="/">Start a hall</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/problems">The bank</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/halls">Open halls</Link>
          </p>
        </nav>
      </main>
    </>
  );
}
