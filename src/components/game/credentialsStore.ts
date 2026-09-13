import { useSyncExternalStore } from "react";
import { loadCredentials, removeCredentials, saveCredentials, type Credentials } from "@/client/api";

/*
 * localStorage is the external store for the player's credentials. React needs the snapshot to be
 * referentially stable between reads, so the last parsed value is kept and reused while unchanged.
 */
const listeners = new Set<() => void>();
let cached: Credentials | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

function snapshot(code: string): Credentials | null {
  const next = loadCredentials(code);
  if (next !== null && cached !== null && cached.code === next.code && cached.playerId === next.playerId && cached.token === next.token) {
    return cached;
  }
  cached = next;
  return next;
}

/** Saved credentials for this hall: undefined until hydrated, null when there are none. */
export function useCredentials(code: string): Credentials | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => snapshot(code),
    () => undefined,
  );
}

/** Persist a fresh join and wake every subscriber in this tab. */
export function storeCredentials(creds: Credentials): void {
  saveCredentials(creds);
  notify();
}

/** Forget a seat the hall no longer knows, so the join form takes over. */
export function clearCredentials(code: string): void {
  removeCredentials(code);
  notify();
}
