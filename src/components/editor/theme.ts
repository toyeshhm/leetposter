import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

/* The editor in the house style: near-black surface, bone ink, the candle only on the caret, the active line and the selection. Tokens from globals.css. */
const chrome = EditorView.theme(
  {
    "&": { height: "100%", backgroundColor: "var(--surface)", color: "var(--ink)" },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": { fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", lineHeight: "1.5", overflow: "auto" },
    ".cm-content": { padding: "var(--space-3) 0", caretColor: "var(--accent)" },
    ".cm-line": { padding: "0 var(--space-3)" },
    ".cm-gutters": { backgroundColor: "var(--bg)", color: "var(--muted)", border: "none", borderRight: "var(--rule) solid var(--line)" },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 var(--space-2) 0 var(--space-3)", minWidth: "3ch" },
    ".cm-activeLine": { backgroundColor: "color-mix(in oklch, var(--accent) 9%, transparent)" },
    ".cm-activeLineGutter": { backgroundColor: "color-mix(in oklch, var(--accent) 14%, transparent)", color: "var(--ink)" },
    ".cm-cursor, .cm-dropCursor": { borderLeft: "2px solid var(--accent)" },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "color-mix(in oklch, var(--accent) 30%, transparent)",
    },
    ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": { backgroundColor: "color-mix(in oklch, var(--ink) 18%, transparent)", outline: "none" },
    ".cm-selectionMatch": { backgroundColor: "color-mix(in oklch, var(--ink) 10%, transparent)" },
    "&.cm-editor .cm-content[contenteditable=false]": { cursor: "default" },
    ".cm-ySelectionInfo": { fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", padding: "0 var(--space-1)", opacity: "1", color: "var(--bg)" },
  },
  { dark: true },
);

/* Restrained: the candle marks keywords, everything else is ink or muted. */
const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword, tags.definitionKeyword, tags.modifier], color: "var(--accent-deep)" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment], color: "var(--muted)", fontStyle: "italic" },
  { tag: [tags.string, tags.special(tags.string), tags.regexp, tags.character], color: "var(--success-ink)" },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: "var(--danger-ink)" },
  { tag: [tags.function(tags.variableName), tags.function(tags.definition(tags.variableName)), tags.definition(tags.variableName)], fontWeight: "500" },
  { tag: [tags.typeName, tags.className, tags.namespace], color: "var(--ink)", textDecoration: "underline", textDecorationThickness: "1px", textUnderlineOffset: "0.15em" },
  { tag: [tags.invalid], color: "var(--danger-ink)", textDecoration: "line-through" },
]);

export const editorTheme: Extension = [chrome, syntaxHighlighting(highlight)];
