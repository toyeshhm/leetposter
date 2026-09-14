"use client";
import Link from "next/link";
import { useState, type ReactElement } from "react";
import { errorMessage } from "@/client/api";
import { useSession } from "@/client/session";

/** "Sign in", "Choose your name" for a nameless sign-in, or the username (to /me) and "Sign out". Renders nothing until the session is known. */
export function SessionNav(): ReactElement | null {
  const session = useSession();
  const [error, setError] = useState<string | null>(null);
  if (session.status === "loading") return null;
  if (session.status === "needs-profile") {
    return (
      <nav className="site-nav" aria-label="Account">
        <Link href="/account">Choose your name</Link>
      </nav>
    );
  }
  if (session.status === "out" || session.username === null) {
    return (
      <nav className="site-nav" aria-label="Account">
        <Link href="/account">Sign in</Link>
        {session.error === null ? null : <span role="alert">{session.error}</span>}
      </nav>
    );
  }
  const signOut = async (): Promise<void> => {
    try {
      await session.signOut();
    } catch (failure: unknown) {
      setError(errorMessage(failure));
    }
  };
  return (
    <nav className="site-nav" aria-label="Account">
      <Link href="/me" className="site-user">
        @{session.username}
      </Link>
      <button type="button" className="site-link" onClick={() => void signOut()}>
        Sign out
      </button>
      {error === null ? null : <span role="alert">{error}</span>}
    </nav>
  );
}
