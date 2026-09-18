"use client";
import Link from "next/link";
import type { ReactElement } from "react";

/*
 * The last boundary: this file replaces the whole document, so the root layout never runs and
 * globals.css, motion.css, the theme island and both next/font faces never reach it. Everything it
 * needs is written out below. The colours are globals.css's and themes.ts's own token values, the
 * faces are those files' fallback stacks, and the light set is Ember's, because the saved mode is
 * unreadable from here: the OS preference is the only signal left. A focus ring and a hover colour
 * cannot be expressed as a style attribute, which is why this is a stylesheet and not inline props.
 */
const CSS = `
:root { color-scheme: dark light; }
body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  background: oklch(0.15 0.006 200);
  color: oklch(0.92 0.012 85);
  font-family: "Gill Sans", "Segoe UI", system-ui, sans-serif;
  font-size: 1rem;
  line-height: 1.55;
}
.fault {
  width: min(100% - 3rem, 44rem);
  margin: 0 auto;
  padding: 4rem 0;
}
.fault h1 {
  margin: 0 0 1rem;
  font-family: "Iowan Old Style", "Palatino Linotype", Georgia, serif;
  font-weight: 400;
  font-size: 2.25rem;
  line-height: 1.15;
}
.fault p { margin: 0 0 1rem; max-width: 68ch; }
.fault-message { color: oklch(0.7 0.014 85); overflow-wrap: anywhere; }
.fault-ways { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; margin: 0; }
.fault a { color: inherit; text-decoration-thickness: 2px; text-underline-offset: 0.18em; }
.fault button {
  font: inherit;
  color: inherit;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border: 2px solid oklch(0.34 0.01 200);
  background: none;
}
.fault a:hover, .fault button:hover { color: oklch(0.78 0.155 78); }
:focus-visible { outline: 2px solid oklch(0.78 0.155 78); outline-offset: 3px; }
@media (prefers-color-scheme: light) {
  body { background: oklch(0.97 0.004 200); color: oklch(0.24 0.012 85); }
  .fault-message { color: oklch(0.44 0.014 85); }
  .fault button { border-color: oklch(0.72 0.012 200); }
  .fault a:hover, .fault button:hover { color: oklch(0.52 0.118 62); }
  :focus-visible { outline-color: oklch(0.52 0.118 62); }
}
`;

/** Nothing rendered, not even the header. What broke, in the game's voice, and two ways on. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }): ReactElement {
  return (
    <html lang="en">
      <body>
        <title>The hall went dark | Leetposter</title>
        <style>{CSS}</style>
        <main className="fault">
          <h1>The hall went dark.</h1>
          {error.message === "" ? null : <p className="fault-message">{error.message}</p>}
          <p>The page broke before anything could be drawn on it. Try it again, and if the dark holds, leave the hall and come back in.</p>
          <p className="fault-ways">
            <button type="button" onClick={retry}>
              Try again
            </button>
            <Link href="/">Leave the hall</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
