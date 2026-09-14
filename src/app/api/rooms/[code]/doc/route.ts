import { z } from "zod";
import { GameError } from "@/game/errors";
import { actHandler, readBody, respond } from "@/server/handlers";
import { loadDoc, saveDoc } from "@/server/store";
import { parse, roomCode, token } from "@/server/validate";

/** A full Yjs state as base64, capped at 2 MB of text. */
const docBody = z.object({ doc: z.string().max(2 * 1024 * 1024).regex(/^[A-Za-z0-9+/]*={0,2}$/, "base64") });

const bearer = (req: Request): string => parse(token, req.headers.get("authorization")?.replace(/^Bearer /, ""));

/** GET with `Authorization: Bearer <token>` -> {doc}. Any player of the hall may read, cast out or not. */
export function GET(req: Request, ctx: { params: Promise<{ code: string }> }): Promise<Response> {
  return respond(async () => {
    const code = parse(roomCode, (await ctx.params).code);
    await actHandler(code, bearer(req), { type: "tick" });
    return { doc: await loadDoc(code) };
  });
}

/** POST {doc} with the bearer token. Refused while the editor is locked (freeze, final vote, reveal). */
export function POST(req: Request, ctx: { params: Promise<{ code: string }> }): Promise<Response> {
  return respond(async () => {
    const code = parse(roomCode, (await ctx.params).code);
    const tok = bearer(req);
    const body = await readBody(req, docBody);
    const { phase } = await actHandler(code, tok, { type: "tick" });
    if (phase === "freeze" || phase === "finalVote" || phase === "reveal") throw new GameError("wrong-phase", "The editor is locked.");
    await saveDoc(code, body.doc);
    return { ok: true };
  });
}
