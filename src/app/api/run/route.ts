import { z } from "zod";
import { readBody, respond } from "@/server/handlers";
import { runOnJudge } from "@/server/judge/judge0";
import { JUDGED } from "@/server/judge/languages";

/** A run at the full ten seconds, plus compiling and queueing, outlasts a function's default clock on some plans; the poll loop itself gives up at about 40 s. */
export const maxDuration = 60;

/** The largest hidden test in the bank is 400 KB of input; a megabyte leaves room and still fits a function's request. */
const runBody = z.object({ language: z.enum(JUDGED), code: z.string().min(1).max(100_000), stdin: z.string().max(1_000_000) });

/**
 * POST {language, code, stdin} -> RunOutcome. Java, C++, Go and Rust compile and run on the judge;
 * Python and JavaScript never come here, they run in the player's own browser.
 * ponytail: no token and no rate limit, like /api/parse. The judge throttles per IP and this server is few IPs; ask for a hall seat here if strangers start using it as a free compiler.
 */
export function POST(req: Request): Promise<Response> {
  return respond(async () => {
    const { language, code, stdin } = await readBody(req, runBody);
    return runOnJudge(language, code, stdin);
  });
}
