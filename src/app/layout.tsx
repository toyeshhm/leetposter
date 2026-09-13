import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Changeling",
  description: "A social-deduction party game for programmers. One hard problem, forty minutes, one liar at the table.",
};

export default function RootLayout({ children }: LayoutProps<"/">): ReactElement {
  return (
    <html lang="en" className={`${fell.variable} ${alegreya.variable}`}>
      <body>{children}</body>
    </html>
  );
}
