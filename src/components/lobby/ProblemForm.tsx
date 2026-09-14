"use client";
import { useState, type ChangeEvent, type SyntheticEvent, type ReactElement } from "react";
import { errorMessage } from "@/client/api";
import { Button, Field, Frame, Notice, TextareaField } from "@/components/ui";
import type { Action, PlayerView, Problem } from "@/game/types";
import { PasteBox } from "./PasteBox";
import { errorProp } from "./util";
import "./lobby.css";

interface Draft {
  title: string;
  url: string;
  statement: string;
  tags: string;
  hints: string;
  constraints: string;
}

const lines = (s: string): string[] =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => x !== "");

function parse(draft: Draft): { problem: Problem | null; errors: Partial<Record<keyof Draft, string>> } {
  const errors: Partial<Record<keyof Draft, string>> = {};
  const title = draft.title.trim();
  const url = draft.url.trim();
  const statement = draft.statement.trim();
  const constraints = draft.constraints.trim();
  const tags = draft.tags
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t !== "");
  const hints = lines(draft.hints);
  if (title === "") errors.title = "The Herald needs a title.";
  if (!URL.canParse(url)) errors.url = "The Herald needs a link that opens.";
  if (statement === "") errors.statement = "Everyone reads the statement. Paste it.";
  if (tags.length === 0) errors.tags = "The Cartographer needs at least one tag.";
  if (hints.length === 0) errors.hints = "The Oracle needs at least one hint.";
  if (constraints === "") errors.constraints = "The Warden needs the constraints.";
  if (Object.keys(errors).length > 0) return { problem: null, errors };
  return { problem: { title, url, statement, tags, hints, constraints }, errors };
}

interface Note {
  kind: "info" | "error";
  text: string;
}

const toDraft = (p: Problem): Draft => ({ ...p, tags: p.tags.join(", "), hints: p.hints.join("\n") });

/** The host pastes the problem. The statement (examples included) is public; the rest become seat panels. */
export function ProblemForm({
  send,
  busy,
  problem,
}: {
  send: (action: Action) => Promise<void>;
  busy: boolean;
  problem: PlayerView["problem"];
}): ReactElement {
  const [draft, setDraft] = useState<Draft>(() => ({
    title: "",
    url: "",
    statement: problem?.statement ?? "",
    tags: "",
    hints: "",
    constraints: "",
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [note, setNote] = useState<Note | null>(null);

  const edit =
    (key: keyof Draft) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      const value = e.target.value;
      setDraft((d) => ({ ...d, [key]: value }));
    };

  const fill = (p: Problem): void => {
    setDraft(toDraft(p));
    setErrors({});
    setNote(null);
  };

  const submit = async (): Promise<void> => {
    const parsed = parse(draft);
    setErrors(parsed.errors);
    setNote(null);
    if (parsed.problem === null) return;
    try {
      await send({ type: "setProblem", problem: parsed.problem });
      setNote({ kind: "info", text: "The problem is set. Panels are dealt when the reading begins." });
    } catch (e: unknown) {
      setNote({ kind: "error", text: errorMessage(e) });
    }
  };

  const onSubmit = (e: SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    void submit();
  };

  return (
    <Frame title="The problem">
      <form className="lobby-form" onSubmit={onSubmit} noValidate>
        <PasteBox onSorted={fill} disabled={busy} />
        <p className="muted prose">Or fill the parts yourself. Only the Herald sees the title and link; only the seats see their panels.</p>
        <div className="lobby-pair">
          <Field label="Title" name="title" value={draft.title} onChange={edit("title")} disabled={busy} {...errorProp(errors.title)} />
          <Field
            label="Link"
            name="url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={draft.url}
            onChange={edit("url")}
            disabled={busy}
            {...errorProp(errors.url)}
          />
        </div>
        <TextareaField
          label="Statement"
          name="statement"
          hint="Public. Everyone reads it, examples included."
          rows={12}
          value={draft.statement}
          onChange={edit("statement")}
          disabled={busy}
          {...errorProp(errors.statement)}
        />
        <Field
          label="Tags"
          name="tags"
          hint="Comma separated. The Cartographer's panel."
          autoComplete="off"
          value={draft.tags}
          onChange={edit("tags")}
          disabled={busy}
          {...errorProp(errors.tags)}
        />
        <TextareaField
          label="Hints"
          name="hints"
          hint="One per line, in order. The Oracle's panel."
          rows={4}
          value={draft.hints}
          onChange={edit("hints")}
          disabled={busy}
          {...errorProp(errors.hints)}
        />
        <TextareaField
          label="Constraints"
          name="constraints"
          hint="Input sizes, value ranges, limits. The Warden's panel."
          rows={4}
          value={draft.constraints}
          onChange={edit("constraints")}
          disabled={busy}
          {...errorProp(errors.constraints)}
        />
        <div className="lobby-actions">
          <Button type="submit" variant="secondary" loading={busy}>
            {problem === null ? "Set the problem" : "Replace the problem"}
          </Button>
        </div>
        {note === null ? null : <Notice kind={note.kind}>{note.text}</Notice>}
      </form>
    </Frame>
  );
}
