import { actHandler, readBody, respond } from "@/server/handlers";
import { actBody, parse, roomCode } from "@/server/validate";

/** POST {token, action} -> PlayerView */
export function POST(req: Request, ctx: { params: Promise<{ code: string }> }): Promise<Response> {
  return respond(async () => {
    const code = parse(roomCode, (await ctx.params).code);
    const body = await readBody(req, actBody);
    return actHandler(code, body.token, body.action);
  });
}
