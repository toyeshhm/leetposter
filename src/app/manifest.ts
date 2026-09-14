import type { MetadataRoute } from "next";

/* Tokens from globals.css, resolved to sRGB: --bg and --accent. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Leetposter",
    short_name: "Leetposter",
    description: "Four to eight programmers, one hard problem, forty minutes, and one of you is lying.",
    start_url: "/",
    display: "standalone",
    background_color: "#14181a",
    theme_color: "#14181a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
