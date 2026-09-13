"use client";
import { useCallback, useEffect, useState } from "react";
import type { Action, PlayerView } from "@/game/types";
import { ApiError, act, errorMessage, fetchView, type Credentials } from "./api";

export const POLL_MS = 1500;

export interface RoomHandle {
  view: PlayerView | null;
  /** The last failed request; cleared by the next successful one. */
  error: ApiError | null;
  /** Milliseconds to add to Date.now() to approximate the server clock. */
  clockOffset: number;
  send: (action: Action) => Promise<void>;
  busy: boolean;
}

const toApiError = (e: unknown): ApiError => (e instanceof ApiError ? e : new ApiError("unknown", errorMessage(e)));

/**
 * Polls the personalized view every POLL_MS and exposes `send` for actions.
 * ponytail: polling, not realtime. Swap for Supabase Realtime if 5 friends ever notice.
 */
export function useRoom(creds: Credentials | null): RoomHandle {
  const [view, setView] = useState<PlayerView | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);

  const absorb = useCallback((v: PlayerView) => {
    setView(v);
    setClockOffset(v.clock.serverNow - Date.now());
    setError(null);
  }, []);

  useEffect(() => {
    if (creds === null) return;
    // Scoped to this effect run: a loop from a previous run (other creds, StrictMode) must stop for good.
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const loop = async (): Promise<void> => {
      try {
        const next = await fetchView(creds);
        if (alive) absorb(next);
      } catch (e: unknown) {
        if (alive) setError(toApiError(e));
      }
      if (alive) timer = setTimeout(() => void loop(), POLL_MS);
    };
    void loop();
    return () => {
      alive = false;
      if (timer !== null) clearTimeout(timer);
    };
  }, [creds, absorb]);

  const send = useCallback(
    async (action: Action): Promise<void> => {
      if (creds === null) throw new ApiError("unknown", "no credentials");
      setBusy(true);
      try {
        absorb(await act(creds, action));
      } catch (e: unknown) {
        const failure = toApiError(e);
        setError(failure);
        throw failure;
      } finally {
        setBusy(false);
      }
    },
    [creds, absorb],
  );

  return { view, error, clockOffset, send, busy };
}
