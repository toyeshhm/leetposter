import { useSyncExternalStore } from "react";

function subscribe(onTick: () => void): () => void {
  const id = setInterval(onTick, 250);
  return () => {
    clearInterval(id);
  };
}

/** The server clock, ticking once a second (epoch ms, whole seconds). Null before hydration. */
export function useServerNow(clockOffset: number): number | null {
  return useSyncExternalStore(
    subscribe,
    () => Math.floor((Date.now() + clockOffset) / 1000) * 1000,
    () => null,
  );
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** mm:ss for a duration in milliseconds, rounded up to the second. */
export function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
