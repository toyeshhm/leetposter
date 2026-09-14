import type { Metadata } from "next";
import type { ReactElement } from "react";
import { FriendsScreen } from "@/components/friends/FriendsScreen";
import { SiteHeader } from "@/components/site/SiteHeader";
import "@/components/friends/friends.css";

export const metadata: Metadata = { title: "Your friends, Leetposter" };

/** The company you keep: requests, friends, and their recent halls. */
export default function FriendsPage(): ReactElement {
  return (
    <>
      <SiteHeader />
      <main className="friends-page">
        <h1>Friends</h1>
        <FriendsScreen />
      </main>
    </>
  );
}
