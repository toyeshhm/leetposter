import type { MetadataRoute } from "next";
import { BANK } from "@/problems";

/* The same origin as layout.tsx's metadataBase, written out because a sitemap carries absolute
   URLs and there is no request to resolve them against. */
const ORIGIN = "https://leetposter.vercel.app";

/*
 * Public routes only. Left out on purpose: /room/[code] and /room/[code]/watch, which are live
 * halls that exist for forty minutes; /design and /design/cosmetics, which close themselves in
 * production; and /account, /me, /friends and /settings, which say nothing without a session.
 */
const PAGES: readonly string[] = [
  "/",
  "/halls",
  "/problems",
  "/leaderboard",
  "/store",
  "/pass",
  "/rules",
  "/about",
  "/accessibility",
  "/terms",
  "/privacy",
  "/refunds",
  "/conduct",
];

/* No lastModified: the bank and these pages ship with the build and nothing records when any one
   of them last changed, so a date here would be invented. A missing lastmod is legal and ignored. */
export default function sitemap(): MetadataRoute.Sitemap {
  const statements = BANK.map((p) => `/problems/${p.id}`);
  return [...PAGES, ...statements].map((path) => ({ url: `${ORIGIN}${path}` }));
}
