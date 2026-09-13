"use client";
import Link from "next/link";
import { useState, type ReactElement } from "react";
import { assertStorage, errorMessage, joinRoom } from "@/client/api";
import { Button, Field, Frame, Notice } from "@/components/ui";
import { storeCredentials } from "./credentialsStore";

/** Shown at /room/[code] when this browser holds no seat in the hall (yet, or any more: `reason` says why). */
export function JoinForm({ code, reason }: { code: string; reason: string | null }): ReactElement {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const join = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      assertStorage();
      storeCredentials(await joinRoom(code, name.trim()));
    } catch (failure: unknown) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const notice = error ?? reason;
  return (
    <main className="room">
      <Frame title="Take a seat" className="join">
        <p className="room-hall">
          <span className="room-hall-label">Hall</span>
          <span className="room-code">{code}</span>
        </p>
        <p className="join-lead">Give the table a name to know you by.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void join();
          }}
        >
          <Field label="Your name" value={name} maxLength={24} autoComplete="nickname" autoFocus onChange={(e) => { setName(e.target.value); }} />
          <Button type="submit" variant="primary" loading={busy} disabled={name.trim() === ""}>
            Join the hall
          </Button>
          {notice === null ? null : <Notice kind="error">{notice}</Notice>}
        </form>
        <p className="join-leave">
          <Link href="/">Find another hall</Link>
        </p>
      </Frame>
    </main>
  );
}
