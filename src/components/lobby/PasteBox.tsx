"use client";
import { useState, type ReactElement } from "react";
import { call, errorMessage } from "@/client/api";
import { Button, Notice, TextareaField } from "@/components/ui";
import type { Problem } from "@/game/types";
import { isQuery } from "@/server/parse/leetcode";
import type { ParseResponse } from "@/server/parse/types";
import "./lobby.css";

interface Note {
  kind: "info" | "error";
  text: string;
}

const BY: Record<ParseResponse["source"], string> = { leetcode: "Fetched from LeetCode.", parser: "Sorted by the parser.", llm: "Sorted by the model." };

/** A whole page that came back as "leetcode" was parsed, then checked. */
const by = (r: ParseResponse, text: string): string => (r.source === "leetcode" && !isQuery(text) ? "Sorted by the parser, checked against LeetCode." : BY[r.source]);

/** One box for the whole LeetCode page, or just its title or number; the server sorts it and `onSorted` fills the form. */
export function PasteBox({ onSorted, disabled }: { onSorted: (problem: Problem) => void; disabled: boolean }): ReactElement {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [llmAvailable, setLlmAvailable] = useState(true);
  const [note, setNote] = useState<Note | null>(null);

  const sort = async (mode: "auto" | "llm"): Promise<void> => {
    setBusy(true);
    setNote(null);
    try {
      const result = await call<ParseResponse>("/api/parse", { method: "POST", body: JSON.stringify({ text, mode }) });
      setLlmAvailable(result.llmAvailable);
      onSorted(result.problem);
      setNote({ kind: result.confidence === "low" ? "error" : "info", text: [by(result, text.trim()), ...result.warnings].join(" ") });
    } catch (e: unknown) {
      setNote({ kind: "error", text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const off = disabled || busy;
  return (
    <div className="lobby-stack">
      <TextareaField
        label="Problem"
        name="paste"
        hint="Paste the whole LeetCode page, or just its title or number."
        rows={6}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
        }}
        disabled={off}
      />
      <div className="lobby-actions">
        <Button variant="primary" loading={busy} disabled={disabled || text.trim() === ""} onClick={() => void sort("auto")}>
          Sort it out
        </Button>
        {llmAvailable ? (
          <Button variant="secondary" disabled={off || text.trim() === ""} onClick={() => void sort("llm")}>
            Sort with the model
          </Button>
        ) : null}
      </div>
      {note === null ? null : <Notice kind={note.kind}>{note.text}</Notice>}
    </div>
  );
}
