import type { ReactElement, ReactNode } from "react";
import { CORNERS, FrameCorner } from "@/components/art/Ornament";
import { cx } from "./cx";
import "./ui.css";

export interface FrameProps {
  /** Caption set into the top rule. */
  title?: string;
  className?: string;
  children: ReactNode;
}

/** A bordered panel with nailed corners. One level only: a Frame inside a Frame renders as a plain block. */
export function Frame({ title, className, children }: FrameProps): ReactElement {
  const corners = CORNERS.map((corner) => (
    <span key={corner} className={`frame-corner frame-corner-${corner}`}>
      <FrameCorner corner={corner} />
    </span>
  ));
  if (title === undefined) {
    return (
      <section className={cx("frame", className)}>
        {corners}
        {children}
      </section>
    );
  }
  return (
    <fieldset className={cx("frame", className)}>
      <legend className="frame-title">{title}</legend>
      {corners}
      {children}
    </fieldset>
  );
}
