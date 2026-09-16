import type { Metadata } from "next";
import type { ReactElement } from "react";
import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { SiteHeader } from "@/components/site/SiteHeader";
import "@/components/leaderboard/leaderboard.css";
import "@/components/settings/settings.css";

export const metadata: Metadata = { title: "Settings", description: "Your name, your password, and how the page is lit." };

/** Everything about you rather than about a hall. */
export default function SettingsPage(): ReactElement {
  return (
    <>
      <SiteHeader />
      <main className="board-page">
        <h1>Settings</h1>
        <SettingsScreen />
      </main>
    </>
  );
}
