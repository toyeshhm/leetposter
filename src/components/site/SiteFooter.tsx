import Link from "next/link";
import type { ReactElement } from "react";
import { ChangelingMask } from "@/components/art";
import { Divider } from "@/components/ui";
import "./site.css";

interface FootColumn {
  readonly heading: string;
  readonly links: readonly { readonly href: string; readonly label: string }[];
}

const COLUMNS: readonly FootColumn[] = [
  {
    heading: "The hall",
    links: [
      { href: "/", label: "Play a round" },
      { href: "/halls", label: "Open halls" },
      { href: "/problems", label: "The bank" },
      { href: "/leaderboard", label: "Leaderboard" },
    ],
  },
  {
    heading: "The company",
    links: [
      { href: "/me", label: "Your record" },
      { href: "/friends", label: "Friends" },
      { href: "/store", label: "Store" },
      { href: "/pass", label: "Season pass" },
      { href: "/settings", label: "Settings" },
      { href: "/account", label: "Sign in" },
    ],
  },
  {
    heading: "About",
    links: [
      { href: "/rules", label: "How to play" },
      { href: "/about", label: "About and colophon" },
      { href: "/accessibility", label: "Accessibility" },
    ],
  },
  {
    heading: "Fine print",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/refunds", label: "Purchases and refunds" },
      { href: "/conduct", label: "Code of conduct" },
    ],
  },
];

/*
 * The baseline is short on purpose. An owner name, a place, a contact address and a copyright
 * holder are not in this repo, and a bracketed placeholder in a footer is worse than a missing
 * line, so those sentences are absent rather than invented. Add them here when they exist.
 */

/** The way out of every page that is not a live round: four columns, then the baseline. */
export function SiteFooter(): ReactElement {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  return (
    <footer className="site-foot">
      <Divider />
      <nav className="foot-cols" aria-label="Footer">
        {COLUMNS.map((column) => (
          <div key={column.heading} className="foot-col">
            <h2 className="foot-head">{column.heading}</h2>
            <ul className="foot-list">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="foot-base">
        <p>
          Set in IM Fell English and Alegreya Sans. Every drawing on this site is an original SVG, cut for this game. No stock art, no
          photographs, no raster textures, no generated images.
        </p>
        <p>
          <Link href="/settings">Light or dark, at Settings.</Link>
        </p>
        <p className="foot-wide">
          Leetposter is not affiliated with, endorsed by or sponsored by LeetCode. LeetCode is a trademark of its owner.
        </p>
        {commit === undefined ? null : <p className="foot-wide foot-print">Printed from {commit}.</p>}
        <span className="foot-mask">
          <ChangelingMask size={24} decorative />
        </span>
      </div>
    </footer>
  );
}
