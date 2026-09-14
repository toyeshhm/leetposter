import { optionalUser } from "@/server/auth";
import { displayName, joinHandler, readBody, respond } from "@/server/handlers";
import { nameBody, parse, roomCode } from "@/server/validate";

/** POST {name?} (optional bearer: the account's access token) -> {code, playerId, token} */
export function POST(req: Request, ctx: { params: Promise<{ code: string }> }): Promise<Response> {
  return respond(async () => {
    const code = parse(roomCode, (await ctx.params).code);
    const account = await optionalUser(req);
    const body = await readBody(req, nameBody);
    return joinHandler(code, displayName(body.name, account), account);
  });
}
