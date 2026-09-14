import { readBody, respond } from "@/server/handlers";
import { groqKey, parseWithGroq } from "@/server/parse/groq";
import { assess, fillEmpty, parseLeetCodePaste } from "@/server/parse/leetcode";
import { parseBody } from "@/server/parse/schema";
import type { ParseResponse } from "@/server/parse/types";

/**
 * POST {text, mode?: "auto" | "llm"} -> ParseResponse. A pure text transform, so no token is needed.
 * ponytail: no rate limit; each "llm" call costs a fraction of a cent. Add one if the key ever leaks into a public deploy.
 */
export function POST(req: Request): Promise<Response> {
  return respond(async (): Promise<ParseResponse> => {
    const { text, mode = "auto" } = await readBody(req, parseBody);
    const llmAvailable = groqKey() !== null;
    if (mode === "llm") return { ...(await parseWithGroq(text)), llmAvailable };
    const parsed = parseLeetCodePaste(text);
    if (parsed.confidence === "high" || !llmAvailable) return { ...parsed, llmAvailable };
    // Low confidence: let the model try, but keep any field the parser already found when the model comes back empty.
    const problem = fillEmpty(parsed.problem, (await parseWithGroq(text)).problem);
    return { problem, ...assess(problem), source: "llm", llmAvailable };
  });
}
