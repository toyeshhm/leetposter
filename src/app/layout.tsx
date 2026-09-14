import type { Metadata, Viewport } from "next";
import type { ReactElement } from "react";
import { Alegreya_Sans, IM_Fell_English } from "next/font/google";
import "./globals.css";

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

/* --bg from globals.css, resolved to sRGB. viewport-fit=cover lets the stone run under the notch; globals.css pads the safe area back. */
export const viewport: Viewport = {
  themeColor: "#14181a",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">): ReactElement {
  return (
    <html lang="en" className={`${fell.variable} ${alegreya.variable}`}>
      <body>{children}</body>
    </html>
  );
}
