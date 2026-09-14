"use client";
import { useState, type ReactElement } from "react";
import { errorMessage } from "@/client/api";
import { Button, Notice, TextareaField } from "@/components/ui";
import type { Problem } from "@/game/types";
import type { ParseResponse } from "@/server/parse/types";
import "./lobby.css";

interface Note {
  kind: "info" | "error";
  text: string;
}

async function requestParse(text: string, mode: "auto" | "llm"): Promise<ParseResponse> {
  const res = await fetch("/api/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, mode }) });
  const body: unknown = res.headers.get("content-type")?.startsWith("application/json") === true ? await res.json() : null;
  if (res.ok) return body as ParseResponse;
  const message = typeof body === "object" && body !== null && "message" in body ? String(body.message) : `${String(res.status)} ${res.statusText}`;
  throw new Error(`The paste could not be sorted (${message}).`);
}

/** One box for the whole LeetCode page; the server splits it and `onSorted` fills the form. */
export function PasteBox({ onSorted, disabled }: { onSorted: (problem: Problem) => void; disabled: boolean }): ReactElement {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [llmAvailable, setLlmAvailable] = useState(true);
  const [note, setNote] = useState<Note | null>(null);

  const sort = async (mode: "auto" | "llm"): Promise<void> => {
    setBusy(true);
    setNote(null);
    try {
      const result = await requestParse(text, mode);
      setLlmAvailable(result.llmAvailable);
      onSorted(result.problem);
      const by = result.source === "llm" ? "Sorted by the model." : "Sorted by the parser.";
      setNote({ kind: result.warnings.length > 0 ? "error" : "info", text: [by, ...result.warnings].join(" ") });
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
        label="Paste the whole page"
        name="paste"
        hint="On LeetCode, open Topics and every Hint first. Then select all, copy, and paste it here."
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
