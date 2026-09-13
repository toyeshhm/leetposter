import { useId, type InputHTMLAttributes, type ReactElement, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cx } from "./cx";
import "./ui.css";

interface Chrome {
  label: string;
  hint?: string;
  /** Rendered below the control, announced, and sets aria-invalid. */
  error?: string;
}

type Managed = "id" | "aria-describedby" | "aria-invalid";

interface ControlProps {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
  className: string;
}

interface WrapProps {
  label: string;
  hint: string | undefined;
  error: string | undefined;
  className: string | undefined;
  children: (control: ControlProps) => ReactNode;
}

function Wrap({ label, hint, error, className, children }: WrapProps): ReactElement {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  // One line under the control: the error replaces the hint while it stands.
  const showHint = hint !== undefined && error === undefined;
  const described = [showHint ? hintId : "", error === undefined ? "" : errorId].filter((s) => s !== "").join(" ");
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children({
        id,
        "aria-describedby": described === "" ? undefined : described,
        "aria-invalid": error === undefined ? undefined : true,
        className: cx("field-control", className),
      })}
      {!showHint ? null : (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export type FieldProps = Chrome & Omit<InputHTMLAttributes<HTMLInputElement>, Managed>;

/** Label + native input + hint + error. Native attributes pass straight through. */
export function Field({ label, hint, error, className, ...input }: FieldProps): ReactElement {
  return (
    <Wrap {...{ label, hint, error, className }}>
      {(control) => <input {...input} {...control} />}
    </Wrap>
  );
}

export type TextareaFieldProps = Chrome & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, Managed>;

/** Label + native textarea + hint + error. */
export function TextareaField({ label, hint, error, className, ...textarea }: TextareaFieldProps): ReactElement {
  return (
    <Wrap {...{ label, hint, error, className }}>
      {(control) => <textarea {...textarea} {...control} />}
    </Wrap>
  );
}
