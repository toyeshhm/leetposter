import type { Metadata, Viewport } from "next";
import type { ReactElement } from "react";
import { Alegreya_Sans, IM_Fell_English } from "next/font/google";
import { ThemeIsland } from "@/client/theme";
import { themeCss } from "@/components/cosmetics/themes";
import "./globals.css";
import "./motion.css";

const fell = IM_Fell_English({
  variable: "--font-fell",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const alegreya = Alegreya_Sans({
  variable: "--font-alegreya",
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const DESCRIPTION = "Four to eight programmers, one hard problem, forty minutes, and one of you is lying.";

export const metadata: Metadata = {
  metadataBase: new URL("https://leetposter.vercel.app"),
  title: { default: "Leetposter", template: "%s | Leetposter" },
  description: DESCRIPTION,
  // No title or description here: each page's own title and description flow into its og: and twitter: tags.
  openGraph: { type: "website", siteName: "Leetposter", url: "/" },
  twitter: { card: "summary_large_image" },
};

/* --bg per mode, resolved to sRGB. viewport-fit=cover lets the stone run under the notch; globals.css pads the safe area back. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#14181a" },
    { media: "(prefers-color-scheme: light)", color: "#f6f7f7" },
  ],
  colorScheme: "light dark",
  viewportFit: "cover",
};

/*
 * Light mode has to land before the first paint or the page flashes the stone and then turns to
 * paper. This runs blocking in <head>, ahead of React: it reads the saved choice and, when the
 * answer is light, writes Ember's light set straight onto <html>. The equipped theme needs a fetch,
 * so ThemeIsland refines this afterwards; until then a light player sits in light Ember rather than
 * in the dark. Generated from themeCss, so the tokens have exactly one source.
 */
const PREPAINT_MODE = `(function(){try{var d=document.documentElement,m=localStorage.getItem("leetposter.mode");
if(m!=="light"&&m!=="dark"&&m!=="system"){m="system"}
var light=m==="light"||(m==="system"&&window.matchMedia("(prefers-color-scheme: light)").matches);
d.dataset.mode=light?"light":"dark";
if(light){d.setAttribute("style",${JSON.stringify(themeCss("theme-ember", "light"))}+"color-scheme:light")}
}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">): ReactElement {
  return (
    <html lang="en" className={`${fell.variable} ${alegreya.variable}`} suppressHydrationWarning>
      <head>
        {/* Generated above from our own tokens; no user input reaches it. */}
        <script dangerouslySetInnerHTML={{ __html: PREPAINT_MODE }} />
      </head>
      <body>
        {children}
        <ThemeIsland />
      </body>
    </html>
  );
}
