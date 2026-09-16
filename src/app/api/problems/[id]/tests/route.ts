import { respond } from "@/server/handlers";
import { problemId, problemTests } from "@/server/problems";
import { parse } from "@/server/validate";

/**
 * GET ?code=ABCDE with `Authorization: Bearer <player token>` -> {samples, tests}. The Judge in the
 * Hall runs these in the Herald's browser, so only the Herald of a hall playing this problem may
 * read them; everyone else gets 401. The token never travels in the URL.
 */
export function GET(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const url = new URL(req.url);
  const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  return respond(async () => problemTests(parse(problemId, (await ctx.params).id), url.searchParams.get("code") ?? "", bearer));
}
