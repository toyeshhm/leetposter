"use client";
import { useId, useState, type ReactElement } from "react";
import { FreezeBell } from "@/components/art";
import { Button, Field, TextareaField } from "@/components/ui";
import { REPORT_CATEGORIES } from "@/game/types";
import type { ReportCategory, Seat } from "@/game/types";
import type { BoardProps } from "./BuildingPhase";
import type { JudgeVerdict } from "./Judge";
import { JudgeAction } from "./JudgePanel";
import { CATEGORY_WORDS, norm } from "./copy";
import { freezeReason } from "./select";

/** What one held seat may play right now. */
export function SeatAction({ seat, ...props }: Omit<BoardProps, "clockOffset"> & { seat: Seat }): ReactElement {
  switch (seat) {
    case "tagger":
      return <TagsForm {...props} />;
    case "oracle":
      return <HintAction {...props} />;
    case "bounds":
      return <BoundForm {...props} />;
    case "runner":
      return <SubmitPanel {...props} />;
  }
}

function TagsForm({ view, act, busy }: Omit<BoardProps, "clockOffset">): ReactElement {
  const count = view.problem?.tagCount ?? 0;
  const [tags, setTags] = useState<string[]>(() => Array.from({ length: count }, () => ""));
  if (count === 0) return <p className="action action-done">This problem carries no tags to declare.</p>;
  if (view.cards.some((c) => c.playerId === view.me.id && c.card.kind === "tags")) {
    return <p className="action action-done">Your tags are on the record.</p>;
  }
  const ready = tags.every((t) => t.trim() !== "");
  return (
    <form
      className="action"
      onSubmit={(e) => {
        e.preventDefault();
        void act({ type: "declareTags", tags: tags.map((t) => t.trim()) });
      }}
    >
      <p className="action-lead">Declare exactly {count} tags. One card, no second chance.</p>
      <div className="action-inputs">
        {tags.map((tag, i) => (
          <Field
            key={i}
            label={`Tag ${String(i + 1)}`}
            value={tag}
            autoComplete="off"
            disabled={view.me.ejected}
            onChange={(e) => {
              setTags(tags.map((t, j) => (j === i ? e.target.value : t)));
            }}
          />
        ))}
      </div>
      <Button type="submit" variant="primary" loading={busy} disabled={!ready || view.me.ejected}>
        Declare tags
      </Button>
    </form>
  );
}

function HintAction({ view, act, busy }: Omit<BoardProps, "clockOffset">): ReactElement {
  const total = view.problem?.hintCount ?? 0;
  const next = view.cards.filter((c) => c.playerId === view.me.id && c.card.kind === "hint").length;
  if (total === 0) return <p className="action action-done">This problem carries no hints.</p>;
  if (next >= total) return <p className="action action-done">Every hint is on the record.</p>;
  // Keyed on `next` so each card starts from its own true hint.
  return <HintForm key={next} index={next} total={total} truth={view.panel.hints?.[next] ?? ""} act={act} busy={busy} disabled={view.me.ejected} />;
}

interface HintFormProps extends Pick<BoardProps, "act" | "busy"> {
  index: number;
  total: number;
  truth: string;
  disabled: boolean;
}

/** One hint card. Prefilled with the true hint for honest play; whatever is sent is the record. */
function HintForm({ index, total, truth, act, busy, disabled }: HintFormProps): ReactElement {
  const [text, setText] = useState(truth);
  const n = String(index + 1);
  const edited = norm(text) !== norm(truth);
  return (
    <form
      className="action"
      onSubmit={(e) => {
        e.preventDefault();
        void act({ type: "revealHint", index, text: text.trim() });
      }}
    >
      <p className="action-lead">
        {index} of {total} revealed. Hints go out in order.
      </p>
      <TextareaField
        label={`Hint ${n}`}
        hint="Filled in as the hint reads. What you send is on the record, and is held against the truth at the Unmasking."
        value={text}
        rows={3}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
        }}
      />
      <Button type="submit" variant="primary" loading={busy} disabled={text.trim() === "" || disabled}>
        {edited ? `Reveal hint ${n}` : `Reveal hint ${n} as written`}
      </Button>
    </form>
  );
}

