import type { Metadata } from "next";
import type { ReactElement } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { StoreScreen } from "@/components/store/StoreScreen";

export const metadata: Metadata = { title: "The store", description: "Faces, frames, titles and themes, bought with candles. Nothing here changes the game." };

/** The shelf: every cosmetic, what it costs, and what you already hold. */
export default function StorePage(): ReactElement {
  return (
    <>
      <SiteHeader />
      <main className="store-page">
        <StoreScreen />
      </main>
      <SiteFooter />
    </>
  );
}
