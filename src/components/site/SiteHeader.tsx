import Link from "next/link";
import type { ReactElement } from "react";
import { SessionNav } from "./SessionNav";
import "./site.css";

/** The site shell: wordmark home and the leaderboard on the left, the account state on the right. Server-safe; the nav is the client island. */
export function SiteHeader(): ReactElement {
  return (
    <header className="site-head">
      <span className="site-links">
        <Link href="/" className="site-wordmark">
          Leetposter
        </Link>
        <Link href="/leaderboard" className="site-board">
          Leaderboard
        </Link>
      </span>
      <SessionNav />
    </header>
  );
}
