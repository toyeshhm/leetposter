"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ApiError, createAccount, errorMessage, fetchAccount } from "./api";
import { supabaseBrowser } from "./supabaseBrowser";

export interface SessionState {
  /** "needs-profile": signed in with Supabase Auth but no name chosen yet (the profile row is missing). */
  status: "loading" | "out" | "needs-profile" | "in";
  userId: string | null;
  username: string | null;
  /** The address the account signs in with, straight off the session; null for a guest. */
  email: string | null;
  /** Supabase access token to send as `Authorization: Bearer` to account routes. */
  accessToken: string | null;
  /** Why the username could not be loaded for a live session; null otherwise. */
  error: string | null;
  signOut: () => Promise<void>;
  /** Claim a username for the signed-in account (status "needs-profile"), then the session is "in". */
  createProfile: (username: string) => Promise<void>;
}

const OUT: Omit<SessionState, "signOut" | "createProfile"> = { status: "out", userId: null, username: null, email: null, accessToken: null, error: null };

async function signOut(): Promise<void> {
  const { error } = await supabaseBrowser.auth.signOut();
  if (error !== null) throw error;
}

/** Subscribe to the Supabase Auth session in the browser and expose the profile username. */
export function useSession(): SessionState {
  const [state, setState] = useState<Omit<SessionState, "signOut" | "createProfile">>({ ...OUT, status: "loading" });

  useEffect(() => {
    let current: string | null = null;
    // The username once loaded for a user id: a refreshed token for the same user needs no second fetch.
    let known: { id: string; username: string } | null = null;
    const absorb = async (session: Session | null): Promise<void> => {
      if (session === null) {
        current = null;
        known = null;
        setState(OUT);
        return;
      }
      if (session.access_token === current) return;
      current = session.access_token;
      if (known !== null && known.id === session.user.id) {
        setState({ status: "in", userId: known.id, username: known.username, email: session.user.email ?? null, accessToken: session.access_token, error: null });
        return;
      }
      try {
        const account = await fetchAccount(session.access_token);
        if (current !== session.access_token) return;
        known = { id: account.id, username: account.username };
        setState({ status: "in", userId: account.id, username: account.username, email: session.user.email ?? null, accessToken: session.access_token, error: null });
      } catch (failure: unknown) {
        if (current !== session.access_token) return;
        // No profile row yet (a sign-up that never reached the name step) answers 404: signed in, nameless. Anything else is shown.
        const nameless = failure instanceof ApiError && failure.code === "not-found";
        setState({
          status: nameless ? "needs-profile" : "in",
          userId: session.user.id,
          username: null,
          email: session.user.email ?? null,
          accessToken: session.access_token,
          error: nameless ? null : errorMessage(failure),
        });
      }
    };
    void supabaseBrowser.auth.getSession().then(({ data }) => absorb(data.session));
    const { data } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      void absorb(session);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const createProfile = async (username: string): Promise<void> => {
    if (state.accessToken === null) throw new Error("Sign in first.");
    const account = await createAccount(username, state.accessToken);
    setState({ status: "in", userId: account.id, username: account.username, email: state.email, accessToken: state.accessToken, error: null });
    // Every other useSession (the header's nav) fetched the profile before it existed; a fresh token makes them look again.
    const { error } = await supabaseBrowser.auth.refreshSession();
    if (error !== null) throw error;
  };

  return { ...state, signOut, createProfile };
}
