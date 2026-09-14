import type { Problem } from "@/game/types";

/** What a paste turns into. `confidence` is "low" when the title, statement or constraints are missing. */
export interface ParsedProblem {
  problem: Problem;
  confidence: "high" | "low";
  warnings: string[];
  source: "parser" | "llm";
}

/** POST /api/parse answer: the parse plus whether "Sort with the model" is on offer. */
export interface ParseResponse extends ParsedProblem {
  llmAvailable: boolean;
}
