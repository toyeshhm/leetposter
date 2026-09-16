"use client";
import Link from "next/link";
import { useState, type ReactElement } from "react";
import { call, errorMessage } from "@/client/api";
import { useSession } from "@/client/session";
import { supabaseBrowser } from "@/client/supabaseBrowser";
import { useMode, type ModeChoice } from "@/client/theme";
import { Button, Field, Frame, Notice } from "@/components/ui";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const MIN_PASSWORD = 8;

const MODE_LABELS: Readonly<Record<ModeChoice, string>> = {
  dark: "Dark",
  light: "Light",
  system: "Follow the system",
};

/** Everything a signed-in player can change about themselves, and the one thing a guest can. */
export function SettingsScreen(): ReactElement {
  const session = useSession();
  if (session.status === "loading") return <p className="muted">Reading your seat.</p>;
  return (
    <>
      <Appearance />
      {session.status === "in" ? (
        <>
          <ChangeName current={session.username ?? ""} token={session.accessToken ?? ""} />
          <ChangePassword email={session.email} />
          <TheDoor onSignOut={session.signOut} />
        </>
      ) : (
        <Frame title="Your account">
          <p className="prose muted">
            Appearance is kept in this browser, so it works whether or not you sign in. Everything else on this page needs an account.
          </p>
          <p className="settings-actions">
            <Link href="/account">Sign in or make an account</Link>
          </p>
        </Frame>
      )}
    </>
  );
}

/** Light, dark, or whatever the machine is doing. Free, and kept per browser like the OS setting it follows. */
function Appearance(): ReactElement {
  const { choice, setChoice } = useMode();
  return (
    <Frame title="Appearance">
      <fieldset className="settings-modes">
        <legend className="settings-legend">Colour scheme</legend>
        {(["light", "dark", "system"] as const).map((value) => (
          <label key={value} className="settings-mode">
            <input
              type="radio"
              name="mode"
              value={value}
              checked={choice === value}
              onChange={() => {
                setChoice(value);
              }}
            />
            <span>{MODE_LABELS[value]}</span>
          </label>
        ))}
      </fieldset>
      <p className="settings-note muted">
        Dark is a white-line woodcut on stone; light is the same block printed on paper. A theme you have equipped keeps its colours in both.
      </p>
    </Frame>
  );
}

/** Rename the account. Every screen joins the name on the account id, so a rename follows you everywhere. */
function ChangeName({ current, token }: { current: string; token: string }): ReactElement {
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const trimmed = name.trim();
  const bad = trimmed !== "" && !USERNAME_RE.test(trimmed) ? "Three to twenty lowercase letters, digits or underscores." : undefined;
  const ready = bad === undefined && trimmed !== "" && trimmed !== current;

  const submit = (): void => {
    setBusy(true);
    setFailed(null);
    setDone(false);
    void call<{ username: string }>("/api/account", { method: "PATCH", body: JSON.stringify({ username: trimmed }) }, token)
      .then(() => {
        setDone(true);
      })
      .catch((error: unknown) => {
        setFailed(errorMessage(error));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  return (
    <Frame title="Your name">
      <form
        className="settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) submit();
        }}
      >
        <Field
          label="Username"
          name="username"
          value={name}
          autoComplete="username"
          spellCheck={false}
          error={bad}
          hint="Shown on the roster, the leaderboard and your ledger."
          onChange={(e) => {
            setName(e.target.value);
            setDone(false);
          }}
        />
        {failed !== null ? <Notice kind="error">{failed}</Notice> : null}
        {done ? <Notice>Your name is now {trimmed}.</Notice> : null}
        <Button type="submit" variant="primary" loading={busy} disabled={!ready}>
          Change name
        </Button>
      </form>
    </Frame>
  );
}

/**
 * Change the password. The current one is checked by actually signing in with it rather than
 * trusting the open session: a tab left unattended should not be enough to take the account.
 */
function ChangePassword({ email }: { email: string | null }): ReactElement {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const short = next !== "" && next.length < MIN_PASSWORD ? `At least ${String(MIN_PASSWORD)} characters.` : undefined;
  const same = next !== "" && next === current ? "That is the password you already have." : undefined;
  const bad = short ?? same;
  const ready = bad === undefined && current !== "" && next !== "" && email !== null;

  const submit = async (): Promise<void> => {
    setBusy(true);
    setFailed(null);
    setDone(false);
    try {
      if (email === null) throw new Error("This account has no email address to check against.");
      const check = await supabaseBrowser.auth.signInWithPassword({ email, password: current });
      if (check.error !== null) throw new Error("That is not your current password.", { cause: check.error });
      const changed = await supabaseBrowser.auth.updateUser({ password: next });
      if (changed.error !== null) throw new Error(changed.error.message, { cause: changed.error });
      setCurrent("");
      setNext("");
      setDone(true);
    } catch (error: unknown) {
      setFailed(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Frame title="Your password">
      <form
        className="settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) void submit();
        }}
      >
        <p className="settings-note muted">Signed in as {email ?? "an account with no email"}.</p>
        <Field
          label="Current password"
          name="current-password"
          type="password"
          value={current}
          autoComplete="current-password"
          onChange={(e) => {
            setCurrent(e.target.value);
            setDone(false);
          }}
        />
        <Field
          label="New password"
          name="new-password"
          type="password"
          value={next}
          autoComplete="new-password"
          error={bad}
          hint={`At least ${String(MIN_PASSWORD)} characters.`}
          onChange={(e) => {
            setNext(e.target.value);
            setDone(false);
          }}
        />
        {failed !== null ? <Notice kind="error">{failed}</Notice> : null}
        {done ? <Notice>Your password is changed.</Notice> : null}
        <Button type="submit" variant="primary" loading={busy} disabled={!ready}>
          Change password
        </Button>
      </form>
    </Frame>
  );
}

function TheDoor({ onSignOut }: { onSignOut: () => Promise<void> }): ReactElement {
  const [busy, setBusy] = useState(false);
  return (
    <Frame title="The door">
      <p className="settings-note muted">Signing out leaves any hall you are sitting in; the seat itself is kept in this browser.</p>
      <Button
        variant="secondary"
        loading={busy}
        onClick={() => {
          setBusy(true);
          void onSignOut().finally(() => {
            setBusy(false);
          });
        }}
      >
        Sign out
      </Button>
    </Frame>
  );
}
