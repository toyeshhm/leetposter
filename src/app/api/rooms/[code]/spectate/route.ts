import { GameError } from "@/game/errors";
import { spectate } from "@/game/spectate";
import { respond } from "@/server/handlers";
import { loadRoom } from "@/server/store";
import { parse, roomCode } from "@/server/validate";

/** GET -> SpectatorView. No token: anyone with the code may watch. The clock is not ticked; the players' polls do that. */
export function GET(_req: Request, ctx: { params: Promise<{ code: string }> }): Promise<Response> {
  return respond(async () => {
    const code = parse(roomCode, (await ctx.params).code);
    const row = await loadRoom(code);
    if (row === null) throw new GameError("not-found", `No hall called ${code}.`);
    return spectate(row.state, Date.now());
  });
}
