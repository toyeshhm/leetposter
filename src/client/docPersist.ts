import * as Y from "yjs";
import { loadDoc, saveDoc, type Credentials } from "./api";
import { REMOTE, fromBase64, toBase64 } from "./docSync";

export const SAVE_DEBOUNCE_MS = 2000;

/**
 * Load the hall's last saved editor state into `doc`, then save the full state 2 s after the last
 * local change and on the way out of the tab. Only local edits mark the document dirty, so a
 * read-only seat never writes. Failures go to `onError` and the state stays dirty for the next try.
 */
export function persistDoc(creds: Credentials, doc: Y.Doc, onLoaded: () => void, onError: (error: unknown) => void): { destroy(): void } {
  let alive = true;
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const save = async (keepalive: boolean): Promise<void> => {
    if (!dirty) return;
    dirty = false;
    try {
      await saveDoc(creds, toBase64(Y.encodeStateAsUpdate(doc)), keepalive);
    } catch (error: unknown) {
      dirty = true;
      onError(error);
    }
  };
  const onUpdate = (_update: Uint8Array, origin: unknown): void => {
    if (origin === REMOTE) return;
    dirty = true;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => void save(false), SAVE_DEBOUNCE_MS);
  };
  const onUnload = (): void => {
    void save(true);
  };
  doc.on("update", onUpdate);
  window.addEventListener("beforeunload", onUnload);
  loadDoc(creds).then(({ doc: saved }) => {
    if (!alive) return;
    if (saved !== null) Y.applyUpdate(doc, fromBase64(saved), REMOTE);
    onLoaded();
  }, onError);
  return {
    destroy(): void {
      alive = false;
      doc.off("update", onUpdate);
      window.removeEventListener("beforeunload", onUnload);
      if (timer !== null) clearTimeout(timer);
      void save(false);
    },
  };
}
