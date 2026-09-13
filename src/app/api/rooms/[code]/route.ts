import { actHandler, respond } from "@/server/handlers";
import { parse, roomCode, token } from "@/server/validate";

/** GET with `Authorization: Bearer <token>` -> PlayerView (ticks the clock first). The token never travels in the URL. */
export function GET(req: Request, ctx: { params: Promise<{ code: string }> }): Promise<Response> {
  return respond(async () =>
    actHandler(parse(roomCode, (await ctx.params).code), parse(token, req.headers.get("authorization")?.replace(/^Bearer /, "")), { type: "tick" }),
  );
}
