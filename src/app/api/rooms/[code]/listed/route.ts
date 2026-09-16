import { z } from "zod";
import { GameError } from "@/game/errors";
import { readBody, respond } from "@/server/handlers";
import { isListed, loadRoom, setListed } from "@/server/store";
import { parse, roomCode, token } from "@/server/validate";

const listedBody = z.object({ token, listed: z.boolean() });

/** GET -> {listed}. Public: a listed hall is on the board for anyone anyway. */
export function GET(_req: Request, ctx: { params: Promise<{ code: string }> }): Promise<Response> {
  return respond(async () => ({ listed: await isListed(parse(roomCode, (await ctx.params).code)) }));
}

/** POST {token, listed} -> {listed}. The host only, in the lobby or during the Work. */
export function POST(req: Request, ctx: { params: Promise<{ code: string }> }): Promise<Response> {
  return respond(async () => {
    const code = parse(roomCode, (await ctx.params).code);
    const body = await readBody(req, listedBody);
    const row = await loadRoom(code);
    if (row === null) throw new GameError("not-found", `No hall called ${code}.`);
    const actor = row.state.players.find((p) => p.token === body.token);
    if (actor === undefined) throw new GameError("unauthorized", "This seat is no longer yours.");
    if (actor.id !== row.state.hostId) throw new GameError("not-host", "Only the host lists the hall.");
    if (row.state.phase !== "lobby" && row.state.phase !== "building") throw new GameError("wrong-phase", "The board is set in the lobby or during the Work.");
    await setListed(code, body.listed);
    return { listed: body.listed };
  });
}
