"use client";
import { useState, type SyntheticEvent, type ReactElement } from "react";
import { errorMessage } from "@/client/api";
import { Button, Field, Frame, Notice } from "@/components/ui";
import type { Action, Settings } from "@/game/types";
import { errorProp } from "./util";
import "./lobby.css";

const MINUTE = 60_000;

interface Draft {
  read: string;
  build: string;
  submissions: string;
}

interface Note {
  kind: "info" | "error";
  text: string;
}

/** Ranges mirror the reducer's mergeSettings so the host hears about it before the round trip. */
function parse(draft: Draft): { settings: Pick<Settings, "readMs" | "buildMs" | "maxSubmissions"> | null; errors: Partial<Record<keyof Draft, string>> } {
  const errors: Partial<Record<keyof Draft, string>> = {};
  const read = Number(draft.read);
  const build = Number(draft.build);
  const submissions = Number(draft.submissions);
  if (draft.read.trim() === "" || !(read >= 0 && read <= 30)) errors.read = "Reading runs 0 to 30 minutes.";
  if (draft.build.trim() === "" || !(build >= 5 && build <= 120)) errors.build = "Building runs 5 to 120 minutes.";
  if (!Number.isInteger(submissions) || submissions < 1 || submissions > 10) errors.submissions = "Between 1 and 10 submissions.";
  if (Object.keys(errors).length > 0) return { settings: null, errors };
  return { settings: { readMs: Math.round(read * MINUTE), buildMs: Math.round(build * MINUTE), maxSubmissions: submissions }, errors };
}

/** Read time, build time and the submission cap. Everything else stays at the defaults. */
export function SettingsForm({
  send,
  busy,
  settings,
}: {
  send: (action: Action) => Promise<void>;
  busy: boolean;
  settings: Settings;
}): ReactElement {
  const [draft, setDraft] = useState<Draft>(() => ({
    read: String(settings.readMs / MINUTE),
    build: String(settings.buildMs / MINUTE),
    submissions: String(settings.maxSubmissions),
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [note, setNote] = useState<Note | null>(null);

  const submit = async (): Promise<void> => {
    const parsed = parse(draft);
    setErrors(parsed.errors);
    setNote(null);
    if (parsed.settings === null) return;
    try {
      await send({ type: "setSettings", settings: parsed.settings });
      setNote({ kind: "info", text: "Settings kept." });
    } catch (e: unknown) {
      setNote({ kind: "error", text: errorMessage(e) });
    }
  };

  const onSubmit = (e: SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    void submit();
  };

  return (
    <Frame title="The clock">
      <form className="lobby-form" onSubmit={onSubmit} noValidate>
        <div className="lobby-settings">
          <Field
            label="Reading, minutes"
            name="read"
            type="number"
            inputMode="numeric"
            min={0}
            max={30}
            value={draft.read}
            onChange={(e) => {
              setDraft((d) => ({ ...d, read: e.target.value }));
            }}
            disabled={busy}
            {...errorProp(errors.read)}
          />
          <Field
            label="Building, minutes"
            name="build"
            type="number"
            inputMode="numeric"
            min={5}
            max={120}
            value={draft.build}
            onChange={(e) => {
              setDraft((d) => ({ ...d, build: e.target.value }));
            }}
            disabled={busy}
            {...errorProp(errors.build)}
          />
          <Field
            label="Submissions"
            name="submissions"
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            step={1}
            value={draft.submissions}
            onChange={(e) => {
              setDraft((d) => ({ ...d, submissions: e.target.value }));
            }}
            disabled={busy}
            {...errorProp(errors.submissions)}
          />
        </div>
        <div className="lobby-actions">
          <Button type="submit" variant="secondary" loading={busy}>
            Keep settings
          </Button>
        </div>
        {note === null ? null : <Notice kind={note.kind}>{note.text}</Notice>}
      </form>
    </Frame>
  );
}
