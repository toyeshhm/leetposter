import { readBody, respond } from "@/server/handlers";
import { log } from "@/server/log";
import { lookupLeetCode, type LeetCodeLookup } from "@/server/lookup/leetcode";
import { groqKey, parseWithGroq } from "@/server/parse/groq";
import { assess, fillEmpty, isQuery, parseLeetCodePaste } from "@/server/parse/leetcode";
import { parseBody } from "@/server/parse/schema";
import type { ParsedProblem, ParseResponse } from "@/server/parse/types";
import type { Problem } from "@/game/types";

const NOT_ANSWERED = "LeetCode did not answer; used the pasted text.";

/** LeetCode's copy of the pasted problem, or null (logged) when it is blocked, unreachable or does not know the title. */
async function tryLookup(title: string): Promise<LeetCodeLookup | null> {
  try {
    return await lookupLeetCode(title);
  } catch (error: unknown) {
    log.error("parse.lookup_failed", { title, error });
    return null;
  }
}

/**
 * POST {text, mode?: "auto" | "llm"} -> ParseResponse. `text` is a whole-page paste or just a title / number / link.
 * A paste is checked against LeetCode (its fields win, the parser fills the gaps); when LeetCode does not answer, the
 * parser stands alone, then the model when the parse is thin. No token is needed.
 * ponytail: no rate limit; each call is two public reads and, for "llm", a fraction of a cent. Add one if the key ever leaks into a public deploy.
 */
export function POST(req: Request): Promise<Response> {
  return respond(async (): Promise<ParseResponse> => {
    const { text, mode = "auto" } = await readBody(req, parseBody);
    const llmAvailable = groqKey() !== null;
    const finish = (problem: Problem, source: ParsedProblem["source"], notes: string[]): ParseResponse => {
      const { confidence, warnings } = assess(problem);
      return { problem, confidence, warnings: [...notes, ...warnings], source, llmAvailable };
    };
    if (mode === "llm") return { ...(await parseWithGroq(text)), llmAvailable };
    if (isQuery(text.trim())) return { ...(await lookupLeetCode(text)), llmAvailable };
    const parsed = parseLeetCodePaste(text);
    const title = parsed.problem.title;
    const lookedUp = title === "" ? null : await tryLookup(title);
    if (lookedUp !== null) return { ...finish(fillEmpty(parsed.problem, lookedUp.problem), "leetcode", []), number: lookedUp.number };
    const notes = title === "" ? [] : [NOT_ANSWERED];
    if (parsed.confidence === "high" || !llmAvailable) return finish(parsed.problem, "parser", notes);
    return finish(fillEmpty(parsed.problem, (await parseWithGroq(text)).problem), "llm", notes);
  });
}