function BoundForm({ view, act, busy }: Omit<BoardProps, "clockOffset">): ReactElement {
  const [text, setText] = useState("");
  const declare = async (): Promise<void> => {
    if (await act({ type: "declareBound", text: text.trim() })) setText("");
  };
  return (
    <form
      className="action"
      onSubmit={(e) => {
        e.preventDefault();
        void declare();
      }}
    >
      <Field
        label="Declare a bound"
        hint="As many cards as the crew needs. Each one is on the record."
        placeholder="1 <= n <= 10^5"
        value={text}
        autoComplete="off"
        disabled={view.me.ejected}
        onChange={(e) => {
          setText(e.target.value);
        }}
      />
      <Button type="submit" variant="primary" loading={busy} disabled={text.trim() === "" || view.me.ejected}>
        Declare bound
      </Button>
    </form>
  );
}

function SubmitPanel({ view, act, busy }: Omit<BoardProps, "clockOffset">): ReactElement {
  const selectId = useId();
  const [confirming, setConfirming] = useState(false);
  const [category, setCategory] = useState<ReportCategory>("wrong-answer");
  const [failingCase, setFailingCase] = useState("");
  const bankId = view.problem?.bankId ?? null;
  if (!view.canSubmit) {
    return <p className="action action-done">{view.submissionsLeft === 0 ? "No submissions left." : "The judge is closed to you right now."}</p>;
  }
  const reject = async (): Promise<void> => {
    if (await act({ type: "submit", verdict: "rejected", category, failingCase: failingCase.trim() })) setFailingCase("");
  };
  const judged = (verdict: JudgeVerdict): void => {
    if (verdict.verdict === "rejected") {
      setCategory(verdict.category);
      setFailingCase(verdict.failingCase);
    }
  };
  return (
    <div className="action">
      <p className="action-lead">
        {view.submissionsLeft} of {view.settings.maxSubmissions} submissions left.{" "}
        {bankId === null ? "Record the verdict exactly as the judge gave it." : "The Judge in the Hall runs the file against every test and records what it finds."}
      </p>
      {bankId !== null ? (
        <JudgeAction bankId={bankId} code={view.code} act={act} busy={busy} onJudged={judged} />
      ) : confirming ? (
        <div className="action-confirm">
          <p>The judge accepted it? This ends the round.</p>
          <div className="action-row">
            <Button
              variant="primary"
              loading={busy}
              onClick={() => {
                void act({ type: "submit", verdict: "accepted" });
              }}
            >
              Yes, accepted
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirming(false);
              }}
            >
              Not yet
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => {
            setConfirming(true);
          }}
        >
          Accepted
        </Button>
      )}
      <form
        className="action-reject"
        onSubmit={(e) => {
          e.preventDefault();
          void reject();
        }}
      >
        <div className="field">
          <label className="field-label" htmlFor={selectId}>
            Rejected as
          </label>
          <select
            id={selectId}
            className="field-control"
            value={category}
            onChange={(e) => {
              const picked = REPORT_CATEGORIES.find((c) => c === e.target.value);
              if (picked !== undefined) setCategory(picked);
            }}
          >
            {REPORT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_WORDS[c]}
              </option>
            ))}
          </select>
        </div>
        <TextareaField
          label="Failing case"
          hint="The smallest input that broke, as the judge showed it."
          value={failingCase}
          rows={3}
          onChange={(e) => {
            setFailingCase(e.target.value);
          }}
        />
        <Button type="submit" variant="danger" loading={busy} disabled={failingCase.trim() === ""}>
          Record rejection
        </Button>
      </form>
    </div>
  );
}

/** Anyone may ring the bell once, inside the window. The reason it is closed sits next to it. */
export function FreezeButton({ view, act, busy }: Omit<BoardProps, "clockOffset">): ReactElement {
  const reason = freezeReason(view);
  return (
    <div className="freeze">
      <FreezeBell size={40} decorative />
      <div>
        <Button
          variant="secondary"
          loading={busy}
          disabled={!view.canCallFreeze}
          onClick={() => {
            void act({ type: "callFreeze" });
          }}
        >
          Call a tribunal
        </Button>
        <p className="freeze-note">{reason ?? "Locks the editor. Ninety seconds to talk, fifteen to vote."}</p>
      </div>
    </div>
  );
}
