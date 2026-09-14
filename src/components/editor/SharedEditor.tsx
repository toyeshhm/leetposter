"use client";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput, indentUnit } from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars, keymap, lineNumbers } from "@codemirror/view";
import { useEffect, useId, useRef, useState, type ReactElement } from "react";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import { errorMessage, type Credentials } from "@/client/api";
import { persistDoc } from "@/client/docPersist";
import { connectDoc } from "@/client/docSync";
import { Notice } from "@/components/ui";
import { DEFAULT_LANGUAGE, LANGUAGES, LANGUAGE_NAMES, languageExtension, parseLanguage, type Language } from "./languages";
import { editorTheme } from "./theme";
import "./editor.css";

export interface SharedEditorProps {
  creds: Credentials;
  playerName: string;
  readOnly: boolean;
  /** Shown above the editor while `readOnly`. */
  reason: string | null;
  /** Called once the saved state is in. Pass a stable function: it is an effect dependency. */
  onReady?: () => void;
}

/*
 * Caret chips: the room's warm palette only (DESIGN.md), never a cold hue. All sit at L 0.78 so the
 * bg-coloured label (theme.ts) keeps well over 4.5:1 on every chip.
 */
const CARET_COLORS = [
  "oklch(0.78 0.155 78)", // amber
  "oklch(0.78 0.13 95)", // ochre
  "oklch(0.78 0.12 55)", // copper
  "oklch(0.78 0.13 40)", // rust
  "oklch(0.78 0.11 25)", // clay
  "oklch(0.78 0.12 130)", // moss
  "oklch(0.78 0.11 110)", // olive
  "oklch(0.78 0.03 85)", // bone
] as const;

/** A stable chip per name, so a player's caret looks the same on every screen. */
function cursorColor(name: string): { color: string; colorLight: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const color = CARET_COLORS[hash % CARET_COLORS.length] ?? CARET_COLORS[0];
  return { color, colorLight: color.replace(")", " / 0.3)") };
}

/**
 * One CodeMirror over one Y.Text ("code") per hall, with the language in a Y.Map ("meta") so the
 * picker syncs too. Realtime carries edits between open tabs; the server keeps the last saved state.
 */
export function SharedEditor({ creds, playerName, readOnly, reason, onReady }: SharedEditorProps): ReactElement {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const metaRef = useRef<Y.Map<string> | null>(null);
  const lock = useRef(new Compartment());
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);
  const [fault, setFault] = useState<string | null>(null);
  const pickerId = useId();

  useEffect(() => {
    const parent = host.current;
    if (parent === null) return;
    const doc = new Y.Doc();
    const text = doc.getText("code");
    const meta = doc.getMap<string>("meta");
    metaRef.current = meta;
    const awareness = new Awareness(doc);
    awareness.setLocalStateField("user", { name: playerName, ...cursorColor(playerName) });
    const languages = new Compartment();
    const view = new EditorView({
      parent,
      // A fresh, empty doc: the saved state and the peers' state arrive as updates, which yCollab replays into the view.
      state: EditorState.create({
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          drawSelection(),
          highlightActiveLine(),
          bracketMatching(),
          indentOnInput(),
          EditorState.tabSize.of(4),
          indentUnit.of("    "),
          keymap.of([...yUndoManagerKeymap, ...defaultKeymap, indentWithTab]),
          editorTheme,
          languages.of(languageExtension(DEFAULT_LANGUAGE)),
          lock.current.of([]),
          yCollab(text, awareness),
        ],
      }),
    });
    viewRef.current = view;
    const onMeta = (): void => {
      const next = parseLanguage(meta.get("language"));
      setLanguage(next);
      view.dispatch({ effects: languages.reconfigure(languageExtension(next)) });
    };
    meta.observe(onMeta);
    const fail = (error: unknown): void => {
      setFault(errorMessage(error));
    };
    const sync = connectDoc(creds.code, doc, awareness, fail);
    const store = persistDoc(
      creds,
      doc,
      () => {
        setReady(true);
        onReady?.();
      },
      fail,
    );
    return () => {
      store.destroy();
      sync.destroy();
      meta.unobserve(onMeta);
      view.destroy();
      awareness.destroy();
      doc.destroy();
      viewRef.current = null;
      metaRef.current = null;
    };
  }, [creds, playerName, onReady]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: lock.current.reconfigure([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]) });
  }, [readOnly]);

  return (
    <section className="editor" aria-label="The shared editor">
      <div className="editor-bar">
        <h2 className="section-title">The file</h2>
        <div className="field">
          <label className="field-label" htmlFor={pickerId}>
            Language
          </label>
          <select
            id={pickerId}
            className="field-control"
            value={language}
            disabled={readOnly || !ready}
            onChange={(e) => metaRef.current?.set("language", e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_NAMES[l]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {reason === null ? null : <p className="editor-reason">{reason}</p>}
      {fault === null ? null : <Notice kind="error">{fault}</Notice>}
      <div ref={host} className="editor-body" data-locked={readOnly} aria-busy={!ready} />
    </section>
  );
}
