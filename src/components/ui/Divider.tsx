import type { ReactElement, ReactNode } from "react";
import { RuleOrnament } from "@/components/art/Ornament";
import { cx } from "./cx";
import "./ui.css";

export interface DividerProps {
  /** Optional caption, set in the display face. */
  children?: ReactNode;
  className?: string;
}

/** Two rules meeting at the lozenge. */
export function Divider({ children, className }: DividerProps): ReactElement {
  return (
    <div role="separator" className={cx("divider", className)}>
      {children === undefined ? null : <span className="divider-label">{children}</span>}
      <RuleOrnament size={120} />
    </div>
  );
}
