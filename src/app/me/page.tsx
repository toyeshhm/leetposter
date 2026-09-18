import type { Metadata } from "next";
import type { ReactElement } from "react";
import { HistoryScreen } from "@/components/history/HistoryScreen";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import "@/components/history/history.css";

export const metadata: Metadata = { title: "Your record" };

/** The ledger: the signed-in player's halls and achievements. */
export default function MePage(): ReactElement {
  return (
    <>
      <SiteHeader />
      <main className="history-page">
        <HistoryScreen />
      </main>
      <SiteFooter />
    </>
  );
}
