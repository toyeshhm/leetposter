import type { Card, Outcome, Phase, Problem, ReportCategory, Seat } from "@/game/types";

/** Phase names in the game's voice. */
export const PHASE_NAMES: Record<Phase, string> = {
  lobby: "The Gathering",
  reading: "The Reading",
  building: "The Work",
  freeze: "Tribunal",
  finalVote: "The Reckoning",
  reveal: "Unmasking",
};

/** One line of duty per seat, for the player who holds it. */
export const SEAT_DUTIES: Record<Seat, string> = {
  tagger: "You hold the topic tags. Declare them once, exactly as many as there are, on the record.",
  oracle: "You hold the hints, in order. Reveal the next one when the crew asks for it.",
  bounds: "You hold the constraints. Declare a bound whenever the crew needs one.",
  runner: "You hold the title and the link. Only you carry a solution to the judge.",
};

export const CATEGORY_WORDS: Record<ReportCategory, string> = {
  "wrong-answer": "Wrong answer",
  "time-limit": "Time limit exceeded",
  "runtime-error": "Runtime error",
  "memory-limit": "Memory limit exceeded",
  "compile-error": "Compile error",
};

/** The outcome, stated plainly. */
export function outcomeWords(outcome: Outcome): { title: string; reason: string } {
  const title = outcome.winner === "crew" ? "The Crew win" : "The Changeling wins";
  switch (outcome.reason) {
    case "accepted":
      return { title, reason: "The judge accepted a submission." };
    case "imposter-ejected":
      return { title, reason: "The Changeling was cast out." };
    case "time":
      return { title, reason: "The candle burned out with nothing accepted, and the Reckoning cast out no one." };
    case "submissions":
      return { title, reason: "Every submission was rejected, and the Reckoning cast out no one." };
    case "final-vote":
      return { title, reason: "The Reckoning cast out a crewmate. The Changeling is still at the table." };
  }
}

/** "3 minutes" or "90 seconds", for the freeze window copy. */
export function duration(ms: number): string {
  if (ms % 60_000 === 0) {
    const m = ms / 60_000;
    return `${String(m)} ${m === 1 ? "minute" : "minutes"}`;
  }
  return `${String(Math.round(ms / 1000))} seconds`;
}

/** Wall-clock time of a card, in the viewer's locale. */
export function clockTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** Whitespace- and case-insensitive text for comparing a card against the truth. */
export function norm(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Whether a declared tag is one of the true tags. */
export function tagIsTrue(problem: Problem, tag: string): boolean {
  return problem.tags.some((t) => norm(t) === norm(tag));
}

/** Whether a hint card reads as the true hint at its index. */
export function hintAsWritten(problem: Problem, card: { index: number; text: string }): boolean {
  const truth = problem.hints[card.index];
  return truth !== undefined && norm(truth) === norm(card.text);
}

/** A card whose content differs from the truth. Bounds are free text and reports are the judge's word, so neither is ever altered. */
export function cardAltered(problem: Problem, card: Card): boolean {
  switch (card.kind) {
    case "tags":
      return card.tags.some((t) => !tagIsTrue(problem, t));
    case "hint":
      return !hintAsWritten(problem, card);
    case "bound":
    case "report":
      return false;
  }
}
