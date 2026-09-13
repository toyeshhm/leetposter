import { joinHandler, readBody, respond } from "@/server/handlers";
import { nameBody, parse, roomCode } from "@/server/validate";

/** POST {name} -> {code, playerId, token} */
export function POST(req: Request, ctx: { params: Promise<{ code: string }> }): Promise<Response> {
  return respond(async () => joinHandler(parse(roomCode, (await ctx.params).code), (await readBody(req, nameBody)).name));
}
