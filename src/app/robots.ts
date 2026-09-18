import type { MetadataRoute } from "next";

/* The same origin as layout.tsx's metadataBase; robots.txt carries an absolute sitemap URL. */
const ORIGIN = "https://leetposter.vercel.app";

/**
 * Everything is open except the live halls, whose codes are the only thing keeping them private,
 * and the art pages, which close themselves in production. `/design` is written without a trailing
 * slash so it covers the page itself as well as `/design/cosmetics`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/room/", "/design"] },
    sitemap: `${ORIGIN}/sitemap.xml`,
  };
}
