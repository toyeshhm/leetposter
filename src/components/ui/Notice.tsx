import type { ReactElement, ReactNode } from "react";
import { cx } from "./cx";
import "./ui.css";

export interface NoticeProps {
  kind?: "info" | "error";
  className?: string;
  children: ReactNode;
}

/** Inline notice. Errors are announced (role=alert); info is a polite status. */
export function Notice({ kind = "info", className, children }: NoticeProps): ReactElement {
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cx("notice", `notice-${kind}`, className)}>
      {children}
    </div>
  );
}
