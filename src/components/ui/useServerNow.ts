"use client";
import { useSyncExternalStore } from "react";

/*
 * The ticking clock lives apart from the mm:ss formatter on purpose. `mmss` is pure and is wanted by
 * server components (the landing prints a round's timings); `useServerNow` is a hook and drags
 * whatever imports it into the client graph. Keeping them in one module meant one pure import from
 * a server component pulled useSyncExternalStore in behind it and failed the build.
 */

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
