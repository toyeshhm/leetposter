import type { Metadata } from "next";
import type { ReactElement } from "react";
import { PassScreen } from "@/components/pass/PassScreen";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export const metadata: Metadata = { title: "The pass", description: "This season's thirty tiers, both tracks, and the quests that feed them." };

/** The season pass: XP, the tier track, and the quest board under it. */
export default function PassPage(): ReactElement {
  return (
    <>
      <SiteHeader />
      <main className="pass-page">
        <PassScreen />
      </main>
      <SiteFooter />
    </>
  );
}
