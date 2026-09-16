import type { Metadata } from "next";
import type { ReactElement } from "react";
import { HallsBoard } from "@/components/halls/HallsBoard";
import { SiteHeader } from "@/components/site/SiteHeader";

export const metadata: Metadata = { title: "Halls", description: "Listed halls that moved in the last fifteen minutes. Watch any of them." };

/** The halls board: every listed hall still moving, with a way in or a way to watch. */
export default function HallsPage(): ReactElement {
  return (
    <>
      <SiteHeader />
      <main className="board-page">
        <h1>Halls</h1>
        <HallsBoard />
      </main>
    </>
  );
}
