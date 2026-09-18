"use client";
import Link from "next/link";
import { useState, type ReactElement, type SyntheticEvent } from "react";
import { errorMessage } from "@/client/api";
import { useSession } from "@/client/session";
import { supabaseBrowser } from "@/client/supabaseBrowser";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button, Field, Frame, Notice } from "@/components/ui";
import "@/components/site/site.css";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabaseBrowser.auth.signInWithPassword({
    email,
    password,
  });
  if (error !== null)
    throw new Error("The door did not open: check the email and password.", {
      cause: error,
    });
}

/** Sign up; the session then lands in "needs-profile" and the name step below claims the username. */
async function signUp(email: string, password: string): Promise<void> {
  const { data, error } = await supabaseBrowser.auth.signUp({
    email,
    password,
  });
  if (error !== null)
    throw new Error(`The scribe refused the entry: ${error.message}`, {
      cause: error,
    });
  if (data.session === null) throw new Error("Confirm the email the scribe sent you, then sign in.");
}

function AuthForm(): ReactElement {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = email.trim() !== "" && password !== "";

  const onSubmit = (e: SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const work = mode === "in" ? signIn(email.trim(), password) : signUp(email.trim(), password);
    work
      .catch((failure: unknown) => {
        setError(errorMessage(failure));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  return (
    <Frame title={mode === "in" ? "Sign in" : "Sign up"}>
      <form className="account-form" onSubmit={onSubmit} noValidate>
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          disabled={busy}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          disabled={busy}
        />
        <div className="account-switch">
          <Button type="submit" variant="primary" loading={busy} disabled={!ready}>
            {mode === "in" ? "Sign in" : "Sign up"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setError(null);
            }}
            disabled={busy}
          >
            {mode === "in" ? "New here? Sign up" : "Have a name? Sign in"}
          </Button>
        </div>
        {error === null ? null : <Notice kind="error">{error}</Notice>}
      </form>
    </Frame>
  );
}

/** The name step: a signed-in account with no profile row yet, whether fresh from sign-up or an older sign-up that never got here. */
function ChooseName({ createProfile }: { createProfile: (username: string) => Promise<void> }): ReactElement {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usernameError = username !== "" && !USERNAME_RE.test(username) ? "3 to 20 lowercase letters, digits or underscores." : error;

  const onSubmit = (e: SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    createProfile(username)
      .catch((failure: unknown) => {
        setError(errorMessage(failure));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  return (
    <Frame title="Choose your name">
      <form className="account-form" onSubmit={onSubmit} noValidate>
        <p>You are signed in, but the hall has no name for you yet. Halls are remembered under it.</p>
        <Field
          label="Username"
          name="username"
          hint="3 to 20 lowercase letters, digits or underscores. How the table will know you across halls."
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value.toLowerCase());
            setError(null);
          }}
          disabled={busy}
          {...(usernameError === null ? {} : { error: usernameError })}
        />
        <div className="account-switch">
          <Button type="submit" variant="primary" loading={busy} disabled={!USERNAME_RE.test(username)}>
            Take the name
          </Button>
        </div>
      </form>
    </Frame>
  );
}

function SignedIn({ username, signOut }: { username: string; signOut: () => Promise<void> }): ReactElement {
  const [error, setError] = useState<string | null>(null);
  return (
    <Frame title="Your seat">
      <p>
        Signed in as <strong className="site-user">@{username}</strong>.
      </p>
      <p className="account-links">
        <Link href="/me">Your halls</Link>
        <Link href="/friends">Your friends</Link>
      </p>
      <Button
        onClick={() => {
          signOut().catch((failure: unknown) => {
            setError(errorMessage(failure));
          });
        }}
      >
        Sign out
      </Button>
      {error === null ? null : <Notice kind="error">{error}</Notice>}
    </Frame>
  );
}

export default function AccountPage(): ReactElement {
  const session = useSession();
  return (
    <>
      <SiteHeader />
      <main className="account">
        <h1>Accounts</h1>
        <p className="muted">Nobody needs one to play. With one, the hall remembers your games.</p>
        {session.status === "loading" ? null : session.status === "needs-profile" ? (
          <ChooseName createProfile={session.createProfile} />
        ) : session.username === null ? (
          <AuthForm />
        ) : (
          <SignedIn username={session.username} signOut={session.signOut} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
