import type { ReactElement, ReactNode } from "react";
import { SEAT_TITLES, SeatSigil } from "@/components/art/Sigils";
import type { Seat } from "@/game/types";
import { cx } from "./cx";
import "./ui.css";

export interface BadgeProps {
  seat: Seat;
  /** Extra text after the seat name, e.g. "you" or "ejected". */
  children?: ReactNode;
  className?: string;
}

/** Seat badge: sigil plus the in-world seat name in small caps. */
export function Badge({ seat, children, className }: BadgeProps): ReactElement {
  return (
    <span className={cx("badge", className)}>
      <SeatSigil seat={seat} size={20} decorative />
      {SEAT_TITLES[seat]}
      {children === undefined ? null : <span className="badge-note">{children}</span>}
    </span>
  );
}
