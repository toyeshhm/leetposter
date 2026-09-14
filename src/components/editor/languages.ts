import { cpp } from "@codemirror/lang-cpp";
import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import type { Extension } from "@codemirror/state";

export const LANGUAGES = ["python", "cpp", "java", "javascript", "go", "rust"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<Language, string> = {
  python: "Python",
  cpp: "C++",
  java: "Java",
  javascript: "JavaScript",
  go: "Go",
  rust: "Rust",
};

export const DEFAULT_LANGUAGE: Language = "python";

/** The Y.Map value may come from any peer: anything unknown falls back to the default. */
export function parseLanguage(value: unknown): Language {
  return LANGUAGES.find((l) => l === value) ?? DEFAULT_LANGUAGE;
}

export function languageExtension(language: Language): Extension {
  switch (language) {
    case "python":
      return python();
    case "cpp":
      return cpp();
    case "java":
      return java();
    case "javascript":
      return javascript();
    case "go":
      return go();
    case "rust":
      return rust();
  }
}
