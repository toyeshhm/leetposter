"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type SyntheticEvent, type ReactElement } from "react";
import { assertStorage, createRoom, errorMessage, joinRoom, saveCredentials } from "@/client/api";
import { useSession } from "@/client/session";
import { Button, Field, Frame, Notice } from "@/components/ui";
import { errorProp } from "./util";
import "./lobby.css";

/** Room codes: five letters, no I or O (README). */
const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/;
const NAME_MAX = 24;

interface HallFormProps {
  mode: "create" | "join";
  /** The signed-in username, prefilled as the name; null for guests. */
  username: string | null;
  /** Sent with the request so the seat is attached to the account. */
  accessToken: string | null;
  /** True until the browser knows whether it is signed in: a seat taken before that would be a guest's. */
  sessionLoading: boolean;
}

function HallForm({ mode, username, accessToken, sessionLoading }: HallFormProps): ReactElement {
  const router = useRouter();
  // Null until the player types: the signed-in username shows until then, no effect needed.
  const [typed, setTyped] = useState<string | null>(null);
  const name = typed ?? username ?? "";
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const nameError = touched && trimmed === "" ? "The table needs something to call you." : undefined;
  const codeError = touched && mode === "join" && !CODE_RE.test(code) ? "A hall code is five letters." : undefined;

  const submit = async (): Promise<void> => {
    setTouched(true);
    if (trimmed === "" || (mode === "join" && !CODE_RE.test(code))) return;
    setBusy(true);
    setError(null);
    try {
      // Probe storage before the seat exists on the server, or a blocked browser leaves a ghost at the table.
      assertStorage();
      const token = accessToken ?? undefined;
      const creds = mode === "create" ? await createRoom(trimmed, token) : await joinRoom(code, trimmed, token);
      saveCredentials(creds);
      router.push(`/room/${creds.code}`);
    } catch (e: unknown) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const onSubmit = (e: SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    void submit();
  };

  return (
    <Frame title={mode === "create" ? "Create a hall" : "Join a hall"}>
      <form className="entry-form" onSubmit={onSubmit} noValidate>
        <Field
          label="Your name"
          name={`${mode}-name`}
          autoComplete="nickname"
          maxLength={NAME_MAX}
          value={name}
          onChange={(e) => {
            setTyped(e.target.value);
          }}
          disabled={busy}
          {...errorProp(nameError)}
        />
        {mode === "join" ? (
          <Field
            label="Hall code"
            name="code"
            hint="Five letters, from whoever opened the hall."
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={5}
            value={code}
            onChange={(e) => {
              setCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z]/g, "")
                  .slice(0, 5),
              );
            }}
            disabled={busy}
            {...errorProp(codeError)}
          />
        ) : null}
        <div className="entry-actions">
          <Button type="submit" variant={mode === "create" ? "primary" : "secondary"} loading={busy} disabled={sessionLoading}>
            {mode === "create" ? "Open the hall" : "Take a seat"}
          </Button>
        </div>
        {error === null ? null : <Notice kind="error">{error}</Notice>}
      </form>
    </Frame>
  );
}

/** The two ways in: open a new hall, or join one by code. A sign-in with no name yet takes a guest seat, and is told so. */
export function Entry(): ReactElement {
  const session = useSession();
  // Only a named account is attached to the seat: the server refuses a nameless token.
  const accessToken = session.status === "in" ? session.accessToken : null;
  return (
    <div className="entry">
      {session.status === "needs-profile" ? <NamelessNotice /> : null}
      <HallForm mode="create" username={session.username} accessToken={accessToken} sessionLoading={session.status === "loading"} />
      <HallForm mode="join" username={session.username} accessToken={accessToken} sessionLoading={session.status === "loading"} />
    </div>
  );
}

/** One line for a signed-in player who never chose a name: seats taken now are a guest's. */
export function NamelessNotice(): ReactElement {
  return (
    <Notice className="entry-notice">
      You are signed in but have no name yet, so this hall will not be remembered. <Link href="/account">Choose your name</Link> first.
    </Notice>
  );
}
