import { z } from "zod";
import type { Problem } from "@/game/types";

export const parseBody = z.object({
  text: z.string().min(1).max(200_000),
  mode: z.enum(["auto", "llm"]).exactOptional(),
});

/** The six fields the model is asked for. Empty strings/arrays mean "not in the text". */
export const modelProblem: z.ZodType<Problem> = z.object({
  title: z.string(),
  url: z.string(),
  statement: z.string(),
  tags: z.array(z.string()),
  hints: z.array(z.string()),
  constraints: z.string(),
  bankId: z.string().optional(),
  rating: z.number().int().optional(),
});

/** The part of Groq's chat-completion envelope we read. */
const choice = z.object({ message: z.object({ content: z.string() }) });
export const completion = z.object({ choices: z.tuple([choice]).rest(choice) });
