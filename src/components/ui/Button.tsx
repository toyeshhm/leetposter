import type { ButtonHTMLAttributes, ReactElement } from "react";
import { HourglassIcon } from "@/components/art/Icons";
import { cx } from "./cx";
import "./ui.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  /** Disables the button and turns the hourglass. */
  loading?: boolean;
}

export function Button({ variant = "secondary", loading = false, disabled, className, type = "button", children, ...rest }: ButtonProps): ReactElement {
  return (
    <button
      {...rest}
      type={type}
      className={cx("btn", `btn-${variant}`, className)}
      disabled={disabled === true || loading}
      aria-busy={loading ? true : undefined}
    >
      {loading ? (
        <span className="btn-glyph">
          <HourglassIcon size={18} decorative />
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
