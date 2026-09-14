import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { applyAwarenessUpdate, encodeAwarenessUpdate, type Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import { z } from "zod";
import { supabaseBrowser } from "./supabaseBrowser";

/** Transaction origin for anything that arrived over the wire or from the saved state; local edits carry any other origin. */
export const REMOTE = "remote";

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

const updateMsg = z.object({ u: z.string() });
const awarenessMsg = z.object({ a: z.string() });
const syncRequestMsg = z.object({ from: z.number() });
const syncResponseMsg = z.object({ to: z.number(), state: z.string() });

/**
 * Share `doc` and `awareness` with everyone else in the hall over one Supabase Realtime broadcast
 * channel. Joining sends the local state and asks the room for theirs; every peer answers with a
 * full state (idempotent to apply). Presence needs no pulse of its own: Awareness renews the local
 * state every 15 s (a "local" update, forwarded here) and drops peers silent for 30 s.
 * ponytail: full-state sync on join, no state vectors; the document is one file a few KB long.
 */
export function connectDoc(code: string, doc: Y.Doc, awareness: Awareness, onError: (error: Error) => void): { destroy(): void } {
  const channel = supabaseBrowser.channel(`doc:${code}`, { config: { broadcast: { self: false } } });
  let joined = false;
  const send = (event: string, payload: Record<string, unknown>): void => {
    if (joined) void channel.send({ type: "broadcast", event, payload });
  };
  const sendAwareness = (): void => {
    send("awareness", { a: toBase64(encodeAwarenessUpdate(awareness, [doc.clientID])) });
  };
  const onUpdate = (update: Uint8Array, origin: unknown): void => {
    if (origin !== REMOTE) send("update", { u: toBase64(update) });
  };
  const onAwareness = (_change: unknown, origin: unknown): void => {
    if (origin === "local") sendAwareness();
  };
  doc.on("update", onUpdate);
  awareness.on("update", onAwareness);
  channel
    .on("broadcast", { event: "update" }, ({ payload }) => {
      Y.applyUpdate(doc, fromBase64(updateMsg.parse(payload).u), REMOTE);
    })
    .on("broadcast", { event: "awareness" }, ({ payload }) => {
      applyAwarenessUpdate(awareness, fromBase64(awarenessMsg.parse(payload).a), REMOTE);
    })
    .on("broadcast", { event: "sync-request" }, ({ payload }) => {
      send("sync-response", { to: syncRequestMsg.parse(payload).from, state: toBase64(Y.encodeStateAsUpdate(doc)) });
      sendAwareness();
    })
    .on("broadcast", { event: "sync-response" }, ({ payload }) => {
      const message = syncResponseMsg.parse(payload);
      if (message.to === doc.clientID) Y.applyUpdate(doc, fromBase64(message.state), REMOTE);
    })
    .subscribe((status, error) => {
      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        joined = true;
        send("update", { u: toBase64(Y.encodeStateAsUpdate(doc)) });
        send("sync-request", { from: doc.clientID });
        sendAwareness();
      } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR || status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
        joined = false;
        onError(error ?? new Error(`realtime channel doc:${code}: ${status}`));
      }
    });
  return {
    destroy(): void {
      doc.off("update", onUpdate);
      // Tell the room this caret is gone before the channel closes; the null state is the wire's "removed".
      awareness.setLocalState(null);
      awareness.off("update", onAwareness);
      void supabaseBrowser.removeChannel(channel);
    },
  };
}
