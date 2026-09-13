"use client";
import type { ReactElement } from "react";
import { mmss, useServerNow } from "./clock";
import { cx } from "./cx";
import "./ui.css";

export interface TimerProps {
  /** Epoch ms on the server clock. */
  targetAt: number;
  /** Add to Date.now() to approximate the server clock (from useRoom). */
  clockOffset: number;
  className?: string;
}

/**
 * mm:ss until `targetAt`, tabular, amber under a minute. Renders a placeholder until hydrated.
 * Screen readers hear the last minute and the last ten seconds, nothing else.
 */
export function Timer({ targetAt, clockOffset, className }: TimerProps): ReactElement {
  const now = useServerNow(clockOffset);
  const seconds = now === null ? null : Math.max(0, Math.ceil((targetAt - now) / 1000));
  const call = seconds === 60 ? "One minute left." : seconds === 10 ? "Ten seconds left." : null;
  return (
    <>
      <span role="timer" className={cx("timer", seconds !== null && seconds < 60 && "timer-urgent", className)}>
        {seconds === null ? "--:--" : mmss(seconds * 1000)}
      </span>
      <span className="sr-only" aria-live="polite">
        {call}
      </span>
    </>
  );
}
