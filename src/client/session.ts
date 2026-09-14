"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ApiError, errorMessage, fetchAccount } from "./api";
import { supabaseBrowser } from "./supabaseBrowser";

export interface SessionState {
  status: "loading" | "out" | "in";
  userId: string | null;
  username: string | null;
  /** Supabase access token to send as `Authorization: Bearer` to account routes. */
  accessToken: string | null;
  /** Why the username could not be loaded for a live session; null otherwise. */
  error: string | null;
  signOut: () => Promise<void>;
}

const OUT: Omit<SessionState, "signOut"> = { status: "out", userId: null, username: null, accessToken: null, error: null };

async function signOut(): Promise<void> {
  const { error } = await supabaseBrowser.auth.signOut();
  if (error !== null) throw error;
}

/** Subscribe to the Supabase Auth session in the browser and expose the profile username. */
export function useSession(): SessionState {
  const [state, setState] = useState<Omit<SessionState, "signOut">>({ ...OUT, status: "loading" });

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
        setState({ status: "in", userId: known.id, username: known.username, accessToken: session.access_token, error: null });
        return;
      }
      try {
        const account = await fetchAccount(session.access_token);
        if (current !== session.access_token) return;
        known = { id: account.id, username: account.username };
        setState({ status: "in", userId: account.id, username: account.username, accessToken: session.access_token, error: null });
      } catch (failure: unknown) {
        if (current !== session.access_token) return;
        // A signed-up user who never claimed a name answers 401: signed in, nameless. Anything else is shown.
        const nameless = failure instanceof ApiError && failure.code === "unauthorized";
        setState({ status: "in", userId: session.user.id, username: null, accessToken: session.access_token, error: nameless ? null : errorMessage(failure) });
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

  return { ...state, signOut };
}
