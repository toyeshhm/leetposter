"use client";
import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent, type ReactElement } from "react";
import { assertStorage, createRoom, errorMessage, joinRoom, saveCredentials } from "@/client/api";
import { Button, Field, Frame, Notice } from "@/components/ui";
import { errorProp } from "./util";
import "./lobby.css";

/** Room codes: five letters, no I or O (README). */
const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/;
const NAME_MAX = 24;

function HallForm({ mode }: { mode: "create" | "join" }): ReactElement {
  const router = useRouter();
  const [name, setName] = useState("");
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
      const creds = mode === "create" ? await createRoom(trimmed) : await joinRoom(code, trimmed);
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
            setName(e.target.value);
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
              setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5));
            }}
            disabled={busy}
            {...errorProp(codeError)}
          />
        ) : null}
        <div className="entry-actions">
          <Button type="submit" variant={mode === "create" ? "primary" : "secondary"} loading={busy}>
            {mode === "create" ? "Open the hall" : "Take a seat"}
          </Button>
        </div>
        {error === null ? null : <Notice kind="error">{error}</Notice>}
      </form>
    </Frame>
  );
}

/** The two ways in: open a new hall, or join one by code. */
export function Entry(): ReactElement {
  return (
    <div className="entry">
      <HallForm mode="create" />
      <HallForm mode="join" />
    </div>
  );
}
