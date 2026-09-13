"use client";
import Link from "next/link";
import type { ReactElement } from "react";
import { Button } from "@/components/ui";
import "@/components/game/game.css";

/** Last-resort boundary for the client screens: what broke, in the game's voice, and two ways on. */
export default function ErrorScreen({ error, retry }: { error: Error & { digest?: string }; retry: () => void }): ReactElement {
  return (
    <main className="room">
      <h1>Something broke at the table.</h1>
      <p className="muted">{error.message}</p>
      <p className="fault-actions">
        <Button variant="primary" onClick={retry}>
          Try again
        </Button>
        <Link href="/">Leave the hall</Link>
      </p>
    </main>
  );
}
