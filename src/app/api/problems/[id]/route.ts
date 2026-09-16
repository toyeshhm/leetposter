import { respond } from "@/server/handlers";
import { problemDetail, problemId } from "@/server/problems";
import { parse } from "@/server/validate";

/** GET -> the problem as the crew reads it. Never the samples, the tests, the solution or the brute. */
export function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  return respond(async () => problemDetail(parse(problemId, (await ctx.params).id)));
}
