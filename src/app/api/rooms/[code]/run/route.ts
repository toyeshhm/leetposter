import { z } from "zod";
import { actHandler, bearer, readBody, respond } from "@/server/handlers";
import { runOnJudge } from "@/server/judge/judge0";
import { JUDGED } from "@/server/judge/languages";
import { parse, roomCode } from "@/server/validate";

/** A run at the full ten seconds, plus compiling and queueing, outlasts a function's default clock on some plans; the poll loop itself gives up at about 40 s. */
export const maxDuration = 60;

/** The largest hidden test in the bank is 400 KB of input; a megabyte leaves room and still fits a function's request. */
const runBody = z.object({ language: z.enum(JUDGED), code: z.string().min(1).max(100_000), stdin: z.string().max(1_000_000) });

/**
 * POST {language, code, stdin} with `Authorization: Bearer <token>` -> RunOutcome. Java, C++, Go and
 * Rust compile and run on the judge; Python and JavaScript never come here, they run in the browser.
 * Only a seat in the hall may run, so the hall is not an open relay to a judge that throttles by IP.
 * ponytail: any seat in any hall, and a hall costs one POST; add a per-hall count here if one hall ever runs the judge dry.
 */
export function POST(req: Request, ctx: { params: Promise<{ code: string }> }): Promise<Response> {
  return respond(async () => {
    await actHandler(parse(roomCode, (await ctx.params).code), bearer(req), { type: "tick" });
    const { language, code, stdin } = await readBody(req, runBody);
    return runOnJudge(language, code, stdin);
  });
}
