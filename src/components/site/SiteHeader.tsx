import Link from "next/link";
import type { ReactElement } from "react";
import { SessionNav } from "./SessionNav";
import "./site.css";

/** The site shell: wordmark home on the left, the account state on the right. Server-safe; the nav is the client island. */
export function SiteHeader(): ReactElement {
  return (
    <header className="site-head">
      <Link href="/" className="site-wordmark">
        Leetposter
      </Link>
      <SessionNav />
    </header>
  );
}
